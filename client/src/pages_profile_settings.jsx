import React, { useRef, useState } from "react";
import { Icon, Avatar, Modal, ConfirmDialog, useToast } from "./components.jsx";
import { CURRENCIES, GOAL_KINDS, toCSV, uid } from "./data.js";
import { loadAccount, saveAccount, simpleHash } from "./auth.jsx";
import { InfoTip } from "./infotip.jsx";
import { usePwaInstall } from "./pwa.jsx";

const MAX_SHOT_BYTES = 500 * 1024; // screenshots live in localStorage, so keep them small
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB — generous for a profile photo, small enough for localStorage

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Profile — view-only by default. All edits happen inside the "Edit Account"
// modal and are only committed when the user presses Save.
// ---------------------------------------------------------------------------
function EditAccountForm({ profile, onSave, onCancel }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [currency, setCurrency] = useState(profile.currency);
  const [mainGoal, setMainGoal] = useState(profile.mainGoal);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Full name can't be empty.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), currency, mainGoal });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label">Full name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label className="field-label">Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <div className="field-label-row">
        <span className="field-label">Preferred currency</span>
        <InfoTip title="Preferred currency">
          <p>Determines how every monetary value is displayed throughout SpendWise. Existing amounts aren't converted — only the symbol/formatting changes.</p>
        </InfoTip>
      </div>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
        ))}
      </select>

      <div className="field-label-row">
        <span className="field-label">Main financial goal</span>
        <InfoTip title="Main financial goal">
          <p>Your primary financial objective right now — shown on your profile. It doesn't change any calculation.</p>
        </InfoTip>
      </div>
      <select value={mainGoal} onChange={(e) => setMainGoal(e.target.value)}>
        {GOAL_KINDS.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save changes</button>
      </div>
    </form>
  );
}

export function ProfilePage({ state, actions }) {
  const { profile } = state;
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [pendingImage, setPendingImage] = useState(null);

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAvatarError("");
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setAvatarError("Please choose a JPG or PNG image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("That image is too large — please use one under 2MB.");
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setPendingImage(dataUrl); // show a preview first; nothing is saved until confirmed
    } catch {
      setAvatarError("Couldn't read that image — please try another file.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="page-sub">Your details and financial preferences.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} /> Edit account
        </button>
      </div>

      <section className="panel narrow">
        <div className="profile-head">
          <div className="avatar-upload">
            <Avatar name={profile.name} color={profile.avatarColor} image={profile.avatarImage} size={56} />
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              aria-label="Change profile picture"
            >
              <Icon name="camera" size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
          </div>
          <div className="profile-head-text">
            <p className="profile-name">{profile.name || "Your name"}</p>
            <p className="profile-email">{profile.email || "No email set"}</p>
            <div className="profile-photo-actions">
              <button type="button" className="link-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                Change profile picture
              </button>
              {profile.avatarImage && (
                <button
                  type="button"
                  className="link-btn link-muted"
                  onClick={() => { actions.updateAvatarImage(null); toast("Profile picture removed."); }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {avatarError && <p className="form-error" role="alert">{avatarError}</p>}

        <dl className="profile-view-grid">
          <div><dt>Full name</dt><dd>{profile.name || "—"}</dd></div>
          <div><dt>Email</dt><dd>{profile.email || "—"}</dd></div>
          <div><dt>Preferred currency</dt><dd>{CURRENCIES.find((c) => c.code === profile.currency)?.symbol} {profile.currency}</dd></div>
          <div><dt>Main financial goal</dt><dd>{profile.mainGoal || "—"}</dd></div>
        </dl>
      </section>

      <Modal open={!!pendingImage} onClose={() => setPendingImage(null)} title="New profile picture" width={420}>
        <div className="photo-preview">
          <div className="photo-preview-col">
            <Avatar name={profile.name} color={profile.avatarColor} image={profile.avatarImage} size={84} />
            <span>Current</span>
          </div>
          <span className="photo-preview-arrow" aria-hidden="true">→</span>
          <div className="photo-preview-col">
            {pendingImage && <Avatar name={profile.name} image={pendingImage} size={84} />}
            <span>New</span>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setPendingImage(null)}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.updateAvatarImage(pendingImage);
              setPendingImage(null);
              toast("Profile picture updated.");
            }}
          >
            Use this photo
          </button>
        </div>
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit account">
        <EditAccountForm
          profile={profile}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            actions.updateProfile(patch);
            setEditing(false);
            toast("Profile updated.");
          }}
        />
      </Modal>
    </div>
  );
}

function ChangePasswordForm({ onDone, onCancel }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const account = loadAccount();
    if (!account) return setError("No local account was found on this device.");
    if (account.passwordHash !== simpleHash(current)) return setError("Your current password isn't correct.");
    if (next.length < 8) return setError("Use at least 8 characters for the new password.");
    if (next === current) return setError("Choose a password that's different from your current one.");
    if (next !== confirm) return setError("The new passwords don't match.");
    saveAccount({ ...account, passwordHash: simpleHash(next) });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label" htmlFor="cp-current">Current password</label>
      <input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      <label className="field-label" htmlFor="cp-new">New password</label>
      <input id="cp-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      <label className="field-label" htmlFor="cp-confirm">Confirm new password</label>
      <input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Update password</button>
      </div>
    </form>
  );
}

function InstallSpendWiseCard() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const toast = useToast();

  if (!canInstall && !installed) return null; // honest: no fake button when the browser hasn't offered one

  return (
    <section className="panel narrow">
      <h2 className="settings-group-title">App</h2>
      <div className="install-card">
        <span className="install-card-icon"><Icon name="download" size={20} /></span>
        {installed ? (
          <div className="install-card-text">
            <span className="install-card-installed"><Icon name="check" size={15} strokeWidth={2.4} /> SpendWise is installed</span>
          </div>
        ) : (
          <>
            <div className="install-card-text">
              <strong>Install SpendWise</strong>
              <span>Get a faster, app-like way to access your finances.</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                const outcome = await promptInstall();
                if (outcome === "accepted") toast("Installing SpendWise…");
              }}
            >
              Install app
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function SettingsPage({ state, actions, onLogout }) {
  const { settings, profile } = state;
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const hasDemoData =
    state.transactions.some((t) => t.isDemo) || state.budgets.some((b) => b.isDemo) || state.goals.some((g) => g.isDemo);

  function toggle(key) {
    actions.updateSettings({ [key]: !settings[key] });
  }

  function handleExport() {
    if (state.transactions.length === 0) {
      toast("No transactions to export yet.");
      return;
    }
    const csv = toCSV(state.transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spendwise-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Transactions exported.");
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">Preferences, notifications, and data controls.</p>
        </div>
      </div>

      <section className="panel narrow">
        <h2 className="settings-group-title">Preferences</h2>
        <div className="field-label-row">
          <span className="field-label">Date format</span>
          <InfoTip title="Date format">
            <p>Controls how dates are displayed throughout SpendWise — transactions, goals, calendar and more.</p>
          </InfoTip>
        </div>
        <select value={settings.dateFormat} onChange={(e) => actions.updateSettings({ dateFormat: e.target.value })}>
          <option value="DD MMM YYYY">DD MMM YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>

        <div className="field-label-row">
          <span className="field-label">Theme</span>
          <InfoTip title="Theme">
            <p>Switches SpendWise between light and dark appearance. Your choice is remembered on this device.</p>
          </InfoTip>
        </div>
        <div className="segmented">
          <button className={settings.theme === "light" ? "active" : ""} onClick={() => actions.updateSettings({ theme: "light" })}>
            <Icon name="sun" size={15} /> Light
          </button>
          <button className={settings.theme === "dark" ? "active" : ""} onClick={() => actions.updateSettings({ theme: "dark" })}>
            <Icon name="moon" size={15} /> Dark
          </button>
        </div>
      </section>

      <InstallSpendWiseCard />

      <section className="panel narrow">
        <h2 className="settings-group-title">Notifications</h2>
        <p className="settings-note">Choose which alerts appear in your Notification center. They're calculated from your own data — nothing is sent anywhere.</p>
        <label className="switch-row">
          <span>Budget alerts <small>Approaching, nearly exceeded and exceeded</small></span>
          <input type="checkbox" checked={settings.notifyBudget} onChange={() => toggle("notifyBudget")} />
        </label>
        <label className="switch-row">
          <span>Goal progress updates <small>Milestones and completed goals</small></span>
          <input type="checkbox" checked={settings.notifyGoals} onChange={() => toggle("notifyGoals")} />
        </label>
        <label className="switch-row">
          <span>Monthly summary <small>A recap of income and spending</small></span>
          <input type="checkbox" checked={settings.notifySummary} onChange={() => toggle("notifySummary")} />
        </label>
      </section>

      <section className="panel narrow">
        <h2 className="settings-group-title">Security</h2>
        <p className="settings-note">Your login lives only on this device. Two-factor authentication needs a real backend and isn't available yet.</p>
        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={() => setChangingPassword(true)}>
            <Icon name="lock" size={16} /> Change password
          </button>
          <button className="btn btn-ghost" onClick={onLogout}>
            <Icon name="logout" size={16} /> Log out
          </button>
        </div>
      </section>

      <section className="panel narrow">
        <h2 className="settings-group-title">Data &amp; privacy</h2>
        <p className="settings-note">Everything is stored in this browser only. Demo data is tagged so it can be cleared without touching your own entries.</p>
        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Export transactions (CSV)
          </button>
          <button className="btn btn-secondary" onClick={() => setConfirmDemo(true)}>
            <Icon name="upload" size={16} /> Load demo data
          </button>
          {hasDemoData && (
            <button className="btn btn-secondary" onClick={() => setConfirmClearDemo(true)}>
              <Icon name="close" size={16} /> Clear demo data
            </button>
          )}
          <button className="btn btn-danger-ghost" onClick={() => setConfirmClear(true)}>
            <Icon name="trash" size={16} /> Clear local data
          </button>
          <button className="btn btn-danger-ghost" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={16} /> Reset application
          </button>
        </div>
      </section>

      <HelpFeedbackSection state={state} actions={actions} />

      <Modal open={changingPassword} onClose={() => setChangingPassword(false)} title="Change password" width={420}>
        <ChangePasswordForm
          onCancel={() => setChangingPassword(false)}
          onDone={() => { setChangingPassword(false); toast("Password updated."); }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDemo}
        title="Load demo data?"
        message="This adds realistic sample transactions, budgets and goals spanning several months so you can explore SpendWise. It's tagged as demo data and can be cleared separately later, without touching anything you've entered yourself."
        confirmLabel="Load demo data"
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => {
          actions.loadDemo();
          setConfirmDemo(false);
          toast("Demo data loaded.");
        }}
      />

      <ConfirmDialog
        open={confirmClearDemo}
        title="Clear demo data?"
        message="This removes only the sample transactions, budgets and goals that were loaded as demo data. Anything you entered yourself is left untouched."
        confirmLabel="Clear demo data"
        danger
        onCancel={() => setConfirmClearDemo(false)}
        onConfirm={() => {
          actions.clearDemoData();
          setConfirmClearDemo(false);
          toast("Demo data cleared.");
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear local data?"
        message="This removes all transactions, budgets and goals — demo and real alike — but keeps your profile and login. This can't be undone."
        confirmLabel="Clear data"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          actions.clearData();
          setConfirmClear(false);
          toast("Local data cleared.");
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset SpendWise?"
        message="This signs you out and erases everything, including your profile and onboarding. This can't be undone."
        confirmLabel="Reset application"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetApp();
          setConfirmReset(false);
        }}
      />

      <p className="settings-footnote">
        {profile.name ? `Signed in as ${profile.name}` : null}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Help & Feedback — no live support behind this; entries are stored locally
// and the person gets an honest confirmation rather than a fake support flow.
// ---------------------------------------------------------------------------
const ISSUE_CATEGORIES = ["Bug", "Account", "Transactions", "Budget", "Analytics", "Other"];

function ReportIssueForm({ onSubmit }) {
  const [screenshot, setScreenshot] = useState(null); // { name, dataUrl }
  const shotRef = useRef(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [error, setError] = useState("");

  async function handleShot(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) return setError("Screenshots must be a PNG or JPG image.");
    if (file.size > MAX_SHOT_BYTES) return setError("That screenshot is over 500KB — please use a smaller one.");
    setError("");
    setScreenshot({ name: file.name, dataUrl: await readImageAsDataUrl(file) });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Add a short title and description so this is useful later.");
      return;
    }
    onSubmit({ title: title.trim(), description: description.trim(), category, screenshot });
    setScreenshot(null);
    setTitle("");
    setDescription("");
    setCategory(ISSUE_CATEGORIES[0]);
    setError("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label">Issue title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />

      <label className="field-label">Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {ISSUE_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label className="field-label">Description</label>
      <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, and what did you expect instead?" />

      <label className="field-label">Screenshot (optional)</label>
      <div className="file-row">
        <button type="button" className="btn btn-ghost" onClick={() => shotRef.current && shotRef.current.click()}>
          <Icon name="image" size={16} /> {screenshot ? "Replace" : "Attach image"}
        </button>
        {screenshot && <span className="file-name">{screenshot.name}</span>}
        {screenshot && <button type="button" className="link-btn link-muted" onClick={() => setScreenshot(null)}>Remove</button>}
        <input ref={shotRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleShot} style={{ display: "none" }} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Submit report</button>
      </div>
    </form>
  );
}

function SendFeedbackForm({ onSubmit }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Say a little about what's on your mind.");
      return;
    }
    onSubmit({ title: "Feedback", description: message.trim(), category: "Feedback" });
    setMessage("");
    setError("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-label">Your feedback</label>
      <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's working, what isn't, what you'd like to see" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Send feedback</button>
      </div>
    </form>
  );
}

function HelpFeedbackSection({ state, actions }) {
  const toast = useToast();
  const entries = state.feedback || [];
  const [tab, setTab] = useState("issue");

  function record(kind, fields) {
    actions.addFeedback({ id: uid(), kind, createdAt: Date.now(), ...fields });
    toast(kind === "issue" ? "Issue reported — thanks for flagging it." : "Feedback sent — thanks!");
  }

  return (
    <section className="panel narrow" id="help-feedback">
      <h2 className="settings-group-title">Help &amp; feedback</h2>
      <p className="settings-note">There's no live support team behind this yet — reports and feedback are saved locally on this device.</p>

      <div className="segmented">
        <button type="button" className={tab === "issue" ? "active" : ""} onClick={() => setTab("issue")}>Report an issue</button>
        <button type="button" className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}>Send feedback</button>
      </div>

      {tab === "issue" ? (
        <ReportIssueForm onSubmit={(fields) => record("issue", fields)} />
      ) : (
        <SendFeedbackForm onSubmit={(fields) => record("feedback", fields)} />
      )}

      {entries.length > 0 && (
        <>
          <h3 className="settings-subtitle">Your submissions</h3>
          <ul className="summary-list">
            {entries.slice(0, 5).map((e) => (
              <li key={e.id}>
                <span>{e.kind === "issue" ? `[${e.category}] ${e.title}${e.screenshot ? " · screenshot attached" : ""}` : "Feedback"}</span>
                <strong>{new Date(e.createdAt).toLocaleDateString()}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}