import React, { createContext, useCallback, useContext, useState } from "react";

// ---------------------------------------------------------------------------
// Icons — small inline SVGs, single stroke, no icon library dependency.
// ---------------------------------------------------------------------------
const iconPaths = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  transactions: "M3 7h13M16 7l-3-3M16 7l-3 3M21 17H8m-3 0 3-3m-3 3 3 3",
  budgets: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  analytics: "M4 20V10m6 10V4m6 16v-7m6 7V8",
  goals: "M12 2a10 10 0 1 0 .001 0ZM12 7a5 5 0 1 0 .001 0ZM12 11a1 1 0 1 0 .001 0",
  calendar: "M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  notifications: "M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9",
  profile: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c1.1-3.6 4.4-6 8-6s6.9 2.4 8 6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z",
  plus: "M12 5v14M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  filter: "M4 6h16M7 12h10M10 18h4",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 4.24A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-3.1 4.2M6.1 6.1C3.6 7.8 2 10 2 10s3.5 7 10 7c1.2 0 2.3-.2 3.3-.6",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M6.4 17.6 5 19m14 0-1.4-1.4M6.4 6.4 5 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  check: "M20 6 9 17l-5-5",
  arrowUp: "M12 19V5m-6 6 6-6 6 6",
  arrowDown: "M12 5v14m6-6-6 6-6-6",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  upload: "M12 21V9m0 0-4 4m4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2",
  wallet: "M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2H5m14 0v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7m16 5h-4a2 2 0 1 0 0 4h4v-4Z",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1M6.3 17.7l2.1-2.1m7.2-7.2 2.1-2.1",
  menu: "M4 7h16M4 12h16M4 17h16",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7M12 17.2v.1",
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Zm2 0V8a4 4 0 1 1 8 0v3",
  trend: "M3 17l6-6 4 4 8-8m0 0h-5m5 0v5",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 7-5-5-4 4-2-2-6 5",
  shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z",
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 11v5 M12 8h.01",
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className = "" }) {
  const d = iconPaths[name];
  if (!d) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Accepts an optional { label, onClick } action (e.g. "Undo") shown inside
  // the toast itself; a toast with an action stays up a little longer.
  const push = useCallback((message, tone = "default", action = null) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone, action }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, action ? 5000 : 3200);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-panel" style={{ maxWidth: 400 }} onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
export function ProgressBar({ pct, status = "ok" }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill progress-${status}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function EmptyState({ icon = "wallet", title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={26} strokeWidth={1.4} />
      </div>
      <p className="empty-title">{title}</p>
      {message && <p className="empty-message">{message}</p>}
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cell — used across dashboard / analytics
// ---------------------------------------------------------------------------
export function Stat({ label, value, sub, tone, icon, info }) {
  return (
    <div className="stat">
      {icon && (
        <span className={`stat-icon ${tone ? `tone-${tone}` : ""}`}>
          <Icon name={icon} size={16} />
        </span>
      )}
      <span className="stat-label-row">
        <span className="stat-label">{label}</span>
        {info}
      </span>
      <span className={`stat-value ${tone ? `tone-${tone}` : ""}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Avatar({ name, color = "#1F7A5C", image, size }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.42) } : undefined;
  if (image) {
    return (
      <div className="avatar avatar-image" style={style}>
        <img src={image} alt={name ? `${name}'s profile photo` : "Profile photo"} />
      </div>
    );
  }
  return (
    <div className="avatar" style={{ background: color, ...style }}>
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand mark + spinner
// ---------------------------------------------------------------------------
export function BrandMark({ size = 30 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-5 4 4 9-9" />
        <path d="M15 7h6v6" />
      </svg>
    </span>
  );
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}