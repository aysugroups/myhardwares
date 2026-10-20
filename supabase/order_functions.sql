-- ============================================================
-- MY HARDWARES — Order & Payment RPCs (atomic, server-authoritative)
-- Run this FIFTH (after seed.sql). Called by Edge Functions.
-- ============================================================

-- Unique partial indexes guaranteeing 1-to-1 Razorpay order/payment mapping and single coupon usage per order
create unique index if not exists idx_orders_rzp_order_unique
  on orders(razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists idx_orders_rzp_payment_unique
  on orders(razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists idx_coupon_usage_order_unique
  on coupon_usage(coupon_id, order_id)
  where order_id is not null;

-- Create a PENDING order with server-computed totals (never trusts client prices).
create or replace function create_pending_order(p_user_id uuid, p_items jsonb, p_address jsonb, p_coupon text)
returns json language plpgsql security definer set search_path = public as $$
declare
  rec record;
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
  v_coupon_code text := null;
  v_order_id uuid;
  v_order_number text;
  s jsonb;
  cp json;
  free_thr numeric;
  ship_fee numeric;
  tax_pct numeric;
begin
  if p_user_id is null then
    raise exception 'User authentication is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_address is null
     or jsonb_typeof(p_address) <> 'object'
     or length(trim(coalesce(p_address->>'full_name', ''))) = 0
     or length(trim(coalesce(p_address->>'phone', ''))) = 0
     or length(trim(coalesce(p_address->>'line1', ''))) = 0
     or length(trim(coalesce(p_address->>'city', ''))) = 0
     or length(trim(coalesce(p_address->>'state', ''))) = 0
     or length(trim(coalesce(p_address->>'pincode', ''))) = 0 then
    raise exception 'Complete delivery address is required';
  end if;

  -- Validate every line item first and reject invalid quantities
  for rec in
    select
      it->>'product_id' as raw_pid,
      it->>'quantity' as raw_qty
    from jsonb_array_elements(p_items) as it
  loop
    if rec.raw_pid is null or length(trim(rec.raw_pid)) = 0 then
      raise exception 'Product ID is required';
    end if;
    if rec.raw_qty is null or rec.raw_qty !~ '^[0-9]+$' or (rec.raw_qty)::int <= 0 or (rec.raw_qty)::int > 1000 then
      raise exception 'Invalid product quantity';
    end if;
  end loop;

  -- Create pending order record (cart_items are NOT cleared here; only cleared when payment is confirmed)
  insert into orders (
    user_id, address, subtotal, discount, coupon_code, shipping, tax, total,
    payment_method, payment_confirmation_requested, payment_status, status
  ) values (
    p_user_id, p_address, 0, 0, null, 0, 0, 0,
    'razorpay', false, 'pending', 'pending_payment'
  ) returning id, order_number into v_order_id, v_order_number;

  -- Aggregate duplicate product_ids so split line items cannot bypass stock validation
  for rec in
    select
      (it->>'product_id')::uuid as product_id,
      sum((it->>'quantity')::int)::int as total_qty
    from jsonb_array_elements(p_items) as it
    group by (it->>'product_id')::uuid
    order by (it->>'product_id')::uuid
  loop
    select * into prod from products where id = rec.product_id;
    if not found or prod.status <> 'published' then
      raise exception 'Product is unavailable';
    end if;

    qty := rec.total_qty;
    if qty <= 0 or qty > 1000 then
      raise exception 'Invalid quantity for %', prod.name;
    end if;

    if prod.stock < qty then
      raise exception 'Insufficient stock for %', prod.name;
    end if;

    if prod.sale_price is not null and prod.sale_price > 0 and prod.sale_price < prod.price then
      unit_p := prod.sale_price;
    else
      unit_p := prod.price;
    end if;

    line_tot := round(unit_p * qty, 2);
    v_subtotal := v_subtotal + line_tot;

    select url into img_url
    from product_images
    where product_id = prod.id
    order by is_primary desc, sort_order asc
    limit 1;

    insert into order_items (order_id, product_id, product_name, sku, unit_price, quantity, line_total, image_url)
    values (v_order_id, prod.id, prod.name, prod.sku, unit_p, qty, line_tot, img_url);
  end loop;

  -- Server-side coupon validation (reject invalid/expired coupons explicitly)
  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    cp := validate_coupon(trim(p_coupon), v_subtotal, p_user_id);
    if not coalesce((cp->>'valid')::boolean, false) then
      raise exception '%', coalesce(cp->>'message', 'Invalid or expired coupon');
    end if;
    v_discount := coalesce((cp->>'discount')::numeric, 0);
    v_coupon_code := upper(trim(p_coupon));
  end if;

  -- Shipping & tax calculation from site settings
  select data into s from site_settings where id = 1;
  free_thr := coalesce((s->>'free_shipping_threshold')::numeric, 999);
  ship_fee := coalesce((s->>'shipping_fee')::numeric, 79);
  tax_pct  := coalesce((s->>'tax_percent')::numeric, 0);

  v_shipping := case when v_subtotal >= free_thr then 0 else ship_fee end;
  v_tax := round((greatest(0, v_subtotal - v_discount)) * tax_pct / 100.0, 2);
  v_total := greatest(0, v_subtotal - v_discount) + v_shipping + v_tax;

  update orders set
    subtotal = v_subtotal,
    discount = v_discount,
    coupon_code = v_coupon_code,
    shipping = v_shipping,
    tax = v_tax,
    total = v_total
  where id = v_order_id;

  insert into order_status_history (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Order created, awaiting Razorpay payment');

  return json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'amount', round(v_total * 100), -- paise
    'breakdown', json_build_object(
      'subtotal', v_subtotal,
      'discount', v_discount,
      'shipping', v_shipping,
      'tax', v_tax,
      'total', v_total
    )
  );
end $$;

-- Idempotently confirm a paid order: verify Razorpay order/payment IDs, reduce stock atomically,
-- record payment, record coupon usage once, clear cart, and log status.
create or replace function confirm_order_paid(p_order_id uuid, p_rzp_order_id text, p_rzp_payment_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
  li order_items%rowtype;
  new_stock int;
  v_rzp_order_id text := trim(coalesce(p_rzp_order_id, ''));
  v_rzp_payment_id text := trim(coalesce(p_rzp_payment_id, ''));
begin
  if p_order_id is null or length(v_rzp_order_id) = 0 or length(v_rzp_payment_id) = 0 then
    raise exception 'Order ID, Razorpay order ID, and Razorpay payment ID are required';
  end if;

  -- Lock the order row first to serialize concurrent verification + webhook calls
  select * into ord from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Verify Razorpay order ID matches the intended database order
  if ord.razorpay_order_id is null or ord.razorpay_order_id <> v_rzp_order_id then
    raise exception 'Razorpay order ID mismatch';
  end if;

  -- Guarantee a payment ID can never be reused to pay a different order
  if exists (
    select 1 from payments where razorpay_payment_id = v_rzp_payment_id and order_id <> p_order_id
  ) or exists (
    select 1 from orders where razorpay_payment_id = v_rzp_payment_id and id <> p_order_id
  ) then
    raise exception 'Payment ID is already associated with another order';
  end if;

  -- Idempotency check: if already paid, do not deduct stock or record coupon usage again
  if ord.payment_status = 'paid' then
    if ord.razorpay_payment_id is not null and ord.razorpay_payment_id <> v_rzp_payment_id then
      raise exception 'Order already paid with a different payment ID';
    end if;
    return json_build_object(
      'success', true,
      'order_number', ord.order_number,
      'order_id', ord.id,
      'already', true,
      'already_paid', true
    );
  end if;

  -- Atomically deduct inventory for each item in deterministic product_id order
  for li in
    select * from order_items
    where order_id = p_order_id
    order by product_id nulls last, id
  loop
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

  -- Update order status to paid & confirmed
  update orders set
    payment_status = 'paid',
    status = case
      when status in ('pending_payment', 'payment_failed') then 'confirmed'::order_status
      else status
    end,
    payment_method = 'razorpay',
    razorpay_order_id = v_rzp_order_id,
    razorpay_payment_id = v_rzp_payment_id,
    updated_at = now()
  where id = p_order_id;

  -- Record payment (safe on conflict because we verified ownership above)
  insert into payments (order_id, razorpay_order_id, razorpay_payment_id, amount, status, method)
  values (p_order_id, v_rzp_order_id, v_rzp_payment_id, ord.total, 'captured', 'razorpay')
  on conflict (razorpay_payment_id) do nothing;

  insert into order_status_history (order_id, status, note)
  values (p_order_id, 'confirmed', 'Payment verified via Razorpay (' || v_rzp_payment_id || ')');

  -- Record coupon usage exactly once per order
  if ord.coupon_code is not null and length(trim(ord.coupon_code)) > 0 then
    insert into coupon_usage (coupon_id, user_id, order_id)
    select c.id, ord.user_id, ord.id
    from coupons c
    where upper(c.code) = upper(trim(ord.coupon_code))
    on conflict (coupon_id, order_id) where order_id is not null do nothing;

    if found then
      update coupons
      set used_count = used_count + 1
      where upper(code) = upper(trim(ord.coupon_code));
    end if;
  end if;

  -- Clear user's active cart in database upon confirmed payment
  if ord.user_id is not null then
    delete from cart_items where user_id = ord.user_id;
  end if;

  return json_build_object(
    'success', true,
    'order_number', ord.order_number,
    'order_id', ord.id
  );
end $$;

-- Mark an unpaid order as failed (never downgrades an already-paid order)
create or replace function mark_order_failed(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
begin
  if p_order_id is null then
    return;
  end if;

  select * into ord from orders where id = p_order_id for update;
  if not found or ord.payment_status = 'paid' then
    return;
  end if;

  if ord.payment_status <> 'failed' or ord.status <> 'payment_failed' then
    update orders
    set payment_status = 'failed', status = 'payment_failed', updated_at = now()
    where id = p_order_id and payment_status <> 'paid';

    insert into order_status_history (order_id, status, note)
    values (p_order_id, 'payment_failed', 'Payment attempt failed or cancelled');
  end if;
end $$;

-- Legacy manual payment helpers (kept backward-compatible with strict privilege & auth checks)
create or replace function request_payment_confirmation(p_order_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
begin
  if auth.uid() is null and not is_admin() then
    raise exception 'Authentication required';
  end if;

  select * into ord from orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  if ord.user_id is null or (auth.uid() <> ord.user_id and not is_admin()) then
    raise exception 'Unauthorized';
  end if;

  update orders
  set payment_confirmation_requested = true, updated_at = now()
  where id = p_order_id and payment_status <> 'paid';

  return json_build_object('success', true, 'order_id', p_order_id, 'order_number', ord.order_number);
end $$;

create or replace function admin_verify_manual_payment(p_order_id uuid, p_notes text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype;
  li order_items%rowtype;
  new_stock int;
  admin_uid uuid := auth.uid();
begin
  if not is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  select * into ord from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if ord.payment_status = 'paid' then
    return json_build_object('success', true, 'order_id', ord.id, 'order_number', ord.order_number, 'already_paid', true);
  end if;

  for li in select * from order_items where order_id = p_order_id order by product_id nulls last, id loop
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

  update orders set
    payment_status = 'paid',
    status = 'confirmed',
    payment_confirmation_requested = true,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_order_id;

  insert into payments (order_id, amount, status, method, raw)
  values (
    p_order_id,
    ord.total,
    'captured',
    coalesce(ord.payment_method, 'manual'),
    jsonb_build_object('verified_by_admin', admin_uid, 'notes', p_notes, 'verified_at', now())
  );

  insert into order_status_history (order_id, status, note)
  values (p_order_id, 'confirmed', coalesce(p_notes, 'Payment verified by admin'));

  if ord.coupon_code is not null and length(trim(ord.coupon_code)) > 0 then
    insert into coupon_usage (coupon_id, user_id, order_id)
    select c.id, ord.user_id, ord.id
    from coupons c
    where upper(c.code) = upper(trim(ord.coupon_code))
    on conflict (coupon_id, order_id) where order_id is not null do nothing;

    if found then
      update coupons set used_count = used_count + 1 where upper(code) = upper(trim(ord.coupon_code));
    end if;
  end if;

  if ord.user_id is not null then
    delete from cart_items where user_id = ord.user_id;
  end if;

  return json_build_object(
    'success', true,
    'order_id', ord.id,
    'order_number', ord.order_number,
    'payment_status', 'paid',
    'status', 'confirmed'
  );
end $$;

-- Strict EXECUTE privileges on SECURITY DEFINER functions
revoke execute on function create_pending_order(uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function create_pending_order(uuid, jsonb, jsonb, text) to service_role, postgres;

revoke execute on function confirm_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function confirm_order_paid(uuid, text, text) to service_role, postgres;

revoke execute on function mark_order_failed(uuid) from public, anon, authenticated;
grant execute on function mark_order_failed(uuid) to service_role, postgres;

revoke execute on function request_payment_confirmation(uuid) from public, anon;
grant execute on function request_payment_confirmation(uuid) to authenticated, service_role, postgres;

revoke execute on function admin_verify_manual_payment(uuid, text) from public, anon;
grant execute on function admin_verify_manual_payment(uuid, text) to authenticated, service_role, postgres;
