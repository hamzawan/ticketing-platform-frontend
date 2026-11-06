"use client";

import { useEffect } from "react";

// Registers the offline-fallback service worker (public/sw.js). Production only,
// so it can't interfere with dev hot reloading.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
