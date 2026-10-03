import { useMemo, useState } from "react";
import { Icon, Stat, ProgressBar, EmptyState, Modal, ConfirmDialog, useToast } from "./components.jsx";
import { InfoTip, InfoFormula, InfoExample } from "./infotip.jsx";
import {
  currentBalance,
  totalIncome,
  totalExpenses,
  savingsRate,
  topCategories,
  budgetUsage,
  goalProgress,
  formatCurrency,
  formatDate,
  transactionsInMonth,
  currentMonthKey,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  uid,
} from "./data.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function TransactionForm({ initial, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category || EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState(initial?.method || PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function switchType(t) {
    setType(t);
    setCategory(t === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setError("Add a short description or merchant name.");
      return;
    }
    if (!date) {
      setError("Pick a date for this transaction.");
      return;
    }
    onSave({
      id: initial?.id || uid(),
      type,
      amount: Number(amount),
      category,
      description: description.trim(),
      date,
      method,
      notes: notes.trim(),
      createdAt: initial?.createdAt || Date.now(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field-label-row">
        <span className="field-label">Transaction type</span>
        <InfoTip title="Transaction type">
          <p><strong>Expense</strong> is money you spent — it reduces your balance and counts toward spending and analytics.</p>
          <p><strong>Income</strong> is money you received — it increases your balance and counts toward total income.</p>
        </InfoTip>
      </div>
      <div className="segmented">
        <button type="button" className={type === "expense" ? "active" : ""} onClick={() => switchType("expense")}>
          Expense
        </button>
        <button type="button" className={type === "income" ? "active" : ""} onClick={() => switchType("income")}>
          Income
        </button>
      </div>

      <div className="form-grid-2">
        <div>
          <div className="field-label-row">
            <span className="field-label">Amount</span>
            <InfoTip title="Amount">
              <p>The amount of money involved in this transaction, in your profile's currency.</p>
            </InfoTip>
          </div>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="field-label-row">
        <span className="field-label">Category</span>
        <InfoTip title="Category">
          <p>Categories group your transactions so SpendWise can calculate budgets per category and break down spending in Analytics.</p>
        </InfoTip>
      </div>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label className="field-label">Description / merchant</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Farmers market" />

      <div className="field-label-row">
        <span className="field-label">Payment method</span>
        <InfoTip title="Payment method">
          <p>How the money moved — Cash, UPI, card, or bank transfer. Used for your own record-keeping; it doesn't affect any calculation.</p>
        </InfoTip>
      </div>
      <select value={method} onChange={(e) => setMethod(e.target.value)}>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <label className="field-label">Notes (optional)</label>
      <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{initial ? "Save changes" : "Add transaction"}</button>
      </div>
    </form>
  );
}

export function Dashboard({ state, actions, goTo }) {
  const { transactions, profile, settings } = state;
  const balance = currentBalance(state);
  const income = totalIncome(transactions);
  const expenses = totalExpenses(transactions);
  const rate = savingsRate(transactions);
  const top = topCategories(transactions, "expense", 4);
  const usage = budgetUsage(state);
  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const activeGoals = state.goals.slice(0, 3).map(goalProgress);
  const [showAdd, setShowAdd] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const toast = useToast();

  const monthTx = transactionsInMonth(transactions, currentMonthKey());
  const contextMessage =
    monthTx.length === 0
      ? "No activity logged yet this month — add a transaction to get started."
      : usage.overall && usage.overall.status === "over"
      ? "Your overall budget is over for this month. Worth a look at Budgets."
      : rate >= 20
      ? `You're saving ${Math.round(rate)}% of your income this month. Solid pace.`
      : "Here's how things are looking today.";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{greeting()}, {profile.name || "there"}.</h1>
          <p className="page-sub">{contextMessage}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setShowGuide(true)}>
            <Icon name="help" size={16} /> How SpendWise works
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={16} /> Add transaction
          </button>
        </div>
      </div>

      <div className="stat-strip">
        <Stat
          label="Current balance"
          icon="wallet"
          sub="Recorded income minus expenses"
          value={formatCurrency(balance, profile.currency)}
          info={
            <InfoTip title="Current balance">
              <p>The balance SpendWise has calculated from everything you've recorded here — it isn't connected to your real bank account, so it can drift if you forget to log something.</p>
              <InfoFormula>Total Income − Total Expenses</InfoFormula>
              <InfoExample>{formatCurrency(income, profile.currency)} − {formatCurrency(expenses, profile.currency)} = {formatCurrency(balance, profile.currency)}</InfoExample>
            </InfoTip>
          }
        />
        <Stat
          label="Total income"
          icon="arrowUp"
          value={formatCurrency(income, profile.currency)}
          tone="positive"
          info={
            <InfoTip title="Total income">
              <p>The sum of every transaction you've logged as <strong>Income</strong>, across all time.</p>
            </InfoTip>
          }
        />
        <Stat
          label="Total expenses"
          icon="arrowDown"
          value={formatCurrency(expenses, profile.currency)}
          tone="negative"
          info={
            <InfoTip title="Total expenses">
              <p>The sum of every transaction you've logged as <strong>Expense</strong>, across all time.</p>
            </InfoTip>
          }
        />
        <Stat
          label="Savings rate"
          icon="trend"
          value={`${rate.toFixed(0)}%`}
          sub="of total income"
          info={
            <InfoTip title="Savings rate" align="right">
              <p>The share of your recorded income left over after recorded expenses.</p>
              <InfoFormula>((Income − Expenses) ÷ Income) × 100</InfoFormula>
              {income > 0 ? (
                <InfoExample>{formatCurrency(income, profile.currency)} income, {formatCurrency(expenses, profile.currency)} expenses → {rate.toFixed(0)}%</InfoExample>
              ) : (
                <InfoExample>Shows as 0% until you record some income.</InfoExample>
              )}
            </InfoTip>
          }
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Top spending categories</h2>
            <button className="link-btn" onClick={() => goTo("analytics")}>View analytics</button>
          </div>
          {top.length === 0 ? (
            <EmptyState icon="analytics" title="No spending yet" message="Once you log expenses, your top categories show up here." action={<button className="btn btn-secondary" onClick={() => setShowAdd(true)}>Add an expense</button>} />
          ) : (
            <ul className="bar-list">
              {top.map((c) => {
                const max = top[0].amount || 1;
                return (
                  <li key={c.category}>
                    <div className="bar-list-row">
                      <span>{c.category}</span>
                      <span>{formatCurrency(c.amount, profile.currency)}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(c.amount / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Budget overview</h2>
            <button className="link-btn" onClick={() => goTo("budgets")}>Manage budgets</button>
          </div>
          {!usage.overall && usage.categories.length === 0 ? (
            <EmptyState icon="budgets" title="No budgets yet" message="Create a monthly or category budget so SpendWise can warn you before you overspend." action={<button className="btn btn-secondary" onClick={() => goTo("budgets")}>Create a budget</button>} />
          ) : (
            <div className="budget-mini-list">
              {usage.overall && (
                <div className="budget-mini">
                  <div className="bar-list-row">
                    <span>Overall monthly budget</span>
                    <span>{formatCurrency(usage.overall.spent, profile.currency)} / {formatCurrency(usage.overall.amount, profile.currency)}</span>
                  </div>
                  <ProgressBar pct={usage.overall.pct} status={usage.overall.status} />
                </div>
              )}
              {usage.categories.slice(0, 3).map((c) => (
                <div className="budget-mini" key={c.id}>
                  <div className="bar-list-row">
                    <span>{c.category}</span>
                    <span>{formatCurrency(c.spent, profile.currency)} / {formatCurrency(c.amount, profile.currency)}</span>
                  </div>
                  <ProgressBar pct={c.pct} status={c.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Goals</h2>
            <button className="link-btn" onClick={() => goTo("goals")}>View all</button>
          </div>
          {activeGoals.length === 0 ? (
            <EmptyState icon="goals" title="No goals created" message="Set a savings target and watch your progress close in on it." action={<button className="btn btn-secondary" onClick={() => goTo("goals")}>Set your first financial goal</button>} />
          ) : (
            <div className="budget-mini-list">
              {activeGoals.map((g) => (
                <div className="budget-mini" key={g.id}>
                  <div className="bar-list-row">
                    <span>{g.name}</span>
                    <span>{formatCurrency(g.saved, profile.currency)} / {formatCurrency(g.target, profile.currency)}</span>
                  </div>
                  <ProgressBar pct={g.pct} status={g.pct >= 100 ? "ok" : "info"} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <button className="link-btn" onClick={() => goTo("transactions")}>View all</button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="transactions" title="No transactions yet" message="Add your first transaction to start understanding where your money goes." action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add your first transaction</button>} />
          ) : (
            <ul className="tx-list">
              {recent.map((t) => (
                <li key={t.id} className="tx-row">
                  <div className={`tx-dot ${t.type === "income" ? "in" : "out"}`}>
                    <Icon name={t.type === "income" ? "arrowUp" : "arrowDown"} size={14} />
                  </div>
                  <div className="tx-main">
                    <span className="tx-desc">{t.description}</span>
                    <span className="tx-meta">{t.category} · {formatDate(t.date, settings.dateFormat)} · {t.method}</span>
                  </div>
                  <span className={`tx-amount ${t.type === "income" ? "in" : "out"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, profile.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add transaction">
        <TransactionForm
          onCancel={() => setShowAdd(false)}
          onSave={(tx) => {
            actions.addTransaction(tx);
            setShowAdd(false);
            toast("Transaction added successfully.");
          }}
        />
      </Modal>

      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="How SpendWise works" width={460}>
        <ol className="guide-steps">
          <li><div><strong>Add income</strong><span>Log salary, freelance work or any money coming in.</span></div></li>
          <li><div><strong>Record expenses</strong><span>Log what you spend, with a category and payment method.</span></div></li>
          <li><div><strong>See your financial overview</strong><span>Balance, income, expenses and savings rate update from those transactions — nothing is hand-entered separately.</span></div></li>
          <li><div><strong>Create budgets</strong><span>Set an overall or per-category limit so overspending gets flagged.</span></div></li>
          <li><div><strong>Track financial goals</strong><span>Set a target and watch your progress close in on it.</span></div></li>
          <li><div><strong>Understand spending in Analytics</strong><span>Charts and insights are all calculated from your own recorded data.</span></div></li>
          <li><div><strong>Monitor notifications</strong><span>SpendWise flags budget limits and goal milestones as they happen.</span></div></li>
        </ol>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => setShowGuide(false)}>Got it</button>
        </div>
      </Modal>
    </div>
  );
}

export function TransactionsPage({ state, actions }) {
  const { transactions, profile, settings } = state;
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [detail, setDetail] = useState(null);

  const allCategories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return ["all", ...Array.from(set).sort()];
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (methodFilter !== "all" && t.method !== methodFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${t.description} ${t.category} ${t.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "newest") return a.date < b.date ? 1 : -1;
      if (sortBy === "oldest") return a.date > b.date ? 1 : -1;
      if (sortBy === "highest") return b.amount - a.amount;
      if (sortBy === "lowest") return a.amount - b.amount;
      return 0;
    });
    return list;
  }, [transactions, typeFilter, categoryFilter, methodFilter, dateFrom, dateTo, query, sortBy]);

  function resetFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p className="page-sub">{filtered.length} of {transactions.length} transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Add transaction
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchant, category, notes…" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="toolbar-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
        <button className={`btn btn-ghost ${showFilters ? "btn-ghost-active" : ""}`} onClick={() => setShowFilters((v) => !v)}>
          <Icon name="filter" size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div>
            <label className="field-label">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="field-label">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All" : c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Payment method</label>
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All</option>
              {[...new Set(transactions.map((t) => t.method))].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="link-btn" onClick={resetFilters}>Clear filters</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="transactions"
          title={transactions.length === 0 ? "No transactions yet" : "No matches"}
          message={transactions.length === 0 ? "Add your first transaction to start understanding where your money goes." : "Try adjusting your search or filters."}
          action={
            transactions.length === 0 ? (
              <button className="btn btn-primary" onClick={() => setAdding(true)}>Add transaction</button>
            ) : null
          }
        />
      ) : (
        <div className="tx-table">
          <div className="tx-table-head">
            <span>Description</span>
            <span>Category</span>
            <span>Date</span>
            <span>Method</span>
            <span className="align-right">Amount</span>
            <span></span>
          </div>
          {filtered.map((t) => (
            <div className="tx-table-row" key={t.id} onClick={() => setDetail(t)}>
              <span className="tx-table-desc">
                <span className={`tx-dot small ${t.type === "income" ? "in" : "out"}`}>
                  <Icon name={t.type === "income" ? "arrowUp" : "arrowDown"} size={12} />
                </span>
                {t.description}
              </span>
              <span><span className="chip-cat">{t.category}</span></span>
              <span className="tx-date">{formatDate(t.date, settings.dateFormat)}</span>
              <span><span className="chip-method">{t.method}</span></span>
              <span className={`align-right tx-amount ${t.type === "income" ? "in" : "out"}`}>
                {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, profile.currency)}
              </span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" onClick={() => setEditing(t)} aria-label="Edit"><Icon name="edit" size={15} /></button>
                <button className="icon-btn" onClick={() => setToDelete(t)} aria-label="Delete"><Icon name="trash" size={15} /></button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add transaction">
        <TransactionForm
          onCancel={() => setAdding(false)}
          onSave={(tx) => {
            actions.addTransaction(tx);
            setAdding(false);
            toast("Transaction added successfully.");
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit transaction">
        {editing && (
          <TransactionForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(tx) => {
              actions.updateTransaction(tx);
              setEditing(null);
              toast("Transaction updated.");
            }}
          />
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Transaction details">
        {detail && (
          <div className="detail-grid">
            <div><span>Type</span><strong>{detail.type === "income" ? "Income" : "Expense"}</strong></div>
            <div><span>Amount</span><strong>{formatCurrency(detail.amount, profile.currency)}</strong></div>
            <div><span>Category</span><strong>{detail.category}</strong></div>
            <div><span>Description</span><strong>{detail.description}</strong></div>
            <div><span>Date</span><strong>{formatDate(detail.date, settings.dateFormat)}</strong></div>
            <div><span>Payment method</span><strong>{detail.method}</strong></div>
            {detail.notes && <div className="detail-full"><span>Notes</span><strong>{detail.notes}</strong></div>}
            <div className="form-actions detail-full">
              <button className="btn btn-ghost" onClick={() => { setDetail(null); setEditing(detail); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => { setDetail(null); setToDelete(detail); }}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete transaction?"
        message="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const removed = toDelete;
          actions.deleteTransaction(removed.id);
          setToDelete(null);
          toast("Transaction deleted.", "default", {
            label: "Undo",
            onClick: () => actions.addTransaction(removed),
          });
        }}
      />
    </div>
  );
}