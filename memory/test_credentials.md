# Test Credentials — MY HARDWARES

> All auth requires a connected Supabase project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in frontend/.env) and the SQL files run.

## Admin
- URL: /admin/login
- Create the user via the app Register page or Supabase Dashboard -> Authentication -> Add user.
- Promote the user to admin securely in Supabase SQL Editor:
  `select promote_admin('your-admin-email@example.com');`
  OR
  `update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';`

## Customer
- Register any email/password (min 8 chars) at /register.

## Razorpay (test)
- Not configured yet. Add VITE_RAZORPAY_KEY_ID (frontend) + RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET (Edge Function secrets).
- Test card: 4111 1111 1111 1111, any future expiry, any CVV.
