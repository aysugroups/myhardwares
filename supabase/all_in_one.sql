-- ============================================================
-- MY HARDWARES — ALL-IN-ONE SUPABASE DATABASE SETUP
-- Safe and idempotent script for fresh setup or updates.
--
-- Execution Order:
--   1. Extensions, Enums & Schema Tables
--   2. Functions, Triggers & Admin RPCs
--   3. Row Level Security (RLS) & Policies
--   4. Seed Data (Catalog, Categories, Brands, Settings, Coupons)
--   5. Order & Payment RPCs (Server-Authoritative)
--   6. Storage Bucket & Policies
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS & ENUMS
-- ============================================================
create extension if not exists "pgcrypto";

do $$ begin
  create type product_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending_payment','payment_failed','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','refund_initiated','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. SCHEMA TABLES & INDEXES
-- ============================================================

-- ---------- Profiles & Roles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Catalog: Categories & Brands ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Catalog: Products ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  slug text unique not null,
  short_description text,
  description text,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price >= 0),
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  status product_status not null default 'draft',
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  weight text,
  dimensions text,
  warranty text,
  tags text[] default '{}',
  specifications jsonb default '{}'::jsonb,
  seo_title text,
  seo_description text,
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_flags on products(is_featured, is_best_seller, is_new_arrival);
create index if not exists idx_products_name_trgm on products using gin (to_tsvector('english', name));

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  storage_path text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product on product_images(product_id);

create table if not exists product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  value text not null,
  sort_order int not null default 0
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  value text not null,
  price_delta numeric(12,2) not null default 0,
  stock int not null default 0
);

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  change int not null,
  reason text not null,
  note text,
  admin_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Cart & Wishlist ----------
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- Addresses ----------
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  landmark text,
  type text not null default 'home',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_addresses_user on addresses(user_id);

-- ---------- Coupons ----------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null,
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  expires_at timestamptz,
  usage_limit int,
  per_user_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- Orders & Payments ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  address jsonb not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  coupon_code text,
  shipping numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_method text not null default 'upi_qr',
  payment_confirmation_requested boolean not null default false,
  payment_status payment_status not null default 'pending',
  status order_status not null default 'pending_payment',
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_rzp on orders(razorpay_order_id);
create index if not exists idx_orders_pay_status on orders(payment_status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  sku text,
  unit_price numeric(12,2) not null,
  quantity int not null,
  line_total numeric(12,2) not null,
  image_url text
);

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  amount numeric(12,2),
  status text,
  method text,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Reviews ----------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  comment text,
  is_verified boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  url text not null
);

-- ---------- CMS & Settings ----------
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text,
  link text,
  position text not null default 'home_hero',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = admin/global
  type text,
  title text,
  message text,
  is_read boolean not null default false,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_admin on notifications(user_id) where user_id is null;


-- ============================================================
-- 3. FUNCTIONS, TRIGGERS & RPCs
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

-- ---------- New user -> profile (strictly sets role = customer) ----------
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

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists t_products_updated on products;
create trigger t_products_updated before update on products for each row execute function set_updated_at();
drop trigger if exists t_orders_updated on orders;
create trigger t_orders_updated before update on orders for each row execute function set_updated_at();
drop trigger if exists t_profiles_updated on profiles;
create trigger t_profiles_updated before update on profiles for each row execute function set_updated_at();

-- ---------- Order number generator ----------
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

-- ---------- Admin dashboard stats ----------
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


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================

-- Prevent customers from escalating their own role or status
create or replace function prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and nullif(current_setting('app.allow_role_change', true), '') is null then
    if new.role is distinct from old.role then
      raise exception 'Customers cannot modify user roles';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Customers cannot modify user status';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists t_prevent_role on profiles;
create trigger t_prevent_role before update on profiles for each row execute function prevent_role_change();

-- Enable RLS across all tables
alter table profiles enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_specifications enable row level security;
alter table product_variants enable row level security;
alter table inventory_transactions enable row level security;
alter table cart_items enable row level security;
alter table wishlist_items enable row level security;
alter table addresses enable row level security;
alter table coupons enable row level security;
alter table coupon_usage enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table review_images enable row level security;
alter table banners enable row level security;
alter table site_settings enable row level security;
alter table notifications enable row level security;

-- ---------- PROFILES ----------
drop policy if exists p_profiles_self_select on profiles;
create policy p_profiles_self_select on profiles for select using (id = auth.uid() or is_admin());
drop policy if exists p_profiles_self_update on profiles;
create policy p_profiles_self_update on profiles for update using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- ---------- CATALOG ----------
drop policy if exists p_categories_read on categories;
create policy p_categories_read on categories for select using (is_active or is_admin());
drop policy if exists p_categories_admin on categories;
create policy p_categories_admin on categories for all using (is_admin()) with check (is_admin());

drop policy if exists p_subcat_read on subcategories;
create policy p_subcat_read on subcategories for select using (is_active or is_admin());
drop policy if exists p_subcat_admin on subcategories;
create policy p_subcat_admin on subcategories for all using (is_admin()) with check (is_admin());

drop policy if exists p_brands_read on brands;
create policy p_brands_read on brands for select using (is_active or is_admin());
drop policy if exists p_brands_admin on brands;
create policy p_brands_admin on brands for all using (is_admin()) with check (is_admin());

drop policy if exists p_products_read on products;
create policy p_products_read on products for select using (status = 'published' or is_admin());
drop policy if exists p_products_admin on products;
create policy p_products_admin on products for all using (is_admin()) with check (is_admin());

drop policy if exists p_images_read on product_images;
create policy p_images_read on product_images for select using (true);
drop policy if exists p_images_admin on product_images;
create policy p_images_admin on product_images for all using (is_admin()) with check (is_admin());

drop policy if exists p_specs_read on product_specifications;
create policy p_specs_read on product_specifications for select using (true);
drop policy if exists p_specs_admin on product_specifications;
create policy p_specs_admin on product_specifications for all using (is_admin()) with check (is_admin());

drop policy if exists p_variants_read on product_variants;
create policy p_variants_read on product_variants for select using (true);
drop policy if exists p_variants_admin on product_variants;
create policy p_variants_admin on product_variants for all using (is_admin()) with check (is_admin());

drop policy if exists p_inv_admin on inventory_transactions;
create policy p_inv_admin on inventory_transactions for all using (is_admin()) with check (is_admin());

-- ---------- CART & WISHLIST ----------
drop policy if exists p_cart_own on cart_items;
create policy p_cart_own on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_wishlist_own on wishlist_items;
create policy p_wishlist_own on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- ADDRESSES ----------
drop policy if exists p_addr_own on addresses;
create policy p_addr_own on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- COUPONS ----------
drop policy if exists p_coupons_read on coupons;
create policy p_coupons_read on coupons for select using (is_admin() or is_active);
drop policy if exists p_coupons_admin on coupons;
create policy p_coupons_admin on coupons for all using (is_admin()) with check (is_admin());

drop policy if exists p_coupon_usage_own on coupon_usage;
create policy p_coupon_usage_own on coupon_usage for select using (user_id = auth.uid() or is_admin());

-- ---------- ORDERS ----------
drop policy if exists p_orders_read on orders;
create policy p_orders_read on orders for select using (user_id = auth.uid() or is_admin());
drop policy if exists p_orders_admin_update on orders;
create policy p_orders_admin_update on orders for update using (is_admin()) with check (is_admin());

drop policy if exists p_order_items_read on order_items;
create policy p_order_items_read on order_items for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

drop policy if exists p_order_history_read on order_status_history;
create policy p_order_history_read on order_status_history for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_status_history.order_id and o.user_id = auth.uid())
);
drop policy if exists p_order_history_admin on order_status_history;
create policy p_order_history_admin on order_status_history for insert with check (is_admin());

drop policy if exists p_payments_admin on payments;
create policy p_payments_admin on payments for select using (
  is_admin() or exists (select 1 from orders o where o.id = payments.order_id and o.user_id = auth.uid())
);

-- ---------- REVIEWS ----------
drop policy if exists p_reviews_read on reviews;
create policy p_reviews_read on reviews for select using (is_visible or user_id = auth.uid() or is_admin());
drop policy if exists p_reviews_insert on reviews;
create policy p_reviews_insert on reviews for insert with check (
  user_id = auth.uid() and exists (
    select 1 from order_items oi join orders o on o.id = oi.order_id
    where oi.product_id = reviews.product_id and o.user_id = auth.uid() and o.status = 'delivered'
  )
);
drop policy if exists p_reviews_update_own on reviews;
create policy p_reviews_update_own on reviews for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
drop policy if exists p_reviews_delete on reviews;
create policy p_reviews_delete on reviews for delete using (user_id = auth.uid() or is_admin());

drop policy if exists p_review_images_read on review_images;
create policy p_review_images_read on review_images for select using (true);
drop policy if exists p_review_images_write on review_images;
create policy p_review_images_write on review_images for all using (is_admin() or exists (select 1 from reviews r where r.id = review_images.review_id and r.user_id = auth.uid())) with check (true);

-- ---------- CMS & SETTINGS ----------
drop policy if exists p_banners_read on banners;
create policy p_banners_read on banners for select using (is_active or is_admin());
drop policy if exists p_banners_admin on banners;
create policy p_banners_admin on banners for all using (is_admin()) with check (is_admin());

drop policy if exists p_settings_read on site_settings;
create policy p_settings_read on site_settings for select using (true);
drop policy if exists p_settings_admin on site_settings;
create policy p_settings_admin on site_settings for all using (is_admin()) with check (is_admin());

-- ---------- NOTIFICATIONS ----------
drop policy if exists p_notif_read on notifications;
create policy p_notif_read on notifications for select using (
  (user_id is null and is_admin()) or user_id = auth.uid()
);
drop policy if exists p_notif_update on notifications;
create policy p_notif_update on notifications for update using (
  (user_id is null and is_admin()) or user_id = auth.uid()
) with check (true);


-- ============================================================
-- 5. SEED DATA (REAL STARTING CATALOG)
-- ============================================================

-- Categories
insert into categories (name, slug, description, image_url, sort_order) values
 ('Door Locks','door-locks','Secure, premium door locks and handles','https://images.unsplash.com/photo-1563417994968-13665a6ff908?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',1),
 ('Cabinet Hardware','cabinet-hardware','Handles, knobs and pulls for cabinets','https://images.unsplash.com/photo-1645743754938-98b77f7524bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',2),
 ('Kitchen Hardware','kitchen-hardware','Modern kitchen fittings and accessories','https://images.unsplash.com/photo-1595418312726-3beb2f4fe67e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',3),
 ('Furniture Fittings','furniture-fittings','Hinges, slides and furniture connectors','https://images.unsplash.com/photo-1583691028182-e8f01e74bfa2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',4),
 ('Architectural Hardware','architectural-hardware','Premium architectural fixtures','https://images.unsplash.com/photo-1643903032976-8c0d0556a8ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',5),
 ('Tools','tools','Professional-grade power and hand tools','https://images.unsplash.com/photo-1634793350906-63567e86df97?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',6),
 ('Accessories','accessories','Essential hardware accessories','https://images.unsplash.com/photo-1645743754938-98b77f7524bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',7)
on conflict (slug) do nothing;

-- Brands
insert into brands (name, slug, sort_order) values
 ('Godrej','godrej',1),('Yale','yale',2),('Hettich','hettich',3),('Hafele','hafele',4),('Ozone','ozone',5),('Dorset','dorset',6)
on conflict (slug) do nothing;

-- Site settings
insert into site_settings (id, data) values (1, jsonb_build_object(
  'store_name','MY HARDWARES','phone','+91 70105 86606','email','support@myhardwares.com',
  'whatsapp_number','917010586606',
  'upi_id','',
  'upi_qr_url','',
  'address','India','announcement','Fast Delivery • Best Hardware Deals • Quality You Can Trust',
  'free_shipping_threshold',999,'shipping_fee',79,'tax_percent',0,'currency','INR',
  'delivery_estimate','3-5 business days',
  'social', jsonb_build_object('instagram','','facebook','','twitter','','youtube','')
)) on conflict (id) do nothing;

-- Example coupon
insert into coupons (code, discount_type, discount_value, min_order, max_discount, is_active) values
 ('WELCOME10','percent',10,499,500,true)
on conflict (code) do nothing;

-- Products
insert into products (sku, name, slug, short_description, description, category_id, brand_id, price, sale_price, stock, status, is_featured, is_best_seller, is_new_arrival, warranty, tags, specifications)
select v.sku, v.name, v.slug, v.short_desc, v.descr,
  (select id from categories where slug = v.cat),
  (select id from brands where slug = v.brand),
  v.price, v.sale_price, v.stock, 'published'::product_status, v.feat, v.best, v.newa, v.warranty, v.tags, v.specs
from (values
 ('MH-DL-001','Smart Digital Door Lock','smart-digital-door-lock','Keyless entry with fingerprint & PIN','Premium smart lock with fingerprint, PIN, RFID and app unlock. Anti-tamper alarm and emergency key override.','door-locks','yale',12999,10499,25,true,true,true,'2 years',array['smart','digital','fingerprint'],'{"Material":"Zinc Alloy","Finish":"Matte Black","Unlock":"Fingerprint/PIN/RFID/App"}'::jsonb),
 ('MH-DL-002','Mortise Handle Lock Set','mortise-handle-lock-set','Solid brass mortise lock with lever handles','Heavy-duty mortise lock body with premium lever handles. Corrosion resistant and smooth operation.','door-locks','godrej',3499,2799,40,true,false,false,'1 year',array['mortise','brass'],'{"Material":"Brass","Finish":"Satin Nickel"}'::jsonb),
 ('MH-DL-003','Digital Deadbolt Lock','digital-deadbolt-lock','Touchscreen deadbolt with auto-lock','One-touch locking deadbolt with backlit touchscreen and low-battery alerts.','door-locks','ozone',7999,null,15,false,true,false,'2 years',array['deadbolt','touchscreen'],'{"Material":"Stainless Steel"}'::jsonb),
 ('MH-CH-001','Brushed Gold Cabinet Handle','brushed-gold-cabinet-handle','Set of 6 premium bar pulls','Elegant brushed-gold finish bar pulls. Includes mounting screws. 128mm hole center.','cabinet-hardware','hafele',1299,999,120,true,true,true,'1 year',array['handle','gold'],'{"Length":"160mm","Finish":"Brushed Gold"}'::jsonb),
 ('MH-CH-002','Matte Black Knob (Pack of 10)','matte-black-knob-pack','Minimalist round cabinet knobs','Solid metal round knobs with a soft matte-black finish. Pack of 10 with screws.','cabinet-hardware','hettich',899,699,90,false,false,true,'1 year',array['knob','black'],'{"Diameter":"30mm"}'::jsonb),
 ('MH-KH-001','Soft-Close Drawer Slides','soft-close-drawer-slides','Full-extension ball bearing slides','Pair of full-extension soft-close slides rated to 45kg. Whisper-quiet operation.','kitchen-hardware','hettich',1599,1299,75,true,true,false,'3 years',array['slides','soft-close'],'{"Length":"450mm","Load":"45kg"}'::jsonb),
 ('MH-KH-002','Pull-Out Kitchen Basket','pull-out-kitchen-basket','Stainless steel modular basket','Rust-proof SS304 pull-out basket for modular kitchens. Smooth telescopic channels.','kitchen-hardware','ozone',4499,3899,30,true,false,true,'2 years',array['basket','kitchen'],'{"Material":"SS304"}'::jsonb),
 ('MH-FF-001','Soft-Close Hinges (Pack of 20)','soft-close-hinges-pack','Concealed European hinges','Clip-on concealed hinges with integrated soft-close dampers. 110° opening.','furniture-fittings','hettich',1999,1699,60,false,true,false,'2 years',array['hinges','soft-close'],'{"Opening":"110°","Type":"Full Overlay"}'::jsonb),
 ('MH-FF-002','Heavy Duty Gas Lift','heavy-duty-gas-lift','Furniture gas spring 100N','Smooth-action gas lift for wardrobe shutters and storage beds. 100N force.','furniture-fittings','hafele',749,599,110,false,false,false,'1 year',array['gas-lift'],'{"Force":"100N"}'::jsonb),
 ('MH-AH-001','Premium Floor Spring','premium-floor-spring','Hydraulic door floor spring','Double-action hydraulic floor spring for glass and wooden doors up to 120kg.','architectural-hardware','dorset',6999,5999,18,true,false,false,'5 years',array['floor-spring'],'{"Load":"120kg"}'::jsonb),
 ('MH-AH-002','Glass Door Patch Fitting','glass-door-patch-fitting','Polished SS patch fitting set','Corrosion-resistant patch fittings for frameless glass doors. Mirror finish.','architectural-hardware','ozone',3299,null,22,false,false,true,'2 years',array['glass','patch'],'{"Finish":"Mirror Polish"}'::jsonb),
 ('MH-TL-001','Cordless Drill Driver 20V','cordless-drill-driver-20v','2-speed brushless drill kit','Compact 20V brushless drill with 2 batteries, charger and 25 accessories.','tools','godrej',5499,4499,50,true,true,true,'2 years',array['drill','cordless'],'{"Voltage":"20V","Torque":"45Nm"}'::jsonb),
 ('MH-TL-002','Precision Screwdriver Set','precision-screwdriver-set','58-in-1 repair toolkit','Magnetic precision bits for electronics and appliance repair. Anti-slip handle.','tools','ozone',1299,899,140,false,false,false,'1 year',array['screwdriver','toolkit'],'{"Bits":"58"}'::jsonb),
 ('MH-AC-001','Door Stopper (Pack of 4)','door-stopper-pack','Magnetic floor door stoppers','Strong magnetic catch door stoppers with rubber bumper. Easy install.','accessories','dorset',499,399,200,false,false,false,'1 year',array['stopper'],'{"Type":"Magnetic"}'::jsonb)
) as v(sku,name,slug,short_desc,descr,cat,brand,price,sale_price,stock,feat,best,newa,warranty,tags,specs)
on conflict (slug) do nothing;

-- Primary images for each product
insert into product_images (product_id, url, is_primary, sort_order)
select p.id, img.url, true, 0 from products p
join (values
 ('smart-digital-door-lock','https://images.unsplash.com/photo-1558002038-1055907df827?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('mortise-handle-lock-set','https://images.unsplash.com/photo-1563417994968-13665a6ff908?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('digital-deadbolt-lock','https://images.unsplash.com/photo-1583691028182-e8f01e74bfa2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('brushed-gold-cabinet-handle','https://images.unsplash.com/photo-1645743754938-98b77f7524bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('matte-black-knob-pack','https://images.unsplash.com/photo-1645743754938-98b77f7524bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('soft-close-drawer-slides','https://images.unsplash.com/photo-1595418312726-3beb2f4fe67e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('pull-out-kitchen-basket','https://images.unsplash.com/photo-1595418312726-3beb2f4fe67e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('soft-close-hinges-pack','https://images.unsplash.com/photo-1583691028182-e8f01e74bfa2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('heavy-duty-gas-lift','https://images.unsplash.com/photo-1583691028182-e8f01e74bfa2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('premium-floor-spring','https://images.unsplash.com/photo-1643903032976-8c0d0556a8ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('glass-door-patch-fitting','https://images.unsplash.com/photo-1643903032976-8c0d0556a8ea?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('cordless-drill-driver-20v','https://images.unsplash.com/photo-1634793350906-63567e86df97?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('precision-screwdriver-set','https://images.unsplash.com/photo-1634793350906-63567e86df97?crop=entropy&cs=srgb&fm=jpg&q=85&w=800'),
 ('door-stopper-pack','https://images.unsplash.com/photo-1645743754938-98b77f7524bd?crop=entropy&cs=srgb&fm=jpg&q=85&w=800')
) as img(slug,url) on img.slug = p.slug
where not exists (select 1 from product_images pi where pi.product_id = p.id);


-- ============================================================
-- 6. ORDER & PAYMENT RPCs (SERVER-AUTHORITATIVE)
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


-- ============================================================
-- 7. STORAGE BUCKET & STORAGE POLICIES
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists p_storage_public_read on storage.objects;
create policy p_storage_public_read on storage.objects
  for select using (bucket_id = 'product-images');

-- Only admins can upload / update / delete
drop policy if exists p_storage_admin_insert on storage.objects;
create policy p_storage_admin_insert on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

drop policy if exists p_storage_admin_update on storage.objects;
create policy p_storage_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and is_admin())
  with check (bucket_id = 'product-images' and is_admin());

drop policy if exists p_storage_admin_delete on storage.objects;
create policy p_storage_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
