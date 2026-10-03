import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registered only in production builds — a service worker in dev mode fights
// with Vite's own module reloading and isn't needed for local development.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability still works without this succeeding; fail quietly
      // rather than surface a console error the user can't act on.
    });
  });
}