"use client";

// Client Component wrapper — next/dynamic with ssr:false is only allowed
// inside Client Components, not Server Components like layout.tsx.
// This thin loader lives here so layout.tsx can import it safely.

import dynamic from "next/dynamic";

const TelegramAutoLogin = dynamic(
  () =>
    import("@/components/TelegramAutoLogin").then((m) => ({
      default: m.TelegramAutoLogin,
    })),
  { ssr: false }
);

export function TelegramAutoLoginLoader() {
  return <TelegramAutoLogin />;
}
