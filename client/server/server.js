// ---------------------------------------------------------------------------
// SpendWise server — minimal skeleton.
//
// The client app works fully on its own using localStorage. This server is
// not required to run the app today; it exists so the project has a clear
// place to grow into a real backend:
//   - connect MongoDB (e.g. with mongoose)
//   - add /api/auth routes with real password hashing (bcrypt)
//   - add /api/transactions, /api/budgets, /api/goals routes backed by a
//     database instead of localStorage
//   - protect routes with a real auth middleware (JWT or sessions)
// ---------------------------------------------------------------------------

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SpendWise server is running." });
});

// Placeholder routes — intentionally not implemented yet. Wire these up to a
// real database once the project moves past the local-storage stage.
app.use("/api/auth", (req, res) => {
  res.status(501).json({ error: "Auth API not implemented yet. The client currently handles auth locally." });
});
app.use("/api/transactions", (req, res) => {
  res.status(501).json({ error: "Transactions API not implemented yet. The client currently uses localStorage." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SpendWise server listening on http://localhost:${PORT}`);
});