import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./components.jsx";

// A small ⓘ trigger that opens a compact popover explaining the thing next
// to it. Deliberately simple: no portal, no positioning math — it opens
// directly below its trigger and is clamped with CSS, closes on outside
// click, Escape, or its own close button. Content is passed in as children
// so every explanation can use the screen's real, current numbers rather
// than a canned example.
export function InfoTip({ title, children, align = "left", label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label || `Explain ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="info" size={13} strokeWidth={2} />
      </button>
      {open && (
        <div className={`infotip-panel align-${align}`} role="dialog" aria-label={title}>
          <div className="infotip-panel-head">
            <span>{title}</span>
            <button
              type="button"
              className="infotip-close"
              onClick={() => setOpen(false)}
              aria-label="Close explanation"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
          <div className="infotip-panel-body">{children}</div>
        </div>
      )}
    </span>
  );
}

// Small helpers so callers don't hand-write the same markup for a formula
// line or an example line in every explanation.
export function InfoFormula({ children }) {
  return <p className="infotip-formula">{children}</p>;
}

export function InfoExample({ children }) {
  return <p className="infotip-example">{children}</p>;
}