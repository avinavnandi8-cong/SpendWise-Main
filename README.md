# SpendWise

A modern personal-finance web app: track income and expenses, manage budgets, set
goals, and understand spending habits — built as a college portfolio project.

Designed & developed by **Avinav Nandi**.

## Stack

- **Client:** React + Vite, plain CSS (no UI framework), Recharts for charts. All
  authentication and supported financial data now use Supabase; see `SUPABASE_SETUP.md` for configuration.
- **Server:** a minimal Express skeleton in `server/`, included so the project has a
  clear place to grow into a real backend (MongoDB, real authentication, REST API)
  later. The app works fully without starting the server.

## Project structure

\```
SpendWise/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                    entry point
│       ├── App.jsx                     app shell, routing, state actions
│       ├── auth.jsx                    login, signup, forgot password, onboarding
│       ├── components.jsx              icons, toast, modal, confirm dialog, etc.
│       ├── data.js                     Supabase data access, calculations, demo data
│       ├── pages_dashboard.jsx         Dashboard + Transactions
│       ├── pages_budgets_goals.jsx     Budgets + Goals
│       ├── pages_analytics.jsx         Analytics + Calendar + Notifications
│       ├── pages_profile_settings.jsx  Profile + Settings
│       └── styles.css                  full design system
├── server/
│   ├── package.json
│   └── server.js
└── README.md
\```

## Getting started

Install dependencies for the client:

\```bash
cd SpendWise/client
npm install
\```

Start the dev server:

\```bash
npm run dev
\```

Open the URL Vite prints (typically `http://localhost:5173`).

The `server/` folder is optional right now — the client doesn't call it for anything.
If you want it running anyway:

\```bash
cd SpendWise/server
npm install
npm run dev
\```

## How to try it out

1. On first load you'll see the sign-up screen. Create an account with your name,
   email and password (8+ characters). Supabase Auth handles the account securely.
2. Complete the short onboarding: your name, starting balance, monthly income,
   currency, and main goal.
3. You'll land on an empty Dashboard. From here you can:
   - Add transactions (Dashboard or Transactions page)
   - Create budgets — an overall monthly budget and/or per-category budgets
   - Create goals and track progress
   - Check Analytics for charts by day/week/month/year or a custom range
   - Browse the Calendar to see activity by date
   - Watch Notifications populate automatically as budgets near or exceed limits
   - Export transactions to CSV from Settings
   - Toggle light/dark mode from Settings (it's remembered)
4. To see the app fully populated instead of building data by hand, go to
   **Settings → Load demo data**. This adds several months of realistic sample
   transactions, budgets and goals — it's clearly a separate, explicit action, never
   loaded automatically.

## Notes on what's real vs. what's a placeholder

- All calculations (balance, savings rate, budget usage, goal progress, analytics)
  are computed from your actual stored data — nothing is hard-coded.
- Login/signup, Google OAuth, password reset, and password changes use Supabase Auth.
- Profile, transactions, and budgets use the existing Supabase tables and their RLS policies.
- Goals, settings, notification read/dismiss state, and feedback are session-only because
  the supplied schema has no corresponding tables/columns.
- Transaction payment method and notes are preserved by encoding their extra metadata
  inside the existing `transactions.description` field; no schema change is made.
- The `server/` folder remains an unused Express skeleton and is not part of the Supabase data path.

## Troubleshooting

- **Blank page / errors after `npm run dev`:** delete `node_modules` and
  `package-lock.json` in `client/` and run `npm install` again.
- **Supabase errors:** check `client/.env`, especially `VITE_SUPABASE_ANON_KEY`,
  then run `npm install` and restart Vite. Also verify the app URL is allowed in
  Supabase Authentication → URL Configuration.