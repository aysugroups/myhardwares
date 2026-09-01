-- ============================================================
-- MY HARDWARES — Order & Payment RPCs (atomic, server-authoritative)
-- Run this FIFTH (after seed.sql). Called by Edge Functions.
-- ============================================================

-- Create a PENDING order with server-computed totals (never trusts client prices).
create or replace function create_pending_order(p_user_id uuid, p_items jsonb, p_address jsonb, p_coupon text)
returns json language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod products%rowtype; qty int;
  v_subtotal numeric := 0; v_discount numeric := 0; v_shipping numeric := 0; v_tax numeric := 0; v_total numeric := 0;
  v_order_id uuid; v_order_number text; s jsonb; cp json; free_thr numeric; ship_fee numeric; tax_pct numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  -- Validate + price each line from DB
  create temporary table tmp_lines (product_id uuid, product_name text, sku text, unit_price numeric, quantity int, line_total numeric, image_url text) on commit drop;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from products where id = (it->>'product_id')::uuid;
    if not found or prod.status <> 'published' then raise exception 'Product unavailable'; end if;
    qty := greatest(1, (it->>'quantity')::int);
    if prod.stock < qty then raise exception 'Insufficient stock for %', prod.name; end if;
    insert into tmp_lines values (
      prod.id, prod.name, prod.sku,
      coalesce(nullif(prod.sale_price,0), prod.price), qty,
      coalesce(nullif(prod.sale_price,0), prod.price) * qty,
      (select url from product_images where product_id = prod.id order by is_primary desc, sort_order asc limit 1)
    );
  end loop;
  select coalesce(sum(line_total),0) into v_subtotal from tmp_lines;

  -- Coupon (server-validated)
  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := validate_coupon(p_coupon, v_subtotal, p_user_id);
    if (cp->>'valid')::boolean then v_discount := (cp->>'discount')::numeric; end if;
  end if;

  -- Shipping & tax from settings
  select data into s from site_settings where id = 1;
  free_thr := coalesce((s->>'free_shipping_threshold')::numeric, 999);
  ship_fee := coalesce((s->>'shipping_fee')::numeric, 79);
  tax_pct  := coalesce((s->>'tax_percent')::numeric, 0);
  v_shipping := case when v_subtotal >= free_thr then 0 else ship_fee end;
  v_tax := round((v_subtotal - v_discount) * tax_pct / 100.0, 2);
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping + v_tax;

  insert into orders (user_id, address, subtotal, discount, coupon_code, shipping, tax, total, payment_status, status)
  values (p_user_id, p_address, v_subtotal, v_discount, nullif(p_coupon,''), v_shipping, v_tax, v_total, 'pending', 'pending_payment')
  returning id, order_number into v_order_id, v_order_number;

  insert into order_items (order_id, product_id, product_name, sku, unit_price, quantity, line_total, image_url)
  select v_order_id, product_id, product_name, sku, unit_price, quantity, line_total, image_url from tmp_lines;

  return json_build_object(
    'order_id', v_order_id, 'order_number', v_order_number,
    'amount', round(v_total * 100), -- paise
    'breakdown', json_build_object('subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'tax', v_tax, 'total', v_total)
  );
end $$;

-- Idempotently confirm a paid order: reduce inventory, record payment, clear cart, log status.
create or replace function confirm_order_paid(p_order_id uuid, p_rzp_order_id text, p_rzp_payment_id text)
returns json language plpgsql security definer set search_path = public as $$
declare ord orders%rowtype; li order_items%rowtype; new_stock int;
begin
  select * into ord from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if ord.payment_status = 'paid' then
    return json_build_object('success', true, 'order_number', ord.order_number, 'order_id', ord.id, 'already', true);
  end if;

  -- Reduce inventory atomically (guard against negative)
  for li in select * from order_items where order_id = p_order_id loop
    if li.product_id is not null then
      update products set stock = stock - li.quantity where id = li.product_id returning stock into new_stock;
      if new_stock < 0 then raise exception 'Out of stock during confirmation'; end if;
      insert into inventory_transactions (product_id, change, reason, note) values (li.product_id, -li.quantity, 'sale', ord.order_number);
    end if;
  end loop;

  update orders set payment_status='paid', status='confirmed',
    razorpay_order_id = coalesce(p_rzp_order_id, razorpay_order_id),
    razorpay_payment_id = p_rzp_payment_id
  where id = p_order_id;

  insert into payments (order_id, razorpay_order_id, razorpay_payment_id, amount, status)
  values (p_order_id, p_rzp_order_id, p_rzp_payment_id, ord.total, 'captured')
  on conflict (razorpay_payment_id) do nothing;

  insert into order_status_history (order_id, status, note) values (p_order_id, 'confirmed', 'Payment received');

  -- Coupon usage
  if ord.coupon_code is not null then
    update coupons set used_count = used_count + 1 where upper(code) = upper(ord.coupon_code);
    insert into coupon_usage (coupon_id, user_id, order_id)
      select id, ord.user_id, ord.id from coupons where upper(code) = upper(ord.coupon_code);
  end if;

  -- Clear user's cart
  if ord.user_id is not null then delete from cart_items where user_id = ord.user_id; end if;

  return json_build_object('success', true, 'order_number', ord.order_number, 'order_id', ord.id);
end $$;

create or replace function mark_order_failed(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set payment_status='failed', status='payment_failed'
  where id = p_order_id and payment_status <> 'paid';
end $$;
