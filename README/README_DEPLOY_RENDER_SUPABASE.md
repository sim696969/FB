Deploying to Render + Supabase (quick guide)

This guide assumes you have a GitHub account and a Supabase account.

1) Create a Supabase project (free tier)
   - Go to https://app.supabase.com and sign in.
   - Create a new project. Note your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
   - For server writes, create a service_role key in Project Settings -> API (this key has elevated privileges). Save it.

2) Create the orders table in Supabase (SQL)
   - Use the SQL Editor and run:

     CREATE TABLE public.orders (
       id uuid primary key default gen_random_uuid(),
       customer_name text,
       sub_total numeric,
       tip_amount numeric,
       total_amount numeric,
       order_details jsonb,
       order_date timestamptz default now(),
       status text
     );

3) Push this repo to GitHub
   - Create a new repo and push your project files.

4) Create a Render Web Service
   - Go to https://render.com and create a new Web Service.
   - Connect it to your GitHub repo and choose the main branch.
   - Build Command: `npm install`
   - Start Command: `npm start`

5) Configure environment variables on Render
   - SUPABASE_URL = <your supabase url>
   - SUPABASE_KEY = <your service_role key>
   - (Optional) SERVICE_ACCOUNT_KEY = <json string of firebase service account> if you want firebase-admin

6) Deploy and test
   - After deployment, open your Render service URL and place an order. The server will use Supabase to persist orders if configured.

Security note: Keep your service_role key secret. Use Render's environment variable settings to inject it (do not commit to GitHub).
