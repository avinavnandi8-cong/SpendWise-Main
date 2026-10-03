import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Icon, EmptyState, Stat } from "./components.jsx";
import { InfoTip, InfoFormula, InfoExample } from "./infotip.jsx";
import {
  totalIncome,
  totalExpenses,
  savingsRate,
  categoryTotals,
  topCategories,
  budgetUsage,
  formatCurrency,
  formatDate,
  generateNotifications,
  monthComparison,
  generateInsights,
  transactionsInMonth,
  currentMonthKey,
} from "./data.js";

// The category pie is data, not a status indicator, so it shouldn't be all
// green — that reads as "excessive green" across the page. One accent slice
// for the top category, then a small set of calm, desaturated neutrals.
const CHART_THEMES = {
  light: {
    line: "#0F7B63", income: "#0F7B63", expense: "#C2413B", grid: "#E4E7E5", axis: "#6B7280", cursor: "#CBD5D1",
    pie: ["#0F7B63", "#6B7280", "#B08A4E", "#5C7C99", "#9C8272"], other: "#A6ACB3",
  },
  dark: {
    line: "#34D399", income: "#34D399", expense: "#F0857D", grid: "#232C36", axis: "#9CA3AF", cursor: "#334155",
    pie: ["#34D399", "#9CA3AF", "#D4A96A", "#7FA5C2", "#B99C89"], other: "#6B7280",
  },
};

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label ?? payload[0].name}</p>
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-value">{formatCurrency(p.value, currency)}</p>
      ))}
    </div>
  );
}

// Top five categories get their own slice; everything else folds into "Other".
function groupForPie(entries) {
  const top = entries.slice(0, 5);
  const restTotal = entries.slice(5).reduce((sum, e) => sum + e.value, 0);
  const otherExisting = top.findIndex((e) => e.name === "Other");
  const result = [...top];
  if (restTotal > 0) {
    if (otherExisting >= 0) result[otherExisting] = { name: "Other", value: result[otherExisting].value + restTotal };
    else result.push({ name: "Other", value: restTotal });
  }
  return result;
}

function rangeForPeriod(period) {
  const now = new Date();
  let start;
  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(2000, 0, 1);
  }
  return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
}

export function AnalyticsPage({ state }) {
  const { profile } = state;
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { start, end } =
    period === "custom" && customFrom && customTo ? { start: customFrom, end: customTo } : rangeForPeriod(period);

  const scoped = useMemo(
    () => state.transactions.filter((t) => t.date >= start && t.date <= end),
    [state.transactions, start, end]
  );

  const income = totalIncome(scoped);
  const expenses = totalExpenses(scoped);
  const rate = savingsRate(scoped);
  const catTotals = categoryTotals(scoped, "expense");
  const sortedCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  const pieData = groupForPie(sortedCats);
  const ct = CHART_THEMES[(state.settings && state.settings.theme) === "dark" ? "dark" : "light"];

  const dayTotals = useMemo(() => {
    const map = {};
    scoped.forEach((t) => {
      if (t.type !== "expense") return;
      map[t.date] = (map[t.date] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [scoped]);

  const incomeVsExpense = [
    { name: "Income", value: income },
    { name: "Expenses", value: expenses },
  ];

  const days = Math.max(1, (new Date(end) - new Date(start)) / 86400000 + 1);
  const avgDaily = expenses / days;
  const topCategory = sortedCats[0];
  const usage = budgetUsage(state);

  const usedPct = usage.overall && usage.overall.amount > 0 ? usage.overall.pct : null;

  // Financial Overview and Insights always reflect the current calendar
  // month's real data — independent of whichever period the charts below
  // are scoped to, since "your overview" means right now, not a custom range.
  const monthTx = transactionsInMonth(state.transactions, currentMonthKey());
  const overviewIncome = totalIncome(monthTx);
  const overviewExpenses = totalExpenses(monthTx);
  const overviewSaved = overviewIncome - overviewExpenses;
  const overviewRate = savingsRate(monthTx);
  const overviewTopCategory = topCategories(monthTx, "expense", 1)[0];
  const insights = generateInsights(state);
  const cmp = monthComparison(state);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-sub">A closer look at how money moves.</p>
        </div>
      </div>

      {monthTx.length > 0 && (
        <section className="panel overview-panel">
          <div className="panel-head">
            <h2>Your financial overview</h2>
            <InfoTip title="Financial overview" align="right">
              <p>A snapshot of the current calendar month — income, expenses, what's left over, and your biggest expense category — all calculated from your recorded transactions.</p>
            </InfoTip>
          </div>
          <div className="overview-grid">
            <div><span>Income</span><strong>{formatCurrency(overviewIncome, profile.currency)}</strong></div>
            <div><span>Expenses</span><strong>{formatCurrency(overviewExpenses, profile.currency)}</strong></div>
            <div><span>Saved</span><strong className={overviewSaved >= 0 ? "tone-positive" : "tone-negative"}>{formatCurrency(overviewSaved, profile.currency)}</strong></div>
            <div><span>Savings rate</span><strong>{overviewRate.toFixed(0)}%</strong></div>
            {overviewTopCategory && (
              <div><span>Largest spending category</span><strong>{overviewTopCategory.category}</strong></div>
            )}
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Spending insights</h2>
            <InfoTip title="Spending insights" align="right">
              <p>These are plain calculations on your own data — not AI. Each one only appears when there's enough recorded activity to support it.</p>
            </InfoTip>
          </div>
          <ul className="insight-list">
            {insights.map((text, i) => (
              <li key={i}><Icon name="spark" size={15} />{text}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="segmented wrap">
        {["today", "week", "month", "year", "custom"].map((p) => (
          <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
            {p === "today" ? "Today" : p === "week" ? "This week" : p === "month" ? "This month" : p === "year" ? "This year" : "Custom"}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="toolbar">
          <div>
            <label className="field-label">From</label>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">To</label>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      <div className="stat-strip">
        <Stat label="Income" value={formatCurrency(income, profile.currency)} tone="positive" />
        <Stat label="Expenses" value={formatCurrency(expenses, profile.currency)} tone="negative" />
        <Stat
          label="Savings rate"
          value={`${rate.toFixed(0)}%`}
          info={
            <InfoTip title="Savings rate">
              <p>The share of income left over after expenses, for the period selected above.</p>
              <InfoFormula>((Income − Expenses) ÷ Income) × 100</InfoFormula>
            </InfoTip>
          }
        />
        <Stat
          label="Avg. daily spend"
          value={formatCurrency(avgDaily, profile.currency)}
          info={
            <InfoTip title="Average daily spend" align="right">
              <p>Total expenses in the selected period, divided evenly across its days.</p>
              <InfoFormula>Total Expenses ÷ Number of Days</InfoFormula>
            </InfoTip>
          }
        />
      </div>

      {scoped.length === 0 ? (
        <EmptyState icon="analytics" title="Nothing in this range" message="Try a different period, or add some transactions first." />
      ) : (
        <>
          <div className="grid-2">
            <section className="panel">
              <div className="panel-head">
                <h2>Spending over time</h2>
                <InfoTip title="Spending over time" align="right">
                  <p>Shows how your recorded expenses changed day by day over the selected period.</p>
                </InfoTip>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dayTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: ct.axis }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTooltip currency={profile.currency} />} cursor={{ stroke: ct.cursor }} />
                    <Line type="monotone" dataKey="amount" stroke={ct.line} strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Income vs expenses</h2>
                <InfoTip title="Income vs expenses" align="right">
                  <p>Compares total recorded income against total recorded expenses for the selected period.</p>
                </InfoTip>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={incomeVsExpense}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: ct.axis }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: ct.axis }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTooltip currency={profile.currency} />} cursor={{ stroke: ct.cursor }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72}>
                      <Cell fill={ct.income} />
                      <Cell fill={ct.expense} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid-2">
            <section className="panel">
              <div className="panel-head">
                <h2>Category breakdown</h2>
                <InfoTip title="Category breakdown" align="right">
                  <p>Shows how your recorded expenses in this period are distributed across spending categories. Smaller categories are grouped into "Other".</p>
                </InfoTip>
              </div>
              {pieData.length === 0 ? (
                <EmptyState icon="analytics" title="No expenses in range" />
              ) : (
                <div className="chart-box chart-with-legend">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {pieData.map((entry, i) => (
                          <Cell key={entry.name} fill={entry.name === "Other" ? ct.other : ct.pie[i % ct.pie.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip currency={profile.currency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="legend-list">
                    {pieData.map((entry, i) => (
                      <li key={entry.name}>
                        <span className="legend-dot" style={{ background: entry.name === "Other" ? ct.other : ct.pie[i % ct.pie.length] }} />
                        {entry.name}
                        <span className="legend-value">{formatCurrency(entry.value, profile.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head"><h2>Summary</h2></div>
              <ul className="summary-list">
                <li>
                  <span className="stat-label-row">
                    Highest spending category
                    <InfoTip title="Highest spending category" label="Explain highest spending category">
                      <p>The category with the most recorded expenses in the selected period.</p>
                    </InfoTip>
                  </span>
                  <strong>{topCategory ? topCategory.name : "—"}</strong>
                </li>
                <li><span>Total savings (all time)</span><strong>{formatCurrency(totalIncome(state.transactions) - totalExpenses(state.transactions), profile.currency)}</strong></li>
                <li><span>Overall budget usage</span><strong>{usedPct !== null ? `${Math.round(usedPct)}%` : "No budget set"}</strong></li>
                <li><span>Transactions in range</span><strong>{scoped.length}</strong></li>
              </ul>
            </section>
          </div>

          {cmp.hasPrevious && (
            <section className="panel">
              <div className="panel-head">
                <h2>Monthly comparison</h2>
                <InfoTip title="Monthly comparison" align="right">
                  <p>Compares this calendar month's recorded income, expenses and savings against last month's, so far.</p>
                </InfoTip>
              </div>
              <div className="compare-grid">
                <div className="compare-col">
                  <p className="compare-label">{cmp.previousMonth.label}</p>
                  <p className="compare-row"><span>Income</span><strong>{formatCurrency(cmp.previousMonth.income, profile.currency)}</strong></p>
                  <p className="compare-row"><span>Expenses</span><strong>{formatCurrency(cmp.previousMonth.expenses, profile.currency)}</strong></p>
                  <p className="compare-row"><span>Savings</span><strong>{formatCurrency(cmp.previousMonth.savings, profile.currency)}</strong></p>
                </div>
                <div className="compare-col compare-current">
                  <p className="compare-label">{cmp.currentMonth.label}</p>
                  <p className="compare-row"><span>Income</span><strong>{formatCurrency(cmp.currentMonth.income, profile.currency)}</strong></p>
                  <p className="compare-row"><span>Expenses</span><strong>{formatCurrency(cmp.currentMonth.expenses, profile.currency)}</strong></p>
                  <p className="compare-row"><span>Savings</span><strong>{formatCurrency(cmp.currentMonth.savings, profile.currency)}</strong></p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function CalendarPage({ state }) {
  const { profile, settings } = state;
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today.toISOString().slice(0, 10));

  const byDate = useMemo(() => {
    const map = {};
    state.transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [state.transactions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dateKey(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const selectedTx = byDate[selected] || [];
  const selectedIncome = selectedTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const selectedExpense = selectedTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Spending calendar <InfoTip title="Spending calendar">
            <p>Shows your recorded activity by date. A green dot means income was logged that day; a coral dot means an expense was logged. Select any date to see its totals.</p>
          </InfoTip></h1>
          <p className="page-sub">See what happened on any given day.</p>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="panel">
          <div className="calendar-head">
            <button className="icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
              <Icon name="chevronLeft" size={18} />
            </button>
            <h2>{monthLabel}</h2>
            <button className="icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
          <div className="calendar-grid calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} className="calendar-cell empty" />;
              const key = dateKey(d);
              const dayTx = byDate[key] || [];
              const hasIncome = dayTx.some((t) => t.type === "income");
              const hasExpense = dayTx.some((t) => t.type === "expense");
              const isSelected = key === selected;
              const isToday = key === today.toISOString().slice(0, 10);
              return (
                <button
                  key={i}
                  className={`calendar-cell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setSelected(key)}
                  aria-pressed={isSelected}
                  aria-label={`${d} ${monthLabel}${dayTx.length ? `, ${dayTx.length} transaction${dayTx.length === 1 ? "" : "s"}` : ""}`}
                >
                  {d}
                  {(hasIncome || hasExpense) && (
                    <span className="calendar-dots">
                      {hasIncome && <i className="dot-in" />}
                      {hasExpense && <i className="dot-out" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span><i className="dot-in" /> Income</span>
            <span><i className="dot-out" /> Expense</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{new Date(selected + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</h2>
              <p className="panel-sub">{new Date(selected + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="stat-strip compact">
            <Stat
              label="Income"
              value={formatCurrency(selectedIncome, profile.currency)}
              tone="positive"
              info={<InfoTip title="Daily income"><p>Total income recorded for the selected date.</p></InfoTip>}
            />
            <Stat
              label="Expenses"
              value={formatCurrency(selectedExpense, profile.currency)}
              tone="negative"
              info={<InfoTip title="Daily expenses"><p>Total expenses recorded for the selected date.</p></InfoTip>}
            />
            <Stat label="Transactions" value={selectedTx.length} />
          </div>
          {selectedTx.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing logged this day" />
          ) : (
            <ul className="tx-list">
              {selectedTx.map((t) => (
                <li key={t.id} className="tx-row">
                  <div className={`tx-dot ${t.type === "income" ? "in" : "out"}`}>
                    <Icon name={t.type === "income" ? "arrowUp" : "arrowDown"} size={14} />
                  </div>
                  <div className="tx-main">
                    <span className="tx-desc">{t.description}</span>
                    <span className="tx-meta">{t.category} · {t.method}</span>
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
    </div>
  );
}

const notificationIcon = { danger: "notifications", warning: "notifications", success: "check", info: "spark" };

export function NotificationsPage({ state, actions }) {
  const notifications = generateNotifications(state);
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Notifications <InfoTip title="Notifications">
            <p>These are deterministic alerts, not AI — each one is generated from a rule checked against your real data. A <strong>budget alert</strong> fires at 75%, 90% and 100% of a limit; a <strong>goal</strong> alert fires at 75% and 100% progress; the monthly summary recaps income and spending so far.</p>
          </InfoTip></h1>
          <p className="page-sub">
            {unread.length > 0
              ? `${unread.length} unread · generated from your actual budgets, goals and activity.`
              : "Generated from your actual budgets, goals and activity."}
          </p>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-ghost" onClick={() => actions.markAllNotificationsRead(notifications.map((n) => n.id))}>
            <Icon name="check" size={16} /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="notifications" title="You're all caught up" message="Budget alerts, goal milestones and your monthly summary will show up here." />
      ) : (
        <ul className="notif-list">
          {notifications.map((n) => (
            <li key={n.id} className={`notif-row notif-${n.type} ${n.read ? "is-read" : "is-unread"}`}>
              <div className="notif-icon"><Icon name={notificationIcon[n.type] || "notifications"} size={17} /></div>
              <button
                type="button"
                className="notif-main"
                onClick={() => !n.read && actions.markNotificationRead(n.id)}
                aria-label={`${n.title}. ${n.read ? "Read" : "Unread — press to mark as read"}`}
              >
                <span className="notif-title">{n.title}{!n.read && <i className="unread-dot" aria-hidden="true" />}</span>
                <span className="notif-message">{n.message}</span>
              </button>
              <button className="icon-btn" onClick={() => actions.dismissNotification(n.id)} aria-label={`Dismiss ${n.title}`}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}