// ---------------------------------------------------------------------------
// SpendWise data layer
// Supabase-backed persistence. Derived calculations remain client-side.
// ---------------------------------------------------------------------------

import { supabase } from "./supabase.js";

export const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Subscriptions",
  "Personal",
  "Other",
];

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Allowance",
  "Gift",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Debit Card",
  "Credit Card",
  "Bank Transfer",
  "Other",
];

export const GOAL_KINDS = [
  "Save money",
  "Build emergency fund",
  "Reduce spending",
  "Buy something",
  "Travel",
  "Education",
  "Other",
];

export const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function defaultState() {
  return {
    onboarded: false,
    authed: false,
    isDemo: false,
    userId: null,
    profile: {
      name: "",
      email: "",
      currency: "INR",
      startingBalance: 0,
      monthlyIncome: 0,
      mainGoal: "Save money",
      avatarColor: "#1F7A5C",
      avatarImage: null,
    },
    settings: {
      theme: "light",
      dateFormat: "DD MMM YYYY",
      notifyBudget: true,
      notifyGoals: true,
      notifySummary: true,
    },
    transactions: [],
    budgets: [],
    goals: [],
    dismissedNotifications: [],
    readNotifications: [],
    feedback: [],
    lastLogin: null,
  };
}

export function createInitialState() {
  return defaultState();
}

function encodeTransactionDescription(tx) {
  const meta = { method: tx.method || PAYMENT_METHODS[0], notes: tx.notes || "" };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
  return `__SPENDWISE_META__${encoded}__ ${tx.description || ""}`;
}

function decodeTransactionDescription(raw) {
  const value = String(raw || "");
  const prefix = "__SPENDWISE_META__";
  if (!value.startsWith(prefix)) return { description: value, method: PAYMENT_METHODS[0], notes: "" };
  const marker = value.indexOf("__ ", prefix.length);
  if (marker < 0) return { description: value, method: PAYMENT_METHODS[0], notes: "" };
  try {
    const encoded = value.slice(prefix.length, marker);
    const meta = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    return {
      description: value.slice(marker + 3),
      method: meta.method || PAYMENT_METHODS[0],
      notes: meta.notes || "",
    };
  } catch {
    return { description: value, method: PAYMENT_METHODS[0], notes: "" };
  }
}

function mapTransaction(row) {
  const extra = decodeTransactionDescription(row.description);
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category || "Other",
    description: extra.description,
    date: row.transaction_date,
    method: extra.method,
    notes: extra.notes,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapProfile(row, user) {
  return {
    name: row?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    email: user.email || "",
    currency: row?.preferred_currency || "INR",
    startingBalance: Number(row?.starting_balance || 0),
    monthlyIncome: Number(row?.usual_monthly_income || 0),
    mainGoal: row?.financial_goal || "Save money",
    avatarColor: "#1F7A5C",
    avatarImage: row?.avatar_url || null,
  };
}

export async function ensureProfile(user) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;

  const profile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    preferred_currency: "INR",
    starting_balance: 0,
    usual_monthly_income: 0,
    financial_goal: "Save money",
  };
  const { data: created, error: insertError } = await supabase.from("profiles").insert(profile).select("*").single();
  if (insertError) throw insertError;
  return created;
}

export async function loadUserState(user) {
  const profileRow = await ensureProfile(user);
  const [txResult, budgetResult] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", user.id).gte("month_start", `${currentMonthKey()}-01`).lt("month_start", `${nextMonthKey()}-01`).order("category"),
  ]);
  if (txResult.error) throw txResult.error;
  if (budgetResult.error) throw budgetResult.error;

  return {
    ...defaultState(),
    authed: true,
    userId: user.id,
    onboarded: user.user_metadata?.spendwise_onboarded === true,
    lastLogin: Date.now(),
    profile: mapProfile(profileRow, user),
    transactions: (txResult.data || []).map(mapTransaction),
    budgets: (budgetResult.data || []).map((b) => ({ id: b.id, category: b.category, amount: Number(b.amount), monthStart: b.month_start })),
  };
}

function nextMonthKey(ym = currentMonthKey()) {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function saveProfile(userId, patch) {
  const update = {};
  if (patch.name !== undefined) update.full_name = patch.name;
  if (patch.currency !== undefined) update.preferred_currency = patch.currency;
  if (patch.startingBalance !== undefined) update.starting_balance = Number(patch.startingBalance) || 0;
  if (patch.monthlyIncome !== undefined) update.usual_monthly_income = Number(patch.monthlyIncome) || 0;
  if (patch.mainGoal !== undefined) update.financial_goal = patch.mainGoal;
  if (patch.avatarImage !== undefined) update.avatar_url = patch.avatarImage;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
}

export async function insertTransaction(userId, tx) {
  const { data, error } = await supabase.from("transactions").insert({
    user_id: userId,
    type: tx.type,
    amount: Number(tx.amount),
    category: tx.category,
    description: encodeTransactionDescription(tx),
    transaction_date: tx.date,
  }).select("*").single();
  if (error) throw error;
  return mapTransaction(data);
}

export async function updateTransaction(userId, tx) {
  const { data, error } = await supabase.from("transactions").update({
    type: tx.type,
    amount: Number(tx.amount),
    category: tx.category,
    description: encodeTransactionDescription(tx),
    transaction_date: tx.date,
  }).eq("id", tx.id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return mapTransaction(data);
}

export async function removeTransaction(userId, id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

function currentMonthStart() {
  return `${currentMonthKey()}-01`;
}

export async function insertBudget(userId, budget) {
  const { data, error } = await supabase.from("budgets").insert({
    user_id: userId,
    category: budget.category,
    amount: Number(budget.amount),
    month_start: budget.monthStart || currentMonthStart(),
  }).select("*").single();
  if (error) throw error;
  return { id: data.id, category: data.category, amount: Number(data.amount), monthStart: data.month_start };
}

export async function updateBudget(userId, budget) {
  const { data, error } = await supabase.from("budgets").update({
    category: budget.category,
    amount: Number(budget.amount),
    month_start: budget.monthStart || currentMonthStart(),
  }).eq("id", budget.id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return { id: data.id, category: data.category, amount: Number(data.amount), monthStart: data.month_start };
}

export async function removeBudget(userId, id) {
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function clearUserData(userId) {
  const [tx, budgets] = await Promise.all([
    supabase.from("transactions").delete().eq("user_id", userId),
    supabase.from("budgets").delete().eq("user_id", userId),
  ]);
  if (tx.error) throw tx.error;
  if (budgets.error) throw budgets.error;
}

export async function clearState() {
  // Kept as a compatibility no-op. User data is cleared explicitly through clearUserData.
}

export { uid };

// ---------------------------------------------------------------------------
// Calculations — everything derived, nothing hard-coded.
// ---------------------------------------------------------------------------

export function totalIncome(transactions) {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function totalExpenses(transactions) {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function currentBalance(state) {
  return (
    Number(state.profile.startingBalance || 0) +
    totalIncome(state.transactions) -
    totalExpenses(state.transactions)
  );
}

export function savingsRate(transactions) {
  const income = totalIncome(transactions);
  const expenses = totalExpenses(transactions);
  if (income <= 0) return 0;
  return Math.max(0, ((income - expenses) / income) * 100);
}

export function categoryTotals(transactions, type = "expense") {
  const totals = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
    });
  return totals;
}

export function topCategories(transactions, type = "expense", limit = 5) {
  const totals = categoryTotals(transactions, type);
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount }));
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function transactionsInMonth(transactions, ym) {
  return transactions.filter((t) => monthKey(t.date) === ym);
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function previousMonthKey(ym = currentMonthKey()) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-indexed; -2 steps back one month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Compares the current month against the previous month using only
// transactions that actually exist — returns null fields rather than NaN
// when a month has no data.
export function monthComparison(state) {
  const curYm = currentMonthKey();
  const prevYm = previousMonthKey(curYm);
  const curTx = transactionsInMonth(state.transactions, curYm);
  const prevTx = transactionsInMonth(state.transactions, prevYm);

  function summarize(tx) {
    const income = totalIncome(tx);
    const expenses = totalExpenses(tx);
    return { income, expenses, savings: income - expenses, count: tx.length };
  }

  return {
    currentMonth: { key: curYm, label: monthLabel(curYm), ...summarize(curTx) },
    previousMonth: { key: prevYm, label: monthLabel(prevYm), ...summarize(prevTx) },
    hasPrevious: prevTx.length > 0,
  };
}

function pctChange(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Transparent, deterministic insights — never fabricated, never AI. Each
// insight only appears when the underlying data genuinely supports it.
export function generateInsights(state) {
  const insights = [];
  const ym = currentMonthKey();
  const monthTx = transactionsInMonth(state.transactions, ym);
  if (monthTx.length === 0) return insights;

  const expenseTx = monthTx.filter((t) => t.type === "expense");
  const income = totalIncome(monthTx);
  const expenses = totalExpenses(monthTx);

  if (expenseTx.length > 0) {
    const top = topCategories(monthTx, "expense", 1)[0];
    if (top && expenses > 0) {
      const share = Math.round((top.amount / expenses) * 100);
      insights.push(
        `${top.category} is your highest spending category — ${formatCurrency(top.amount, state.profile.currency)} · ${share}% of expenses`
      );
    }
  }

  const cmp = monthComparison(state);
  if (cmp.hasPrevious && cmp.previousMonth.expenses > 0) {
    const change = pctChange(cmp.currentMonth.expenses, cmp.previousMonth.expenses);
    if (change !== null && Math.abs(change) >= 5) {
      insights.push(
        change > 0
          ? `Your expenses increased by ${Math.round(change)}% compared with ${cmp.previousMonth.label}.`
          : `Your expenses decreased by ${Math.round(Math.abs(change))}% compared with ${cmp.previousMonth.label}.`
      );
    }
  }

  if (income > 0 && income - expenses > 0) {
    insights.push(`You saved ${formatCurrency(income - expenses, state.profile.currency)} this month.`);
  }

  return insights;
}

// Four clear levels: normal, approaching, nearly exceeded, exceeded.
export function budgetLevel(pct) {
  if (pct >= 100) return "over";
  if (pct >= 90) return "near";
  if (pct >= 75) return "approaching";
  return "ok";
}

export function budgetUsage(state, ym = currentMonthKey()) {
  const monthTx = transactionsInMonth(state.transactions, ym).filter(
    (t) => t.type === "expense"
  );
  const catTotals = categoryTotals(monthTx, "expense");

  const overall = state.budgets.find((b) => b.category === "Overall");
  const categoryBudgets = state.budgets.filter((b) => b.category !== "Overall");

  const totalSpent = monthTx.reduce((sum, t) => sum + Number(t.amount), 0);

  const categories = categoryBudgets.map((b) => {
    const spent = catTotals[b.category] || 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return {
      ...b,
      spent,
      remaining: b.amount - spent,
      pct,
      status: budgetLevel(pct),
    };
  });

  return {
    overall: overall
      ? {
          ...overall,
          spent: totalSpent,
          remaining: overall.amount - totalSpent,
          pct: overall.amount > 0 ? (totalSpent / overall.amount) * 100 : 0,
          status: overall.amount > 0 ? budgetLevel((totalSpent / overall.amount) * 100) : "ok",
        }
      : null,
    categories,
    totalSpent,
  };
}

// Friendly deadline text; never guesses when no date is set.
export function deadlineInfo(targetDate, today = new Date()) {
  if (!targetDate) return null;
  const end = new Date(targetDate + "T00:00:00");
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end - start) / 86400000);
  if (days < 0) return { days, label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, overdue: true };
  if (days === 0) return { days, label: "Due today", overdue: false };
  if (days < 45) return { days, label: `${days} day${days === 1 ? "" : "s"} left`, overdue: false };
  return { days, label: `${Math.round(days / 30)} months left`, overdue: false };
}

export function goalProgress(goal) {
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  return {
    ...goal,
    pct,
    remaining: Math.max(0, goal.target - goal.saved),
    completed: goal.target > 0 && goal.saved >= goal.target,
  };
}

// Deterministic, rule-based notifications generated from real data. Each
// category of alert respects the matching toggle in Settings. Every item
// carries a `read` flag so the sidebar badge can count only unread ones.
export function generateNotifications(state) {
  const notifications = [];
  const settings = state.settings || {};
  const budgetAlertsOn = settings.notifyBudget !== false;
  const goalAlertsOn = settings.notifyGoals !== false;
  const summaryOn = settings.notifySummary !== false;
  const usage = budgetUsage(state);
  const read = state.readNotifications || [];

  function budgetNote(idPrefix, label, level, pct) {
    if (level === "over") {
      return { id: `${idPrefix}-over`, type: "danger", title: `${label} exceeded`, message: `${label} is at ${Math.round(pct)}% of its limit for this month.` };
    }
    if (level === "near") {
      return { id: `${idPrefix}-near`, type: "warning", title: `${label} nearly used`, message: `${Math.round(pct)}% used — only a little room left this month.` };
    }
    if (level === "approaching") {
      return { id: `${idPrefix}-approaching`, type: "info", title: `${label} approaching its limit`, message: `${Math.round(pct)}% used so far this month.` };
    }
    return null;
  }

  if (budgetAlertsOn && usage.overall) {
    const n = budgetNote("overall", "Monthly budget", usage.overall.status, usage.overall.pct);
    if (n) notifications.push(n);
  }

  if (budgetAlertsOn) {
    usage.categories.forEach((c) => {
      const n = budgetNote(`cat-${c.category}`, `${c.category} budget`, c.status, c.pct);
      if (n) notifications.push(n);
    });
  }

  if (goalAlertsOn) {
    state.goals.forEach((g) => {
      const p = goalProgress(g);
      if (p.pct >= 100) {
        notifications.push({ id: `goal-complete-${g.id}`, type: "success", title: "Goal reached", message: `You've hit your target for "${g.name}".` });
      } else if (p.pct >= 75) {
        notifications.push({ id: `goal-close-${g.id}`, type: "info", title: "Goal almost there", message: `"${g.name}" is ${Math.round(p.pct)}% complete.` });
      }
    });
  }

  const ym = currentMonthKey();
  const monthTx = transactionsInMonth(state.transactions, ym);
  if (summaryOn && monthTx.length > 0) {
    const income = totalIncome(monthTx);
    const expenses = totalExpenses(monthTx);
    const cur = state.profile ? state.profile.currency : "INR";
    notifications.push({
      id: `summary-${ym}`,
      type: "info",
      title: "Monthly financial summary",
      message: `Income ${formatCurrency(income, cur)} · Expenses ${formatCurrency(expenses, cur)} · ${monthTx.length} transactions logged.`,
    });
  }

  return notifications
    .filter((n) => !(state.dismissedNotifications || []).includes(n.id))
    .map((n) => ({ ...n, read: read.includes(n.id) }));
}

// ---------------------------------------------------------------------------
// Demo data — only ever applied when the user explicitly requests it.
// ---------------------------------------------------------------------------

export function buildDemoData() {
  const today = new Date();
  const transactions = [];
  const merchants = {
    Food: ["Green Bowl Cafe", "Farmers Market", "Corner Deli", "Sushi Nook"],
    Shopping: ["Uniform Store", "Everyday Basics", "Home Goods Co."],
    Transport: ["Metro Card", "RideShare", "Fuel Station"],
    Bills: ["Electricity Board", "Water Utility", "Internet Provider"],
    Entertainment: ["Cinema Hall", "Concert Tickets", "Streaming Night"],
    Health: ["City Pharmacy", "Wellness Clinic"],
    Education: ["Course Platform", "Bookstore"],
    Travel: ["Regional Airline", "Hillside Inn"],
    Subscriptions: ["Streaming Plus", "Cloud Storage"],
    Personal: ["Barber & Co.", "Skincare Shop"],
    Other: ["Miscellaneous"],
  };

  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    transactions.push({
      id: uid(),
      type: "income",
      amount: 55000 + Math.round(Math.random() * 4000),
      category: "Salary",
      description: "Monthly salary",
      date: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`,
      method: "Bank Transfer",
      notes: "",
      createdAt: Date.now(),
    });

    if (Math.random() > 0.5) {
      transactions.push({
        id: uid(),
        type: "income",
        amount: 3000 + Math.round(Math.random() * 6000),
        category: "Freelance",
        description: "Freelance project",
        date: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(
          10 + Math.floor(Math.random() * 10)
        ).padStart(2, "0")}`,
        method: "UPI",
        notes: "",
        createdAt: Date.now(),
      });
    }

    const txCount = 18 + Math.floor(Math.random() * 10);
    for (let i = 0; i < txCount; i++) {
      const cats = Object.keys(merchants);
      const category = cats[Math.floor(Math.random() * cats.length)];
      const options = merchants[category];
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const amount = Math.round(
        (category === "Bills" || category === "Travel" ? 800 + Math.random() * 4000 : 100 + Math.random() * 1800) * 1
      );
      transactions.push({
        id: uid(),
        type: "expense",
        amount,
        category,
        description: options[Math.floor(Math.random() * options.length)],
        date: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        method: PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)],
        notes: "",
        createdAt: Date.now(),
      });
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  const budgets = [
    { id: uid(), category: "Overall", amount: 45000 },
    { id: uid(), category: "Food", amount: 8000 },
    { id: uid(), category: "Shopping", amount: 5000 },
    { id: uid(), category: "Transport", amount: 4000 },
    { id: uid(), category: "Entertainment", amount: 3000 },
    { id: uid(), category: "Bills", amount: 6000 },
  ];

  const goals = [
    {
      id: uid(),
      name: "Emergency Fund",
      target: 100000,
      saved: 62000,
      targetDate: new Date(today.getFullYear(), today.getMonth() + 6, 1).toISOString().slice(0, 10),
      description: "Six months of essential expenses set aside.",
    },
    {
      id: uid(),
      name: "Japan Trip",
      target: 180000,
      saved: 45000,
      targetDate: new Date(today.getFullYear() + 1, 2, 1).toISOString().slice(0, 10),
      description: "Two-week trip planned for spring.",
    },
    {
      id: uid(),
      name: "New Laptop",
      target: 90000,
      saved: 90000,
      targetDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10),
      description: "For freelance design work.",
    },
  ];

  // Tag every generated record so "Clear Demo Data" can remove exactly
  // these items later without touching anything the user entered themselves.
  return {
    transactions: transactions.map((t) => ({ ...t, isDemo: true })),
    budgets: budgets.map((b) => ({ ...b, isDemo: true })),
    goals: goals.map((g) => ({ ...g, isDemo: true })),
  };
}

export function formatCurrency(amount, currencyCode = "INR") {
  const currency = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${currency.symbol}${abs.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(dateStr, format = "DD MMM YYYY") {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  if (format === "MM/DD/YYYY") return `${String(d.getMonth() + 1).padStart(2, "0")}/${day}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`;
  return `${day} ${month} ${year}`;
}

export function toCSV(transactions) {
  const header = ["Date", "Type", "Amount", "Category", "Description", "Payment Method", "Notes"];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.amount,
    t.category,
    (t.description || "").replace(/,/g, ";"),
    t.method,
    (t.notes || "").replace(/,/g, ";"),
  ]);
  return [header, ...rows].map((r) => r.join(",")).join("\n");
}