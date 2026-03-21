"use client";

// ─── TelegramAutoLogin ────────────────────────────────────────────────────────
// Mounted at layout level (SSR-disabled). When the app opens inside a Telegram
// Mini App, this automatically:
//   1. Calls WebApp.ready()  → removes the Telegram loading spinner
//   2. Calls WebApp.expand() → goes full-screen
//   3. Calls telegramSignIn  → authenticates the user without any button press
//
// If the user is already authenticated the sign-in is skipped but ready/expand
// still fire so the viewport is always correct.

import { useEffect, useRef } from "react";
import { useDynamicContext, useTelegramLogin } from "@dynamic-labs/sdk-react-core";

type TelegramWebApp = {
  initData?: string;
  ready?:    () => void;
  expand?:   () => void;
};

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

export function TelegramAutoLogin() {
  const { user }           = useDynamicContext();
  const { telegramSignIn } = useTelegramLogin();
  const attempted          = useRef(false);

  useEffect(() => {
    const twa = (window as TelegramWindow).Telegram?.WebApp;

    // Not running inside a Telegram Mini App — do nothing.
    if (!twa?.initData) return;

    // Tell Telegram the app has loaded (removes native loading spinner).
    twa.ready?.();
    // Expand viewport to full screen.
    twa.expand?.();

    // Persist a session flag so other parts of the app can detect TMA context
    // even after Telegram injects initData only once.
    sessionStorage.setItem("dynamicTelegramAuth", "1");

    // Already authenticated — no need to sign in again.
    if (user) return;

    // Guard against double-firing (React Strict Mode, HMR, etc.)
    if (attempted.current) return;
    attempted.current = true;

    telegramSignIn({ forceCreateUser: true })
      .catch((err: unknown) => {
        console.error("[TMA] Auto sign-in failed:", err);
        attempted.current = false; // allow one retry if it fails
      });
  }, [user, telegramSignIn]);

  return null;
}
