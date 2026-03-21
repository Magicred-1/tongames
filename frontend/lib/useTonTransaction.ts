"use client";

// ─── useTonTransaction ────────────────────────────────────────────────────────
// Watches state.pendingTx from the GameSocket context and automatically sends
// the transaction through the player's Dynamic-managed TON wallet.
//
// Flow:
//   Server → TX_REQUEST (operation + address + amount + boc)
//     → hook picks it up → wallet popup → player signs
//       → TX_CONFIRMED sent back to server
//       → server broadcasts confirmation to room

import { useEffect, useRef } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isTonWallet }       from "@dynamic-labs/ton";
import type { CHAIN, TonWalletConnector, SendTransactionRequest } from "@dynamic-labs/ton";
import { useGameSocket }     from "@/lib/gameSocket";

// Derive TON chain id from env var: "testnet" → -3, anything else → -239 (mainnet)
const TON_CHAIN = (
  process.env.NEXT_PUBLIC_TON_NETWORK === "testnet" ? "-3" : "-239"
) as unknown as CHAIN;

export function useTonTransaction() {
  const { state, send }  = useGameSocket();
  const { primaryWallet } = useDynamicContext();

  // Track which tx we are currently processing to avoid double-sends
  // (React Strict Mode runs effects twice in dev)
  const processingRef = useRef<string | null>(null);

  useEffect(() => {
    const pendingTx = state.pendingTx;
    if (!pendingTx) return;
    if (!primaryWallet || !isTonWallet(primaryWallet)) return;

    // Deduplicate by operation + boc fingerprint
    const txKey = `${pendingTx.operation}::${pendingTx.boc.slice(0, 20)}`;
    if (processingRef.current === txKey) return;
    processingRef.current = txKey;

    const fire = async () => {
      try {
        // Access the connector via the public getter and cast to the abstract base
        // which declares sendTransaction. The docs show primaryWallet.sendTransaction()
        // but that method is absent from TonWallet's type definition in v4.69.0.
        const connector = primaryWallet.connector as unknown as TonWalletConnector & {
          setActiveAccountAddress?: (address: string) => void;
        };
        // DynamicWaasTonConnector (WaaS wallets) requires activeAccountAddress before
        // sendTransaction; it is not populated during connect(), so we seed it here.
        // TonConnectConnector (Tonkeeper etc.) does not have this method — skip it.
        connector.setActiveAccountAddress?.(primaryWallet.address);
        const request: SendTransactionRequest = {
          validUntil: Math.floor(Date.now() / 1000) + 120, // 2 min window
          network: TON_CHAIN,
          messages: [
            {
              address: pendingTx.to,
              amount:  pendingTx.amount ?? "0",
              payload: pendingTx.boc,   // base64 BoC built by the server
            },
          ],
        };
        const txHash = await connector.sendTransaction(request);

        send("TX_CONFIRMED", {
          operation: pendingTx.operation,
          txHash:    txHash ?? null,
        });

        console.log(`[TonTx] ${pendingTx.operation} confirmed – hash: ${txHash}`);
      } catch (err) {
        console.error(`[TonTx] ${pendingTx.operation} failed:`, err);
        processingRef.current = null; // allow retry after failure
      }
    };

    fire();
  }, [state.pendingTx, primaryWallet, send]);
}
