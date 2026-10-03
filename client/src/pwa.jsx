import { useCallback, useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = window.navigator && window.navigator.standalone === true; // iOS Safari's own flag
  return !!(mq || iosStandalone);
}

// Wraps the real browser beforeinstallprompt event. Returns:
//   canInstall — true only when the browser has actually offered a native
//                install prompt for this page (never guessed or assumed)
//   installed  — true when the app is already running in standalone mode
//   promptInstall() — triggers the real native prompt; resolves to the
//                     browser's own "accepted" | "dismissed" outcome
// There is no fallback UI for browsers that don't fire this event (e.g.
// iOS Safari) — showing a button that can't do anything would be dishonest.
export function usePwaInstall() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredEvent(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return "unavailable";
    deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    // The event can only be used once; whatever the outcome, it's spent.
    setDeferredEvent(null);
    return choice.outcome; // "accepted" | "dismissed"
  }, [deferredEvent]);

  return {
    canInstall: !!deferredEvent && !installed,
    installed,
    promptInstall,
  };
}