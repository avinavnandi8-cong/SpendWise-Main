# SpendWise + Supabase setup

The existing Supabase schema is used as-is. This integration does **not** create, alter, or drop tables, columns, policies, indexes, or triggers.

## 1. Install the Supabase client

From this `client` folder:

```bash
npm install
```

The project now depends on `@supabase/supabase-js`.

## 2. Add environment variables

Create `client/.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://nfebxsgsafktggnsctpm.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Use the **anon/public key** from Supabase Project Settings → API. Never put a service-role key in the Vite app.

## 3. Google OAuth

The app's Google button now calls Supabase Auth (`signInWithOAuth`) instead of Google Identity Services directly.

In Supabase, enable Google under Authentication → Providers and configure the Google OAuth credentials there.

Also add the SpendWise app URL to Authentication → URL Configuration → Redirect URLs. During local development this is normally your Vite URL, for example `http://localhost:5173`.

For the Google provider itself, use the Supabase callback URL shown by the Supabase dashboard for this project. Do not invent a different callback URL.

Microsoft is intentionally left unconfigured for now.

## 4. What persists in the supplied schema

- `profiles`: account/profile fields, onboarding values, preferred currency and avatar value.
- `transactions`: all transaction records.
- `budgets`: current-month budget records.
- Supabase Auth: email/password accounts, Google OAuth sessions, password reset, and password changes.

All database operations rely on the existing RLS policies and pass the authenticated user's ID where appropriate.

## 5. Fields that are not represented by the supplied schema

The current UI also contains Goals, feedback/issue reports, notification read/dismiss state, settings, and transaction `method`/`notes`.

No new database schema was added for these because you explicitly asked to preserve the existing secured schema. Goals, settings, notifications and feedback therefore remain in React memory for this build. Transaction method/notes are packed into the existing `transactions.description` text by the data layer so the existing transaction UI can continue working without changing the table schema.

If you later want Goals/settings/feedback to persist across devices, those can be given dedicated tables in a separate schema change rather than silently changing your current database.
