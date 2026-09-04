-- ============================================================
-- MY HARDWARES — Order & Payment RPCs (atomic, server-authoritative)
-- Run this FIFTH (after seed.sql).
-- ============================================================

-- Create a PENDING order with server-computed totals (never trusts client prices).
create or replace function create_pending_order(p_user_id uuid, p_items jsonb, p_address jsonb, p_coupon text)
returns json language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  prod products%rowtype;
  qty int;
  unit_p numeric;
  line_tot numeric;
  img_url text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_order_number text;
  s jsonb;
  cp json;
  free_thr numeric;
  ship_fee numeric;
  tax_pct numeric;
begin
  -- Validate user authentication
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_address is null then
    raise exception 'Delivery address is required';
  end if;

  -- Create order record first to hold the items
  insert into orders (
    user_id, address, subtotal, discount, coupon_code, shipping, tax, total,
    payment_method, payment_confirmation_requested, payment_status, status
  ) values (
    p_user_id, p_address, 0, 0, nullif(trim(p_coupon), ''), 0, 0, 0,
    'upi_qr', false, 'pending', 'pending_payment'
  ) returning id, order_number into v_order_id, v_order_number;

  -- Validate each line item & insert authoritative order_items
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from products where id = (it->>'product_id')::uuid;
    if not found or prod.status <> 'published' then
      raise exception 'Product is unavailable';
    end if;

    qty := greatest(1, coalesce((it->>'quantity')::int, 1));
    if prod.stock < qty then
      raise exception 'Insufficient stock for %', prod.name;
    end if;

    -- Authoritative server pricing
    if prod.sale_price is not null and prod.sale_price > 0 and prod.sale_price < prod.price then
      unit_p := prod.sale_price;
    else
      unit_p := prod.price;
    end if;

    line_tot := unit_p * qty;
    v_subtotal := v_subtotal + line_tot;

    select url into img_url from product_images
    where product_id = prod.id
    order by is_primary desc, sort_order asc limit 1;

    insert into order_items (order_id, product_id, product_name, sku, unit_price, quantity, line_total, image_url)
    values (v_order_id, prod.id, prod.name, prod.sku, unit_p, qty, line_tot, img_url);
  end loop;

  -- Coupon validation (server-side)
  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := validate_coupon(trim(p_coupon), v_subtotal, p_user_id);
    if (cp->>'valid')::boolean then
      v_discount := (cp->>'discount')::numeric;
    end if;
  end if;

  -- Shipping & tax calculation from site settings
  select data into s from site_settings where id = 1;
  free_thr := coalesce((s->>'free_shipping_threshold')::numeric, 999);
  ship_fee := coalesce((s->>'shipping_fee')::numeric, 79);
  tax_pct  := coalesce((s->>'tax_percent')::numeric, 0);

  v_shipping := case when v_subtotal >= free_thr then 0 else ship_fee end;
  v_tax := round((greatest(0, v_subtotal - v_discount)) * tax_pct / 100.0, 2);
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping + v_tax;

  -- Update order with authoritative totals
  update orders set
    subtotal = v_subtotal,
    discount = v_discount,
    shipping = v_shipping,
    tax = v_tax,
    total = v_total
  where id = v_order_id;

  -- Record initial status history
  insert into order_status_history (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Order created with pending payment');

  -- Clear user's active cart in database
  if p_user_id is not null then
    delete from cart_items where user_id = p_user_id;
  end if;

  return json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'amount', round(v_total * 100), -- paise for gateway compatibility
    'breakdown', json_build_object(
      'subtotal', v_subtotal,
      'discount', v_discount,
      'shipping', v_shipping,
      'tax', v_tax,
      'total', v_total
    )
  );
end $$;

-- Customer action: Record "I Have Paid" notice without marking order as paid.
create or replace function request_payment_confirmation(p_order_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
begin
  select * into ord from orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Validate caller permission: customer who owns the order or admin
  if auth.uid() is not null and ord.user_id is not null and auth.uid() <> ord.user_id and not is_admin() then
    raise exception 'Unauthorized';
  end if;

  update orders
  set payment_confirmation_requested = true
  where id = p_order_id;

  insert into order_status_history (order_id, status, note)
  values (p_order_id, ord.status, 'Customer submitted payment confirmation request (UPI)');

  return json_build_object('success', true, 'order_id', p_order_id, 'order_number', ord.order_number);
end $$;

-- Admin action: Verify manual payment, atomically deduct stock, and transition order to processing.
create or replace function admin_verify_manual_payment(p_order_id uuid, p_notes text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
  li order_items%rowtype;
  new_stock int;
  admin_uid uuid := auth.uid();
begin
  -- Validate that caller is an authorized admin
  if not is_admin() and current_user not in ('postgres', 'service_role') then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  select * into ord from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Idempotency check: duplicate verification does not duplicate stock deduction
  if ord.payment_status = 'paid' then
    return json_build_object('success', true, 'order_id', ord.id, 'order_number', ord.order_number, 'already_paid', true);
  end if;

  -- Atomically deduct inventory for each item (ensures no overselling & no negative stock)
  for li in select * from order_items where order_id = p_order_id loop
    if li.product_id is not null then
      update products
      set stock = stock - li.quantity
      where id = li.product_id and stock >= li.quantity
      returning stock into new_stock;

      if not found then
        raise exception 'Product % has insufficient stock during verification', li.product_name;
      end if;

      insert into inventory_transactions (product_id, change, reason, note, admin_id)
      values (li.product_id, -li.quantity, 'sale', 'Order ' || ord.order_number || ' verified', admin_uid);
    end if;
  end loop;

  -- Update order status to paid and processing
  update orders set
    payment_status = 'paid',
    status = 'processing',
    payment_confirmation_requested = true,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_order_id;

  -- Record payment transaction
  insert into payments (order_id, amount, status, method, raw)
  values (
    p_order_id,
    ord.total,
    'captured',
    'upi_qr',
    jsonb_build_object('verified_by_admin', admin_uid, 'notes', p_notes, 'verified_at', now())
  );

  -- Record status history
  insert into order_status_history (order_id, status, note)
  values (p_order_id, 'processing', coalesce(p_notes, 'Manual UPI payment verified by admin'));

  -- Record coupon usage if not already recorded
  if ord.coupon_code is not null then
    update coupons set used_count = used_count + 1 where upper(code) = upper(ord.coupon_code);
    insert into coupon_usage (coupon_id, user_id, order_id)
      select id, ord.user_id, ord.id from coupons where upper(code) = upper(ord.coupon_code)
      on conflict do nothing;
  end if;

  return json_build_object(
    'success', true,
    'order_id', ord.id,
    'order_number', ord.order_number,
    'payment_status', 'paid',
    'status', 'processing'
  );
end $$;

-- Idempotently confirm a paid order (used for gateway callbacks / future Razorpay)
create or replace function confirm_order_paid(p_order_id uuid, p_rzp_order_id text, p_rzp_payment_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
  li order_items%rowtype;
  new_stock int;
begin
  select * into ord from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if ord.payment_status = 'paid' then
    return json_build_object('success', true, 'order_number', ord.order_number, 'order_id', ord.id, 'already', true);
  end if;

  for li in select * from order_items where order_id = p_order_id loop
    if li.product_id is not null then
      update products
      set stock = stock - li.quantity
      where id = li.product_id and stock >= li.quantity
      returning stock into new_stock;

      if not found then
        raise exception 'Product % has insufficient stock during confirmation', li.product_name;
      end if;

      insert into inventory_transactions (product_id, change, reason, note)
      values (li.product_id, -li.quantity, 'sale', ord.order_number);
    end if;
  end loop;

  update orders set
    payment_status = 'paid',
    status = 'processing',
    razorpay_order_id = coalesce(p_rzp_order_id, razorpay_order_id),
    razorpay_payment_id = p_rzp_payment_id,
    updated_at = now()
  where id = p_order_id;

  insert into payments (order_id, razorpay_order_id, razorpay_payment_id, amount, status, method)
  values (p_order_id, p_rzp_order_id, p_rzp_payment_id, ord.total, 'captured', 'razorpay')
  on conflict (razorpay_payment_id) do nothing;

  insert into order_status_history (order_id, status, note)
  values (p_order_id, 'processing', 'Payment received via Razorpay');

  if ord.coupon_code is not null then
    update coupons set used_count = used_count + 1 where upper(code) = upper(ord.coupon_code);
    insert into coupon_usage (coupon_id, user_id, order_id)
      select id, ord.user_id, ord.id from coupons where upper(code) = upper(ord.coupon_code);
  end if;

  if ord.user_id is not null then
    delete from cart_items where user_id = ord.user_id;
  end if;

  return json_build_object('success', true, 'order_number', ord.order_number, 'order_id', ord.id);
end $$;

create or replace function mark_order_failed(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders
  set payment_status = 'failed', status = 'payment_failed', updated_at = now()
  where id = p_order_id and payment_status <> 'paid';
end $$;

-- Permissions
grant execute on function create_pending_order(uuid, jsonb, jsonb, text) to authenticated, anon, service_role, postgres;
grant execute on function request_payment_confirmation(uuid) to authenticated, anon, service_role, postgres;
grant execute on function admin_verify_manual_payment(uuid, text) to authenticated, service_role, postgres;

revoke execute on function confirm_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function confirm_order_paid(uuid, text, text) to service_role, postgres;

revoke execute on function mark_order_failed(uuid) from public, anon, authenticated;
grant execute on function mark_order_failed(uuid) to service_role, postgres;
