import React, { useState } from "react";
import { Icon, BrandMark, Spinner, useToast } from "./components.jsx";
import { supabase } from "./supabase.js";
import { CURRENCIES, GOAL_KINDS } from "./data.js";

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

function accountFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    email: user.email || "",
    oauthProvider: user.app_metadata?.provider || null,
  };
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return Math.min(4, score);
}

const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"];

function PasswordField({ value, onChange, placeholder, id, autoComplete, hasError }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        className={hasError ? "has-error" : ""}
        aria-invalid={!!hasError}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={17} />
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.5 0-14 4.2-17.7 10.7Z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8.1l-6.6 5.1C9.9 39.7 16.4 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5C39.8 37 44 31.5 44 24c0-1.2-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function SocialLoginButtons() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      toast(error.message || "Couldn't start Google sign-in.", "default");
    }
  }

  function handleMicrosoft() {
    toast("Microsoft sign-in can be configured later in Supabase Auth.", "default");
  }

  return (
    <>
      <button type="button" className="btn btn-social btn-block" onClick={handleGoogle} disabled={loading}>
        <GoogleMark /> {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      <button type="button" className="btn btn-social btn-block" onClick={handleMicrosoft}>
        <MicrosoftMark /> Continue with Microsoft
      </button>
      <div className="auth-divider"><span>or continue with email</span></div>
    </>
  );
}

const BRAND_POINTS = [
  "Track income and spending in one place",
  "Set budgets that actually warn you",
  "Watch your goals close in on target",
];

// Very low-opacity chart lines + dots. Pure decoration: aria-hidden, no
// interaction, drawn once on load with a slow stroke animation.
function AuthBackdrop() {
  return (
    <svg className="auth-backdrop" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="auth-grid">
        {[100, 200, 300, 400, 500, 600, 700].map((y) => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} />
        ))}
      </g>
      <path className="auth-line auth-line-a" d="M-20 610 C 80 560, 140 640, 230 540 S 380 470, 470 400 S 560 330, 640 260" />
      <path className="auth-line auth-line-b" d="M-20 690 C 90 650, 170 700, 260 630 S 400 560, 500 520 S 590 450, 640 410" />
      <path className="auth-line auth-line-c" d="M-20 520 C 60 500, 150 540, 240 470 S 360 400, 450 330 S 560 240, 640 180" />
      {[[230, 540], [470, 400], [260, 630], [500, 520], [240, 470], [450, 330]].map(([cx, cy], i) => (
        <circle key={i} className="auth-dot" cx={cx} cy={cy} r="3" style={{ "--d": `${i * 0.35}s` }} />
      ))}
    </svg>
  );
}

// Soft curved boundary between the branding panel and the form panel.
function AuthWave() {
  return (
    <svg className="auth-wave" viewBox="0 0 100 800" preserveAspectRatio="none" aria-hidden="true">
      <path className="auth-wave-back" d="M100 0 L100 800 L0 800 C 46 700, -6 610, 34 510 C 74 410, 6 320, 44 220 C 74 130, 22 60, 0 0 Z" />
      <path className="auth-wave-front" d="M100 0 L100 800 L18 800 C 52 706, 6 620, 44 528 C 80 436, 22 336, 56 236 C 84 148, 38 70, 18 0 Z" />
    </svg>
  );
}

export function AuthShell({ children, leaving }) {
  return (
    <div className={`auth-shell ${leaving ? "is-leaving" : ""}`}>
      <div className="auth-brandside">
        <AuthBackdrop />
        <div className="auth-brand-content">
          <div className="auth-brand-mark auth-stagger" style={{ "--i": 0 }}>
            <BrandMark size={38} />
            <span>SpendWise</span>
          </div>
          <p className="auth-brand-tag auth-stagger" style={{ "--i": 1 }}>
            Know where every rupee goes, and where it's headed.
          </p>
          <ul className="auth-brand-points">
            {BRAND_POINTS.map((point, i) => (
              <li key={point} className="auth-stagger" style={{ "--i": 2 + i }}>
                <Icon name="check" size={15} strokeWidth={2.4} />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <AuthWave />
      </div>
      <div className="auth-formside">
        <div className="auth-mobile-brand">
          <BrandMark size={30} />
          <span>SpendWise</span>
        </div>
        <div className="auth-card">{children}</div>
        <p className="auth-credit">Designed &amp; developed by Avinav Nandi</p>
      </div>
    </div>
  );
}

export function LoginView({ onSuccess, onGoSignup, onGoForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Enter the email you signed up with.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "That doesn't look like a valid email address.";
    if (!password) next.password = "Enter your password to continue.";
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setSubmitting(false);
      setErrors({ form: error.message || "We couldn't sign you in. Check your email and password." });
      return;
    }
    setSignedIn(true);
    setTimeout(() => onSuccess({ account: accountFromUser(data.user), remember }), 250);
  }

  return (
    <AuthShell leaving={signedIn}>
      <h1 className="auth-title auth-stagger" style={{ "--i": 2 }}>Welcome back</h1>
      <p className="auth-sub auth-stagger" style={{ "--i": 3 }}>Log in to see where your money's been.</p>

      <div className="auth-stagger" style={{ "--i": 3 }}>
        <SocialLoginButtons />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-stagger" style={{ "--i": 4 }}>
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className={errors.email ? "has-error" : ""}
            aria-invalid={!!errors.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
        </div>

        <div className="auth-stagger" style={{ "--i": 5 }}>
          <label className="field-label" htmlFor="login-password">Password</label>
          <PasswordField id="login-password" hasError={!!errors.password} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
          {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
        </div>

        <div className="auth-row auth-stagger" style={{ "--i": 6 }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </label>
          <button type="button" className="link-btn" onClick={onGoForgot}>Forgot password?</button>
        </div>

        {errors.form && <p className="form-banner" role="alert">{errors.form}</p>}

        <button
          className={`btn btn-primary btn-block btn-lg auth-stagger ${submitting ? "is-loading" : ""}`}
          style={{ "--i": 7 }}
          type="submit"
          disabled={submitting || signedIn}
        >
          {signedIn ? (<><Icon name="check" size={17} strokeWidth={2.4} /> Signed in</>) : submitting ? (<><Spinner /> Logging in…</>) : "Log in"}
        </button>
      </form>
      <p className="auth-switch auth-stagger" style={{ "--i": 8 }}>
        New to SpendWise? <button className="link-btn" onClick={onGoSignup}>Create an account</button>
      </p>
    </AuthShell>
  );
}

export function SignupView({ onSuccess, onGoLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Fill in every field to create your account.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!consent) {
      setError("You need to accept the terms to continue.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), spendwise_onboarded: false } },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message || "Couldn't create the account.");
      return;
    }
    if (data.session && data.user) {
      onSuccess({ account: accountFromUser(data.user) });
    } else {
      setError("Account created. Check your email to confirm it, then log in.");
    }
  }

  return (
    <AuthShell>
      <h1>Create your SpendWise account</h1>
      <p className="auth-sub">Set up SpendWise in under a minute.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="su-name">Full name</label>
        <input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Avinav Nandi" autoComplete="name" />

        <label className="field-label" htmlFor="su-email">Email</label>
        <input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label className="field-label" htmlFor="su-password">Password</label>
        <PasswordField id="su-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        {password && (
          <div className="strength-meter">
            <div className="strength-track">
              <div className={`strength-fill strength-${strength}`} style={{ width: `${(strength / 4) * 100}%` }} />
            </div>
            <span className="strength-label">{strengthLabel[strength]}</span>
          </div>
        )}

        <label className="field-label" htmlFor="su-confirm">Confirm password</label>
        <PasswordField id="su-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />

        <label className="checkbox-label consent-row">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to the Terms of Service and Privacy Policy.
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="auth-privacy-note">We only ask for the information needed to provide your SpendWise account.</p>
      <p className="auth-switch">
        Already have an account? <button className="link-btn" onClick={onGoLogin}>Log in</button>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordView({ onGoLogin }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      setError(error.message || "Couldn't send the reset email.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell>
      <h1>Reset your password</h1>
      <p className="auth-sub">Enter the email on your account.</p>
      {!sent ? (
        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="fp-email">Email</label>
          <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit">Send reset link</button>
        </form>
      ) : (
        <div className="notice-box">
          <p>A password reset link has been sent to <strong>{email}</strong> if the account is eligible. Open the link to choose a new password.</p>
        </div>
      )}
      <p className="auth-switch">
        <button className="link-btn" onClick={onGoLogin}>Back to log in</button>
      </p>
    </AuthShell>
  );
}

export function PasswordRecoveryView({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters for the new password.");
    if (password !== confirm) return setError("Passwords don't match.");
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message || "Couldn't update your password.");
      return;
    }
    onDone();
  }

  return (
    <AuthShell>
      <h1>Choose a new password</h1>
      <p className="auth-sub">Your reset link is valid. Set a new password for your SpendWise account.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="recovery-password">New password</label>
        <PasswordField id="recovery-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        <label className="field-label" htmlFor="recovery-confirm">Confirm new password</label>
        <PasswordField id="recovery-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? "Updating password…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}

export function OnboardingView({ initialName, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName || "");
  const [startingBalance, setStartingBalance] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [mainGoal, setMainGoal] = useState(GOAL_KINDS[0]);

  const steps = ["Your name", "Starting point", "Currency", "Main goal"];

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else
      onComplete({
        name: name.trim() || "there",
        startingBalance: Number(startingBalance) || 0,
        monthlyIncome: Number(monthlyIncome) || 0,
        currency,
        mainGoal,
      });
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  const canAdvance =
    (step === 0 && name.trim().length > 0) ||
    (step === 1) ||
    (step === 2 && currency) ||
    (step === 3 && mainGoal);

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((s, i) => (
            <div key={s} className={`onboarding-dot ${i <= step ? "active" : ""}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h2>What should we call you?</h2>
            <p className="onboarding-sub">This personalizes your dashboard.</p>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </>
        )}

        {step === 1 && (
          <>
            <h2>Where are you starting from?</h2>
            <p className="onboarding-sub">Rough numbers are fine — you can adjust these later.</p>
            <label className="field-label">Current balance</label>
            <input type="number" min="0" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder="0" />
            <label className="field-label">Typical monthly income</label>
            <input type="number" min="0" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0" />
          </>
        )}

        {step === 2 && (
          <>
            <h2>Which currency do you use?</h2>
            <div className="chip-grid">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`chip ${currency === c.code ? "chip-active" : ""}`}
                  onClick={() => setCurrency(c.code)}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>What's your main financial goal right now?</h2>
            <div className="chip-grid">
              {GOAL_KINDS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${mainGoal === g ? "chip-active" : ""}`}
                  onClick={() => setMainGoal(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="onboarding-actions">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={back}>Back</button>
          ) : (
            <span />
          )}
          <button className="btn btn-primary" onClick={next} disabled={!canAdvance}>
            {step === steps.length - 1 ? "Enter SpendWise" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { accountFromUser, getCurrentUser };