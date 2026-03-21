"use client";

// ─── TonTransactionHandler ────────────────────────────────────────────────────
// Invisible component mounted at layout level. Calls useTonTransaction() so
// every pending TX from the server is automatically handed to the player's
// TON wallet — regardless of which page they are on.

import { useTonTransaction } from "@/lib/useTonTransaction";

export function TonTransactionHandler() {
  useTonTransaction();
  return null;
}
