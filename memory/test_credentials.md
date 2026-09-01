# Test Credentials — MY HARDWARES

> All auth requires a connected Supabase project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in frontend/.env) and the SQL files run.

## Admin
- URL: /admin/login
- Email: myhardwaresadmin@gmail.com
- Password: Admin@Mh
- Role auto-assigned 'admin' by DB trigger on signup (handle_new_user). If created before functions.sql ran: `select promote_admin('myhardwaresadmin@gmail.com');`
- Create the user via the app Register page OR Supabase Dashboard → Authentication → Add user.

## Customer
- Register any email/password (min 8 chars) at /register.

## Razorpay (test)
- Not configured yet. Add VITE_RAZORPAY_KEY_ID (frontend) + RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET (Edge Function secrets).
- Test card: 4111 1111 1111 1111, any future expiry, any CVV.
