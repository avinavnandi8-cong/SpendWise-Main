import React, { useEffect, useMemo, useState } from "react";
import { Icon, Avatar, BrandMark, Spinner, ToastProvider, useToast, ConfirmDialog } from "./components.jsx";
import { LoginView, SignupView, ForgotPasswordView, PasswordRecoveryView, OnboardingView } from "./auth.jsx";
import { Dashboard, TransactionsPage } from "./pages_dashboard.jsx";
import { BudgetsPage, GoalsPage } from "./pages_budgets_goals.jsx";
import { AnalyticsPage, CalendarPage, NotificationsPage } from "./pages_analytics.jsx";
import { ProfilePage, SettingsPage } from "./pages_profile_settings.jsx";
import { createInitialState, loadUserState, saveProfile, insertTransaction, updateTransaction, removeTransaction, insertBudget, updateBudget, removeBudget, clearUserData, buildDemoData, generateNotifications, uid } from "./data.js";
import { supabase } from "./supabase.js";

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
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }, [state.settings.theme]);

  const notificationCount = useMemo(() => generateNotifications(state).filter((n) => !n.read).length, [state]);

  const actions = useMemo(
    () => ({
      addTransaction: async (tx) => {
        try {
          const saved = await insertTransaction(state.userId, tx);
          setState((s) => ({ ...s, transactions: [saved, ...s.transactions] }));
        } catch (error) {
          console.error("SpendWise: failed to add transaction", error);
          toast(error.message || "Couldn't save that transaction.", "default");
        }
      },
      updateTransaction: async (tx) => {
        try {
          const saved = await updateTransaction(state.userId, tx);
          setState((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === tx.id ? saved : t)) }));
        } catch (error) {
          console.error("SpendWise: failed to update transaction", error);
          toast(error.message || "Couldn't update that transaction.", "default");
        }
      },
      deleteTransaction: async (id) => {
        try {
          await removeTransaction(state.userId, id);
          setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
        } catch (error) {
          console.error("SpendWise: failed to delete transaction", error);
          toast(error.message || "Couldn't delete that transaction.", "default");
        }
      },

      addBudget: async (b) => {
        try {
          const saved = await insertBudget(state.userId, b);
          setState((s) => ({ ...s, budgets: [...s.budgets, saved] }));
        } catch (error) {
          console.error("SpendWise: failed to add budget", error);
          toast(error.message || "Couldn't save that budget.", "default");
        }
      },
      updateBudget: async (b) => {
        try {
          const saved = await updateBudget(state.userId, b);
          setState((s) => ({ ...s, budgets: s.budgets.map((x) => (x.id === b.id ? saved : x)) }));
        } catch (error) {
          console.error("SpendWise: failed to update budget", error);
          toast(error.message || "Couldn't update that budget.", "default");
        }
      },
      deleteBudget: async (id) => {
        try {
          await removeBudget(state.userId, id);
          setState((s) => ({ ...s, budgets: s.budgets.filter((x) => x.id !== id) }));
        } catch (error) {
          console.error("SpendWise: failed to delete budget", error);
          toast(error.message || "Couldn't delete that budget.", "default");
        }
      },

      addGoal: (g) => setState((s) => ({ ...s, goals: [g, ...s.goals] })),
      updateGoal: (g) => setState((s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? g : x)) })),
      deleteGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== id) })),

      updateProfile: async (patch) => {
        try {
          if (patch.email !== undefined && patch.email.trim() !== state.profile.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email: patch.email.trim() });
            if (emailError) throw emailError;
          }
          const { email: _email, ...profilePatch } = patch;
          await saveProfile(state.userId, profilePatch);
          setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
          if (patch.email !== undefined && patch.email.trim() !== state.profile.email) {
            toast("Email change requested. Check your inbox if Supabase requires confirmation.");
          }
        } catch (error) {
          console.error("SpendWise: failed to update profile", error);
          toast(error.message || "Couldn't update your profile.", "default");
        }
      },
      updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      dismissNotification: (id) =>
        setState((s) => ({ ...s, dismissedNotifications: [...s.dismissedNotifications, id] })),

      markNotificationRead: (id) =>
        setState((s) => ({ ...s, readNotifications: [...new Set([...(s.readNotifications || []), id])] })),

      markAllNotificationsRead: (ids) =>
        setState((s) => ({ ...s, readNotifications: [...new Set([...(s.readNotifications || []), ...ids])] })),

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

      clearDemoData: () =>
        setState((s) => ({
          ...s,
          isDemo: false,
          transactions: s.transactions.filter((t) => !t.isDemo),
          budgets: s.budgets.filter((b) => !b.isDemo),
          goals: s.goals.filter((g) => !g.isDemo),
        })),

      clearData: async () => {
        try {
          await clearUserData(state.userId);
          setState((s) => ({ ...s, transactions: [], budgets: [], goals: [], dismissedNotifications: [], isDemo: false }));
        } catch (error) {
          console.error("SpendWise: failed to clear data", error);
          toast(error.message || "Couldn't clear your data.", "default");
        }
      },

      updateAvatarImage: async (dataUrl) => {
        try {
          await saveProfile(state.userId, { avatarImage: dataUrl });
          setState((s) => ({ ...s, profile: { ...s.profile, avatarImage: dataUrl } }));
        } catch (error) {
          console.error("SpendWise: failed to update avatar", error);
          toast(error.message || "Couldn't save the profile photo.", "default");
        }
      },

      addFeedback: (entry) => setState((s) => ({ ...s, feedback: [entry, ...(s.feedback || [])] })),

      resetApp: async () => {
        await supabase.auth.signOut();
        window.location.reload();
      },
    }),
    [setState, state.userId, toast]
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
        onConfirm={async () => {
          await supabase.auth.signOut();
          setState(createInitialState());
          setConfirmLogout(false);
        }}
      />
    </div>
  );
}

function AuthGate({ onAuthenticated }) {
  const [view, setView] = useState("login");

  if (view === "signup") {
    return (
      <SignupView
        onGoLogin={() => setView("login")}
        onSuccess={({ account }) => onAuthenticated(account?.id)}
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
      onSuccess={({ account }) => onAuthenticated(account?.id)}
    />
  );
}

export default function App() {
  const [state, setState] = useState(createInitialState);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  async function hydrateUser(user) {
    if (!user) {
      setState(createInitialState());
      setLoading(false);
      return;
    }
    try {
      const nextState = await loadUserState(user);
      setState(nextState);
    } catch (error) {
      console.error("SpendWise: failed to load Supabase data", error);
      console.error("SpendWise: Supabase load error", error.message);
      setState({ ...createInitialState(), authed: true, userId: user.id, profile: { ...createInitialState().profile, name: user.user_metadata?.full_name || user.email || "", email: user.email || "" } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) hydrateUser(session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      hydrateUser(session?.user || null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }, [state.settings.theme]);

  if (loading) {
    return <div className="auth-loading"><Spinner /></div>;
  }

  if (recoveryMode) {
    return (
      <ToastProvider>
        <PasswordRecoveryView onDone={() => setRecoveryMode(false)} />
      </ToastProvider>
    );
  }

  if (!state.authed) {
    return (
      <ToastProvider>
        <AuthGate onAuthenticated={() => {}} />
      </ToastProvider>
    );
  }

  if (!state.onboarded) {
    return (
      <ToastProvider>
        <OnboardingView
          initialName={state.profile.name}
          onComplete={async (data) => {
            try {
              await saveProfile(state.userId, data);
              await supabase.auth.updateUser({ data: { spendwise_onboarded: true } });
              setState((s) => ({
                ...s,
                onboarded: true,
                profile: { ...s.profile, ...data },
              }));
            } catch (error) {
              console.error("SpendWise: onboarding save failed", error);
            }
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
