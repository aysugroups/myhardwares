-- ============================================================
-- MY HARDWARES — Functions, Triggers & RPCs
-- Run this SECOND (after schema.sql).
-- ============================================================

-- ---------- Admin check (avoids RLS recursion & recognizes superuser / service_role) ----------
create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select (
    current_user in ('postgres', 'service_role', 'supabase_admin')
    or (auth.jwt() ->> 'role') = 'service_role'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
$$;

-- ---------- New user -> profile ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer',
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    phone = coalesce(nullif(excluded.phone, ''), profiles.phone);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Promote any existing user to admin by email (must be executed by database owner / service role / existing admin)
create or replace function promote_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Not authorized to promote administrators';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email address is required';
  end if;

  -- Allow role change within this trusted transaction
  perform set_config('app.allow_role_change', 'on', true);

  update public.profiles
  set role = 'admin'
  where lower(email) = lower(trim(p_email));

  if not found then
    raise exception 'No profile found with email %', p_email;
  end if;
end $$;

revoke execute on function promote_admin(text) from public, anon, authenticated;
grant execute on function promote_admin(text) to service_role, postgres;

-- ---------- updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists t_products_updated on products;
create trigger t_products_updated before update on products for each row execute function set_updated_at();
drop trigger if exists t_orders_updated on orders;
create trigger t_orders_updated before update on orders for each row execute function set_updated_at();
drop trigger if exists t_profiles_updated on profiles;
create trigger t_profiles_updated before update on profiles for each row execute function set_updated_at();

-- ---------- Order number default ----------
create or replace function gen_order_number()
returns text language sql as $$
  select 'MH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
$$;
alter table orders alter column order_number set default gen_order_number();

-- ---------- Product rating recompute ----------
create or replace function recompute_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update products p set
    rating = coalesce((select round(avg(rating)::numeric,2) from reviews where product_id = pid and is_visible), 0),
    review_count = coalesce((select count(*) from reviews where product_id = pid and is_visible), 0)
  where p.id = pid;
  return null;
end $$;

drop trigger if exists t_review_rating on reviews;
create trigger t_review_rating after insert or update or delete on reviews
  for each row execute function recompute_product_rating();

-- ---------- Coupon validation (server-side) ----------
create or replace function validate_coupon(p_code text, p_subtotal numeric, p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare c coupons%rowtype; disc numeric := 0; user_uses int;
begin
  select * into c from coupons where upper(code) = upper(p_code) and is_active limit 1;
  if not found then return json_build_object('valid', false, 'message', 'Invalid coupon code', 'discount', 0); end if;
  if c.expires_at is not null and c.expires_at < now() then
    return json_build_object('valid', false, 'message', 'This coupon has expired', 'discount', 0);
  end if;
  if p_subtotal < c.min_order then
    return json_build_object('valid', false, 'message', 'Minimum order of ₹'||c.min_order||' required', 'discount', 0);
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return json_build_object('valid', false, 'message', 'This coupon usage limit is reached', 'discount', 0);
  end if;
  if c.per_user_limit is not null and p_user_id is not null then
    select count(*) into user_uses from coupon_usage where coupon_id = c.id and user_id = p_user_id;
    if user_uses >= c.per_user_limit then
      return json_build_object('valid', false, 'message', 'You have already used this coupon', 'discount', 0);
    end if;
  end if;
  if c.discount_type = 'percent' then disc := round(p_subtotal * c.discount_value / 100.0, 2);
  else disc := c.discount_value; end if;
  if c.max_discount is not null and disc > c.max_discount then disc := c.max_discount; end if;
  if disc > p_subtotal then disc := p_subtotal; end if;
  return json_build_object('valid', true, 'message', 'Coupon applied', 'discount', disc, 'coupon_id', c.id);
end $$;

-- ---------- Atomic inventory adjustment (admin) ----------
create or replace function adjust_inventory(p_product_id uuid, p_change int, p_reason text, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare new_stock int;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update products set stock = stock + p_change where id = p_product_id returning stock into new_stock;
  if new_stock < 0 then raise exception 'Stock cannot go negative'; end if;
  insert into inventory_transactions (product_id, change, reason, note, admin_id)
    values (p_product_id, p_change, p_reason, p_note, auth.uid());
  return new_stock;
end $$;

-- ---------- Admin dashboard stats (real data) ----------
create or replace function admin_dashboard_stats()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select json_build_object(
    'total_users', (select count(*) from profiles where role='customer'),
    'new_users', (select count(*) from profiles where role='customer' and created_at > now() - interval '7 days'),
    'total_orders', (select count(*) from orders),
    'pending_orders', (select count(*) from orders where status in ('confirmed','processing','packed','shipped','out_for_delivery')),
    'completed_orders', (select count(*) from orders where status='delivered'),
    'revenue', (select coalesce(sum(total),0) from orders where payment_status='paid'),
    'today_revenue', (select coalesce(sum(total),0) from orders where payment_status='paid' and created_at::date = now()::date),
    'total_products', (select count(*) from products),
    'low_stock', (select count(*) from products where stock > 0 and stock <= low_stock_threshold),
    'out_of_stock', (select count(*) from products where stock = 0),
    'pending_payments', (select count(*) from orders where payment_status='pending'),
    'refunds', (select count(*) from orders where status in ('refund_initiated','refunded')),
    'revenue_series', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select to_char(d.day,'DD Mon') as date, coalesce(sum(o.total),0) as amount
        from generate_series(now()::date - interval '13 days', now()::date, interval '1 day') d(day)
        left join orders o on o.created_at::date = d.day and o.payment_status='paid'
        group by d.day order by d.day
      ) t),
    'orders_series', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select to_char(d.day,'DD Mon') as date, count(o.id) as count
        from generate_series(now()::date - interval '13 days', now()::date, interval '1 day') d(day)
        left join orders o on o.created_at::date = d.day
        group by d.day order by d.day
      ) t),
    'top_products', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select oi.product_name as name, sum(oi.quantity) as qty
        from order_items oi join orders o on o.id=oi.order_id and o.payment_status='paid'
        group by oi.product_name order by qty desc limit 5
      ) t),
    'top_categories', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select c.name as name, sum(oi.quantity) as qty
        from order_items oi join orders o on o.id=oi.order_id and o.payment_status='paid'
        join products p on p.id=oi.product_id join categories c on c.id=p.category_id
        group by c.name order by qty desc limit 6
      ) t),
    'recent_orders', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select id, order_number, total, status, created_at from orders order by created_at desc limit 6
      ) t)
  ) into result;
  return result;
end $$;

-- ---------- Admin customers with aggregates ----------
create or replace function admin_customers()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into result from (
    select p.id, p.full_name, p.email, p.phone, p.status, p.created_at,
      (select count(*) from orders o where o.user_id = p.id) as order_count,
      (select coalesce(sum(o.total),0) from orders o where o.user_id = p.id and o.payment_status='paid') as total_spent
    from profiles p where p.role='customer' order by p.created_at desc
  ) t;
  return result;
end $$;

-- ---------- Notify admin on paid order ----------
create or replace function notify_paid_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'paid' and (old.payment_status is distinct from 'paid') then
    insert into notifications (user_id, type, title, message, meta)
    values (null, 'order', 'New order '||new.order_number, 'Amount ₹'||new.total, json_build_object('order_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists t_notify_paid on orders;
create trigger t_notify_paid after update on orders for each row execute function notify_paid_order();

-- ---------- Notify admin on low stock ----------
create or replace function notify_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock <= new.low_stock_threshold and (old.stock is distinct from new.stock) and new.stock < old.stock then
    insert into notifications (user_id, type, title, message, meta)
    values (null, 'stock', 'Low stock: '||new.name, 'Only '||new.stock||' left', json_build_object('product_id', new.id));
  end if;
  return new;
end $$;

drop trigger if exists t_notify_low_stock on products;
create trigger t_notify_low_stock after update of stock on products for each row execute function notify_low_stock();
