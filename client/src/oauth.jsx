// ---------------------------------------------------------------------------
// OAuth helpers for "Continue with Google" / "Continue with Microsoft".
//
// This project is a client-only app (no backend), so there is nowhere to
// keep an OAuth client secret safely. Both providers are wired up the way
// that's actually safe for a pure SPA:
//
//  - Google: uses Google Identity Services (GIS), a script-only client-side
//    flow that needs only a public Client ID (no secret). When
//    VITE_GOOGLE_CLIENT_ID is set, this is a REAL sign-in — Google issues a
//    signed ID token and we read the name/email out of it. That token is
//    NOT verified against Google's servers here, because there is no
//    backend to do that verification safely; this is an honest limitation
//    for a local-storage-only app, not a security claim.
//  - Microsoft: a real client-side flow needs the @azure/msal-browser
//    package, which isn't part of this project's dependencies. Rather than
//    pretend to integrate a library that isn't installed, the Microsoft
//    button clearly explains what's missing (the package *and* an Azure
//    app registration + VITE_MICROSOFT_CLIENT_ID) instead of faking a login.
//
// Neither button ever logs a person in locally without a real provider
// response.
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
const MICROSOFT_CLIENT_ID = import.meta.env?.VITE_MICROSOFT_CLIENT_ID || "";

export const googleConfigured = !!GOOGLE_CLIENT_ID;
export const microsoftConfigured = !!MICROSOFT_CLIENT_ID; // config alone isn't enough — see note above

// Decodes the payload of a JWT without verifying its signature. Fine for
// reading a display name/email out of a token we just received directly
// from Google's own script in the same page; NOT a substitute for real
// server-side verification, which this app has no backend to perform.
export function decodeJwtPayload(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json);
}

let gisScriptPromise = null;
function loadGoogleScript() {
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Couldn't load Google's sign-in script."));
      document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
}

// Triggers a real Google sign-in when configured. onCredential receives the
// decoded token payload ({ email, name, ... }). Returns a status string the
// caller can show a message for: "ok" | "unconfigured" | "error".
export async function triggerGoogleSignIn(onCredential) {
  if (!googleConfigured) return "unconfigured";
  try {
    await loadGoogleScript();
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        try {
          onCredential(decodeJwtPayload(response.credential));
        } catch {
          // If Google ever returns something we can't parse, fail quietly —
          // the person can just try again or use email/password.
        }
      },
    });
    window.google.accounts.id.prompt();
    return "ok";
  } catch {
    return "error";
  }
}