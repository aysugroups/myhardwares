-- ============================================================
-- MY HARDWARES — Database Schema (PostgreSQL / Supabase)
-- Run this FIRST in the Supabase SQL Editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type product_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending_payment','payment_failed','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','refund_initiated','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;

-- ---------- Profiles & roles ----------
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

-- ---------- Catalog ----------
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

-- ---------- Cart & wishlist ----------
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

-- ---------- Orders ----------
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

-- ---------- CMS ----------
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
