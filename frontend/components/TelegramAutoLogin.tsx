"use client";

// ─── TelegramAutoLogin ────────────────────────────────────────────────────────
// Mounted at layout level (SSR-disabled). When the app opens inside a Telegram
// Mini App this automatically:
//   1. Calls WebApp.ready()  → removes the Telegram loading spinner
//   2. Calls WebApp.expand() → forces full-screen viewport
//   3. Reads ?telegramAuthToken= from the URL (injected by the bot's /start JWT)
//   4. Calls telegramSignIn({ authToken }) once the Dynamic SDK has loaded
//
// The bot signs the JWT with the bot token (HS256) and embeds it in the mini
// app URL so Dynamic can verify it server-side without any user interaction.

import { useEffect, useRef } from "react";
import { useDynamicContext, useTelegramLogin } from "@dynamic-labs/sdk-react-core";

type TelegramWebApp = {
  initData?: string;
  ready?:    () => void;
  expand?:   () => void;
};

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

function getTelegramAuthTokenFromUrl(): string | null {
  try {
    return new URL(globalThis.location.href).searchParams.get("telegramAuthToken");
  } catch {
    return null;
  }
}

export function TelegramAutoLogin() {
  const { user, sdkHasLoaded }  = useDynamicContext();
  const { telegramSignIn }       = useTelegramLogin();
  const attempted                = useRef(false);

  useEffect(() => {
    const twa = (globalThis as unknown as TelegramWindow).Telegram?.WebApp;
    const urlToken = getTelegramAuthTokenFromUrl();

    // Detect TMA: Telegram SDK present, auth token in URL, or session flag set.
    // Don't rely solely on initData — the SDK script may load after React hydration.
    const isTMA =
      Boolean(twa?.initData) ||
      Boolean(urlToken) ||
      sessionStorage.getItem("dynamicTelegramAuth") === "1";

    if (!isTMA) return;

    // Signal Telegram that the app has fully loaded (removes native spinner).
    twa?.ready?.();
    // Force the viewport to full-screen height.
    twa?.expand?.();

    // Persist TMA context and token so subsequent navigations can still use them.
    sessionStorage.setItem("dynamicTelegramAuth", "1");
    if (urlToken) sessionStorage.setItem("telegramAuthToken", urlToken);

    // Already authenticated — skip sign-in.
    if (user) return;

    // Wait for Dynamic SDK to finish initialising before calling auth.
    if (!sdkHasLoaded) return;

    // Prefer the URL token; fall back to the one stored in sessionStorage.
    const authToken = urlToken ?? sessionStorage.getItem("telegramAuthToken");
    if (!authToken) {
      console.warn("[TMA] No telegramAuthToken available — skipping auto sign-in.");
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    telegramSignIn({ forceCreateUser: true, authToken })
      .catch((err: unknown) => {
        console.error("[TMA] Auto sign-in failed:", err);
        attempted.current = false; // allow one retry
      });
  }, [user, sdkHasLoaded, telegramSignIn]);

  return null;
}
