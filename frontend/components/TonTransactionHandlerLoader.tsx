"use client";

// Client Component wrapper — next/dynamic with ssr:false is only allowed
// inside Client Components, not Server Components like layout.tsx.
// This thin loader lives here so layout.tsx can import it safely.

import dynamic from "next/dynamic";

const TonTransactionHandler = dynamic(
  () =>
    import("@/components/TonTransactionHandler").then((m) => ({
      default: m.TonTransactionHandler,
    })),
  { ssr: false }
);

export function TonTransactionHandlerLoader() {
  return <TonTransactionHandler />;
}
