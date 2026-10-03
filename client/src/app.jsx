import React, { useEffect, useMemo, useState } from "react";
import { Icon, Avatar, BrandMark, ToastProvider, useToast, ConfirmDialog } from "./components.jsx";
import { LoginView, SignupView, ForgotPasswordView, OnboardingView, loadAccount, saveAccount } from "./auth.jsx";
import { Dashboard, TransactionsPage } from "./pages_dashboard.jsx";
import { BudgetsPage, GoalsPage } from "./pages_budgets_goals.jsx";
import { AnalyticsPage, CalendarPage, NotificationsPage } from "./pages_analytics.jsx";
import { ProfilePage, SettingsPage } from "./pages_profile_settings.jsx";
import { loadState, saveState, clearState, buildDemoData, generateNotifications, uid } from "./data.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "transactions", label: "Transactions", icon: "transactions" },
  { key: "budgets", label: "Budgets", icon: "budgets" },
  { key: "analytics", label: "Analytics", icon: "analytics" },
  { key: "goals", label: "Goals", icon: "goals" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "notifications", label: "Notifications", icon: "notifications" },
  { key: "profile", label: "Profile", icon: "profile" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const MOBILE_NAV = ["dashboard", "transactions", "budgets", "analytics", "goals"];

function AppShell({ state, setState }) {
  const [page, setPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const toast = useToast();

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }, [state.settings.theme]);

  const notificationCount = useMemo(() => generateNotifications(state).filter((n) => !n.read).length, [state]);

  const actions = useMemo(
    () => ({
      addTransaction: (tx) => setState((s) => ({ ...s, transactions: [tx, ...s.transactions] })),
      updateTransaction: (tx) =>
        setState((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)) })),
      deleteTransaction: (id) =>
        setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),

      addBudget: (b) => setState((s) => ({ ...s, budgets: [...s.budgets, b] })),
      updateBudget: (b) => setState((s) => ({ ...s, budgets: s.budgets.map((x) => (x.id === b.id ? b : x)) })),
      deleteBudget: (id) => setState((s) => ({ ...s, budgets: s.budgets.filter((x) => x.id !== id) })),

      addGoal: (g) => setState((s) => ({ ...s, goals: [...s.goals, g] })),
      updateGoal: (g) => setState((s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? g : x)) })),
      deleteGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== id) })),

      updateProfile: (patch) => {
        // Keep the locally stored login account aligned with the profile so
        // changing your email/name doesn't lock you out of the next login.
        // (Phone number is no longer part of the login account.)
        const account = loadAccount();
        if (account) {
          const synced = { ...account };
          ["name", "email"].forEach((k) => { if (patch[k] !== undefined) synced[k] = patch[k]; });
          saveAccount(synced);
        }
        setState((s) => {
          const profile = { ...s.profile, ...patch };
          delete profile.mobile;
          return { ...s, profile };
        });
      },
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      dismissNotification: (id) =>
        setState((s) => ({ ...s, dismissedNotifications: [...s.dismissedNotifications, id] })),

      markNotificationRead: (id) =>
        setState((s) => ({ ...s, readNotifications: [...new Set([...(s.readNotifications || []), id])] })),

      markAllNotificationsRead: (ids) =>
        setState((s) => ({ ...s, readNotifications: [...new Set([...(s.readNotifications || []), ...ids])] })),

      // Loading demo data twice just tops up transactions (each generated
      // batch has fresh ids), but never duplicates demo budgets/goals if
      // some are already present — avoids doubled progress bars on repeat clicks.
      loadDemo: () =>
        setState((s) => {
          const demo = buildDemoData();
          const hasDemoBudgets = s.budgets.some((b) => b.isDemo);
          const hasDemoGoals = s.goals.some((g) => g.isDemo);
          return {
            ...s,
            isDemo: true,
            transactions: [...demo.transactions, ...s.transactions],
            budgets: hasDemoBudgets ? s.budgets : [...s.budgets, ...demo.budgets],
            goals: hasDemoGoals ? s.goals : [...s.goals, ...demo.goals],
          };
        }),

      // Removes only records tagged isDemo — anything the user entered
      // themselves is left untouched.
      clearDemoData: () =>
        setState((s) => ({
          ...s,
          isDemo: false,
          transactions: s.transactions.filter((t) => !t.isDemo),
          budgets: s.budgets.filter((b) => !b.isDemo),
          goals: s.goals.filter((g) => !g.isDemo),
        })),

      clearData: () =>
        setState((s) => ({ ...s, transactions: [], budgets: [], goals: [], dismissedNotifications: [], isDemo: false })),

      updateAvatarImage: (dataUrl) =>
        setState((s) => ({ ...s, profile: { ...s.profile, avatarImage: dataUrl } })),

      addFeedback: (entry) =>
        setState((s) => ({ ...s, feedback: [entry, ...(s.feedback || [])] })),

      resetApp: () => {
        clearState();
        window.location.reload();
      },
    }),
    [setState]
  );

  function handleLogout() {
    setConfirmLogout(true);
  }

  const activeLabel = NAV_ITEMS.find((n) => n.key === page)?.label || "";

  return (
    <div className="app-shell app-enter">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark size={28} />
          <span>SpendWise</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link ${page === item.key ? "active" : ""}`}
              onClick={() => setPage(item.key)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.key === "notifications" && notificationCount > 0 && (
                <span className="nav-badge">{notificationCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-user" onClick={() => setPage("profile")}>
            <Avatar name={state.profile.name} color={state.profile.avatarColor} image={state.profile.avatarImage} />
            <span className="sidebar-user-name">{state.profile.name || "Your account"}</span>
          </button>
          <button className="icon-btn" onClick={handleLogout} aria-label="Log out">
            <Icon name="logout" size={17} />
          </button>
        </div>
        <p className="sidebar-credit">Designed &amp; developed by Avinav Nandi</p>
      </aside>

      <div className="mobile-topbar">
        <button className="icon-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={20} />
        </button>
        <span className="mobile-topbar-title">{activeLabel}</span>
        <button className="icon-btn" onClick={() => setPage("notifications")} aria-label="Notifications">
          <Icon name="notifications" size={19} />
          {notificationCount > 0 && <span className="nav-badge dot" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-head">
              <div className="sidebar-brand"><BrandMark size={28} /><span>SpendWise</span></div>
              <button className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><Icon name="close" size={20} /></button>
            </div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`sidebar-link ${page === item.key ? "active" : ""}`}
                onClick={() => { setPage(item.key); setMobileMenuOpen(false); }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            ))}
            <button className="sidebar-link" onClick={handleLogout}>
              <Icon name="logout" size={18} /> <span>Log out</span>
            </button>
          </div>
        </div>
      )}

      <main className="main-area">
        {page === "dashboard" && <Dashboard state={state} actions={actions} goTo={setPage} />}
        {page === "transactions" && <TransactionsPage state={state} actions={actions} />}
        {page === "budgets" && <BudgetsPage state={state} actions={actions} />}
        {page === "analytics" && <AnalyticsPage state={state} actions={actions} />}
        {page === "goals" && <GoalsPage state={state} actions={actions} />}
        {page === "calendar" && <CalendarPage state={state} actions={actions} />}
        {page === "notifications" && <NotificationsPage state={state} actions={actions} />}
        {page === "profile" && <ProfilePage state={state} actions={actions} />}
        {page === "settings" && <SettingsPage state={state} actions={actions} onLogout={handleLogout} />}
      </main>

      <nav className="mobile-tabbar">
        {MOBILE_NAV.map((key) => {
          const item = NAV_ITEMS.find((n) => n.key === key);
          return (
            <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="You'll need to log back in to see your data again."
        confirmLabel="Log out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setState((s) => ({ ...s, authed: false }));
          setConfirmLogout(false);
        }}
      />
    </div>
  );
}

function AuthGate({ state, setState }) {
  const [view, setView] = useState("login");

  if (view === "signup") {
    return (
      <SignupView
        onGoLogin={() => setView("login")}
        onSuccess={({ account }) => {
          setState((s) => ({
            ...s,
            authed: true,
            profile: { ...s.profile, name: account.name, email: account.email },
          }));
        }}
      />
    );
  }
  if (view === "forgot") {
    return <ForgotPasswordView onGoLogin={() => setView("login")} />;
  }
  return (
    <LoginView
      onGoSignup={() => setView("signup")}
      onGoForgot={() => setView("forgot")}
      onSuccess={({ account }) => {
        setState((s) => ({
          ...s,
          authed: true,
          profile: { ...s.profile, name: s.profile.name || account.name, email: account.email },
        }));
      }}
    />
  );
}

export default function App() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }, []);

  if (!state.authed) {
    return (
      <ToastProvider>
        <AuthGate state={state} setState={setState} />
      </ToastProvider>
    );
  }

  if (!state.onboarded) {
    return (
      <ToastProvider>
        <OnboardingView
          initialName={state.profile.name}
          onComplete={(data) => {
            setState((s) => ({
              ...s,
              onboarded: true,
              profile: {
                ...s.profile,
                name: data.name,
                startingBalance: data.startingBalance,
                monthlyIncome: data.monthlyIncome,
                currency: data.currency,
                mainGoal: data.mainGoal,
              },
            }));
          }}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppShell state={state} setState={setState} />
    </ToastProvider>
  );
}