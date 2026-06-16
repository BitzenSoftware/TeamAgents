"use client";

import { useEffect } from "react";

/** Registra o service worker mínimo (habilita instalar como app). Sem cache. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
