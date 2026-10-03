# SpendWise

A modern personal-finance web app: track income and expenses, manage budgets, set
goals, and understand spending habits — built as a college portfolio project.

Designed & developed by **Avinav Nandi**.

## Stack

- **Client:** React + Vite, plain CSS (no UI framework), Recharts for charts. All
  data lives in the browser's `localStorage` for now — no backend required to run it.
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
│       ├── data.js                     localStorage, calculations, demo data
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

1. On first load you'll see the sign-up screen. Create an account with any name,
   email, mobile number and password (8+ characters). This is stored locally in
   your browser, not on a server.
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
- Login/signup are real client-side operations against a locally stored account —
  there's no backend yet, so nothing is fake-succeeding; forgot-password clearly
  says email delivery isn't connected yet rather than pretending to send anything.
  Password hashing here is a simple non-cryptographic stand-in — a real backend
  should use bcrypt or argon2.
- Data persists in `localStorage` under your browser profile. Clearing your
  browser's site data, or using "Reset application" in Settings, will remove it.
- The `server/` folder is a starting skeleton only — its API routes return
  "not implemented" placeholders on purpose, marking exactly where a real backend
  (MongoDB + Express + real auth) would plug in.

## Troubleshooting

- **Blank page / errors after `npm run dev`:** delete `node_modules` and
  `package-lock.json` in `client/` and run `npm install` again.
- **Data seems to have disappeared:** check you're opening the app in the same
  browser and not in a private/incognito window, which doesn't persist storage
  between sessions.