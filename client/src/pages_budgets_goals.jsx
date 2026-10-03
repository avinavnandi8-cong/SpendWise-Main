import React, { useState } from "react";
import { Icon, ProgressBar, EmptyState, Modal, ConfirmDialog, useToast } from "./components.jsx";
import { budgetUsage, goalProgress, deadlineInfo, formatCurrency, formatDate, EXPENSE_CATEGORIES, uid } from "./data.js";
import { InfoTip } from "./infotip.jsx";

const LEVEL_TAG = {
  ok: { cls: "tag-ok", text: "On track" },
  approaching: { cls: "tag-info", text: "Approaching limit" },
  near: { cls: "tag-warning", text: "Nearly exceeded" },
  over: { cls: "tag-danger", text: "Over budget" },
};

function StatusTag({ status }) {
  const t = LEVEL_TAG[status] || LEVEL_TAG.ok;
  return <span className={`tag ${t.cls}`}>{t.text}</span>;
}

function BudgetForm({ initial, existingCategories, onSave, onCancel }) {
  const [category, setCategory] = useState(initial?.category || "Overall");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [error, setError] = useState("");

  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) => c === initial?.category || !existingCategories.includes(c)
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Enter a budget amount greater than zero.");
      return;
    }
    onSave({ id: initial?.id || uid(), category, amount: Number(amount) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label">Budget for</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!initial}>
        {!existingCategories.includes("Overall") || initial?.category === "Overall" ? (
          <option value="Overall">Overall monthly budget</option>
        ) : null}
        {availableCategories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label className="field-label">Amount</label>
      <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{initial ? "Save changes" : "Create budget"}</button>
      </div>
    </form>
  );
}

export function BudgetsPage({ state, actions }) {
  const toast = useToast();
  const usage = budgetUsage(state);
  const { profile } = state;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const existingCategories = state.budgets.map((b) => b.category);
  const hasAny = !!usage.overall || usage.categories.length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Budgets <InfoTip title="Budgets">
            <p>A budget is a spending limit for a category (or your whole month). SpendWise compares it against your actual recorded expenses — it's calculated, never a guess.</p>
            <p>Levels: <strong>on track</strong> (under 75%), <strong>approaching</strong> (75%+), <strong>nearly exceeded</strong> (90%+), <strong>over budget</strong> (100%+).</p>
          </InfoTip></h1>
          <p className="page-sub">Set spending limits and see where you stand this month.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Add budget
        </button>
      </div>

      {!hasAny ? (
        <EmptyState
          icon="budgets"
          title="No budgets yet"
          message="Create an overall monthly budget or set limits per category."
          action={<button className="btn btn-primary" onClick={() => setAdding(true)}>Create your first budget</button>}
        />
      ) : (
        <div className="budget-grid">
          {usage.overall && (
            <div className={`budget-card level-${usage.overall.status}`}>
              <div className="budget-card-head">
                <span className="budget-card-title">Overall monthly budget</span>
                <span className="row-actions">
                  <button className="icon-btn" onClick={() => setEditing(usage.overall)} aria-label="Edit"><Icon name="edit" size={15} /></button>
                  <button className="icon-btn" onClick={() => setToDelete(usage.overall)} aria-label="Delete"><Icon name="trash" size={15} /></button>
                </span>
              </div>
              <p className="budget-amounts">
                {formatCurrency(usage.overall.spent, profile.currency)} <span>/ {formatCurrency(usage.overall.amount, profile.currency)}</span>
              </p>
              <ProgressBar pct={usage.overall.pct} status={usage.overall.status} />
              <p className="budget-remaining">
                {usage.overall.remaining >= 0
                  ? `${formatCurrency(usage.overall.remaining, profile.currency)} remaining`
                  : `${formatCurrency(Math.abs(usage.overall.remaining), profile.currency)} over the limit`}
              </p>
              <div className="budget-card-foot">
                <span className="stat-label-row">
                  {Math.round(usage.overall.pct)}% used
                  <InfoTip title="Budget used" label="Explain budget used">
                    <p>You've used {formatCurrency(usage.overall.spent, profile.currency)} of a {formatCurrency(usage.overall.amount, profile.currency)} budget this month.</p>
                  </InfoTip>
                </span>
                <StatusTag status={usage.overall.status} />
              </div>
            </div>
          )}

          {usage.categories.map((c) => (
            <div className={`budget-card level-${c.status}`} key={c.id}>
              <div className="budget-card-head">
                <span className="budget-card-title">{c.category}</span>
                <span className="row-actions">
                  <button className="icon-btn" onClick={() => setEditing(c)} aria-label="Edit"><Icon name="edit" size={15} /></button>
                  <button className="icon-btn" onClick={() => setToDelete(c)} aria-label="Delete"><Icon name="trash" size={15} /></button>
                </span>
              </div>
              <p className="budget-amounts">
                {formatCurrency(c.spent, profile.currency)} <span>/ {formatCurrency(c.amount, profile.currency)}</span>
              </p>
              <ProgressBar pct={c.pct} status={c.status} />
              <p className="budget-remaining">
                {c.remaining >= 0
                  ? `${formatCurrency(c.remaining, profile.currency)} remaining`
                  : `${formatCurrency(Math.abs(c.remaining), profile.currency)} over the limit`}
              </p>
              <div className="budget-card-foot">
                <span className="stat-label-row">
                  {Math.round(c.pct)}% used
                  <InfoTip title="Budget used" label={`Explain ${c.category} budget used`}>
                    <p>You've used {formatCurrency(c.spent, profile.currency)} of a {formatCurrency(c.amount, profile.currency)} {c.category} budget this month.</p>
                  </InfoTip>
                </span>
                <StatusTag status={c.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add budget">
        <BudgetForm
          existingCategories={existingCategories}
          onCancel={() => setAdding(false)}
          onSave={(b) => {
            actions.addBudget(b);
            setAdding(false);
            toast("Budget created.");
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit budget">
        {editing && (
          <BudgetForm
            initial={editing}
            existingCategories={existingCategories}
            onCancel={() => setEditing(null)}
            onSave={(b) => {
              actions.updateBudget(b);
              setEditing(null);
              toast("Budget updated.");
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete budget?"
        message={`Remove the ${toDelete?.category === "Overall" ? "overall" : toDelete?.category} budget? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          actions.deleteBudget(toDelete.id);
          setToDelete(null);
          toast("Budget deleted.");
        }}
      />
    </div>
  );
}

function GoalForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [saved, setSaved] = useState(initial?.saved ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Give your goal a name.");
    if (!target || Number(target) <= 0) return setError("Set a target amount greater than zero.");
    if (saved !== "" && Number(saved) < 0) return setError("Saved amount can't be negative.");
    onSave({
      id: initial?.id || uid(),
      name: name.trim(),
      target: Number(target),
      saved: Number(saved) || 0,
      targetDate,
      description: description.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label">Goal name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />

      <div className="form-grid-2">
        <div>
          <label className="field-label">Target amount</label>
          <input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="field-label">Already saved</label>
          <input type="number" min="0" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" />
        </div>
      </div>

      <label className="field-label">Target date</label>
      <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />

      <label className="field-label">Description (optional)</label>
      <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this goal for?" />

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{initial ? "Save changes" : "Create goal"}</button>
      </div>
    </form>
  );
}

export function GoalsPage({ state, actions }) {
  const toast = useToast();
  const { profile, settings } = state;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const goals = state.goals.map(goalProgress);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Financial goals</h1>
          <p className="page-sub">Track progress toward the things you're saving for.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="goals"
          title="No goals yet"
          message="Create a goal to track how close you are to reaching it."
          action={<button className="btn btn-primary" onClick={() => setAdding(true)}>Create your first goal</button>}
        />
      ) : (
        <div className="goal-grid">
          {goals.map((g) => {
            const dl = deadlineInfo(g.targetDate);
            return (
              <div className={`goal-card ${g.completed ? "is-complete" : ""}`} key={g.id}>
                <div className="budget-card-head">
                  <span className="budget-card-title">{g.name}</span>
                  <span className="row-actions">
                    <button className="icon-btn" onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn" onClick={() => setToDelete(g)} aria-label={`Delete ${g.name}`}><Icon name="trash" size={15} /></button>
                  </span>
                </div>
                {g.description && <p className="goal-desc">{g.description}</p>}
                <p className="budget-amounts">
                  {formatCurrency(g.saved, profile.currency)} <span>/ {formatCurrency(g.target, profile.currency)}</span>
                </p>
                <ProgressBar pct={g.pct} status={g.completed ? "ok" : "info"} />
                <div className="budget-card-foot">
                  <span className="stat-label-row">
                    {Math.round(g.pct)}% complete
                    <InfoTip title="Progress" label={`Explain ${g.name} progress`}>
                      {g.completed ? (
                        <p>You've reached the {formatCurrency(g.target, profile.currency)} target for this goal.</p>
                      ) : (
                        <p>{formatCurrency(g.saved, profile.currency)} saved of a {formatCurrency(g.target, profile.currency)} target.</p>
                      )}
                    </InfoTip>
                  </span>
                  {g.completed ? (
                    <span className="tag tag-ok goal-done"><Icon name="check" size={12} strokeWidth={3} /> Goal completed</span>
                  ) : dl ? (
                    <span className={dl.overdue ? "deadline overdue" : "deadline"}>{dl.label}</span>
                  ) : null}
                </div>
                {!g.completed && (
                  <p className="goal-remaining">
                    {formatCurrency(g.remaining, profile.currency)} to go{g.targetDate ? ` · by ${formatDate(g.targetDate, settings.dateFormat)}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add goal">
        <GoalForm
          onCancel={() => setAdding(false)}
          onSave={(g) => {
            actions.addGoal(g);
            setAdding(false);
            toast("Goal created.");
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit goal">
        {editing && (
          <GoalForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(g) => {
              actions.updateGoal(g);
              setEditing(null);
              toast("Goal updated.");
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete goal?"
        message={`Remove "${toDelete?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          actions.deleteGoal(toDelete.id);
          setToDelete(null);
          toast("Goal deleted.");
        }}
      />
    </div>
  );
}