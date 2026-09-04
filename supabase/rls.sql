-- ============================================================
-- MY HARDWARES — Row Level Security
-- Run this THIRD (after functions.sql).
-- ============================================================

-- Prevent customers from escalating their own role or status
create or replace function prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
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

-- Enable RLS
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
create policy p_profiles_self_update on profiles for update using (id = auth.uid() or is_admin());

-- ---------- CATALOG (public read published/active, admin write) ----------
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

-- ---------- CART / WISHLIST (own only) ----------
drop policy if exists p_cart_own on cart_items;
create policy p_cart_own on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_wishlist_own on wishlist_items;
create policy p_wishlist_own on wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- ADDRESSES (own only) ----------
drop policy if exists p_addr_own on addresses;
create policy p_addr_own on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- COUPONS (public can read active for display; admin manage) ----------
drop policy if exists p_coupons_read on coupons;
create policy p_coupons_read on coupons for select using (is_admin());
drop policy if exists p_coupons_admin on coupons;
create policy p_coupons_admin on coupons for all using (is_admin()) with check (is_admin());

drop policy if exists p_coupon_usage_own on coupon_usage;
create policy p_coupon_usage_own on coupon_usage for select using (user_id = auth.uid() or is_admin());

-- ---------- ORDERS (own read; writes via service role/edge functions) ----------
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
create policy p_payments_admin on payments for select using (is_admin());

-- ---------- REVIEWS ----------
drop policy if exists p_reviews_read on reviews;
create policy p_reviews_read on reviews for select using (is_visible or user_id = auth.uid() or is_admin());
-- Only customers who purchased & received the product can create a review
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

-- ---------- CMS ----------
drop policy if exists p_banners_read on banners;
create policy p_banners_read on banners for select using (is_active or is_admin());
drop policy if exists p_banners_admin on banners;
create policy p_banners_admin on banners for all using (is_admin()) with check (is_admin());

drop policy if exists p_settings_read on site_settings;
create policy p_settings_read on site_settings for select using (true);
drop policy if exists p_settings_admin on site_settings;
create policy p_settings_admin on site_settings for all using (is_admin()) with check (is_admin());

-- ---------- NOTIFICATIONS (own; admin sees global via null user_id) ----------
drop policy if exists p_notif_read on notifications;
create policy p_notif_read on notifications for select using (
  (user_id is null and is_admin()) or user_id = auth.uid()
);
drop policy if exists p_notif_update on notifications;
create policy p_notif_update on notifications for update using (
  (user_id is null and is_admin()) or user_id = auth.uid()
) with check (true);
