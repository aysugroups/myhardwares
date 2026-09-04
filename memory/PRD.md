# MY HARDWARES — PRD & Progress

## Original Problem
Build a real, production-ready, premium LIGHT (orange + white) e-commerce platform "MY HARDWARES" (locks, fittings, kitchen/architectural hardware, tools). Strictly **Supabase** backend (Postgres, Auth, Storage, Realtime, Edge Functions), **Razorpay** payments, **Cloudflare** deployment. No fake data — real DB, auth, payments, admin, realtime, RLS.

## Architecture
- **Frontend:** React 18 + Vite + TypeScript, React Router, TanStack Query, Zustand, Framer Motion, Tailwind, Recharts, Sonner. Runs on port 3000 via supervisor (`yarn start` -> vite).
- **Backend:** Supabase only. SQL in `/app/supabase/` (schema, functions, rls, seed, order_functions, storage). Edge Functions in `/app/supabase/functions/` (Razorpay).
- Service layer in `src/services/*`; stores in `src/store/*`.
- Graceful "setup pending" state when `VITE_SUPABASE_URL/ANON_KEY` are placeholders (isSupabaseConfigured gate).

## Design
- Palette: brand orange #FF5E1A + white/warm-white/light-gray; dark gray typography. Fonts: Outfit (headings) + Plus Jakarta Sans (body). Guidelines in `/app/design_guidelines.json`.
- Generated logo at `frontend/public/logo-full.png` & `logo-icon.png`.

## Implemented (2026-06)
- Full storefront: Home (hero, categories, featured/best/new/deals rails, why-us, promo, brands, CTA, newsletter), Products listing (filters/sort/pagination), Product detail (gallery, tabs, reviews, related), Categories, Category, Search (debounced suggestions), Deals, About, Contact, policies, 404.
- Cart (drawer + page, guest localStorage + server sync + merge), Wishlist (auth), Coupons (server-validated).
- Auth (Supabase): login, register, forgot password, session persistence, role-based guards.
- Account: dashboard, profile, orders, order detail w/ tracking timeline, wishlist, addresses (Indian phone/PIN validation).
- Checkout: address select/add, coupon, server-computed totals, Razorpay flow (keys-pending state handled).
- Admin panel (light SaaS): dashboard (real RPC stats + charts + realtime), products CRUD + image upload, categories, brands, inventory (atomic adjust), orders + status updates, customers, reviews moderation, coupons, banners, analytics, settings. Realtime notifications.
- DB: full normalized schema, RLS on all tables, triggers (profile creation with customer role, admin promote RPC, rating recompute, notifications), atomic order/payment RPCs, coupon validation, storage bucket + policies.
- Razorpay Edge Functions: create-order (server price authority), verify (HMAC signature), webhook (idempotent), mark-failed.
- Cloudflare: `_redirects` (SPA), `_headers` (security), robots.txt. README with full setup.

## Verified
- Production build passes (yarn build). All routes render (home, products empty state, admin login) via screenshots. App gracefully handles no-Supabase state.
- NOT YET tested end-to-end with a live Supabase project (awaiting user's Supabase URL + anon key).

## Pending / Backlog
- **P0:** User to create Supabase project, run 6 SQL files, add `VITE_*` keys → then run testing_agent for full auth/cart/checkout/admin flows.
- **P0:** Razorpay keys + Edge Function deploy for live payments.
- **P1:** Product specifications/variants admin editor UI; subcategory admin; reorder drag-drop.
- **P1:** Reset-password page (deep link), email/SMS notification integrations (modular).
- **P2:** Sitemap generation, structured data expansion, GST invoices, courier API.

## Notes
- Static imports used in `App.tsx` (React.lazy hung behind the Vite-dev preview proxy). Production build still code-splits via manualChunks.
