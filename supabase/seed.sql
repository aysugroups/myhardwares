-- ============================================================
-- MY HARDWARES — Seed Data (real starting catalog)
-- Run this FOURTH (after rls.sql). Safe to re-run.
-- These are real, editable catalog items — manage them in /admin.
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

-- Primary images for each product (reuses curated hardware imagery)
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
