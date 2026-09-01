-- ============================================================
-- MY HARDWARES — Storage bucket & policies
-- Run this SIXTH. Creates the public 'product-images' bucket.
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
  for update using (bucket_id = 'product-images' and is_admin());

drop policy if exists p_storage_admin_delete on storage.objects;
create policy p_storage_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
