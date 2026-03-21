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

    // Not inside a Telegram Mini App — nothing to do.
    if (!twa?.initData) return;

    // Signal Telegram that the app has fully loaded (removes native spinner).
    twa.ready?.();
    // Force the viewport to full-screen height.
    twa.expand?.();

    // Remember TMA context across page navigations within the session.
    sessionStorage.setItem("dynamicTelegramAuth", "1");

    // Already authenticated — skip sign-in.
    if (user) return;

    // Wait for Dynamic SDK to finish initialising before calling auth.
    if (!sdkHasLoaded) return;

    // Read the JWT the bot injected into the URL (?telegramAuthToken=…).
    const authToken = getTelegramAuthTokenFromUrl();
    if (!authToken) {
      // Token is missing — user probably opened via the persistent menu button
      // instead of the /start command. They'll need to tap "Connect Wallet".
      console.warn("[TMA] No telegramAuthToken in URL — skipping auto sign-in.");
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
