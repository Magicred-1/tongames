// ─── TONGAMES – deploy.js ─────────────────────────────────────────────────────
// Deploys EscrowContract first, then GameContract with the escrow address.
// Run: node scripts/deploy.js
//
// Required env vars:
//   OWNER_MNEMONIC   – 24-word owner wallet mnemonic
//   TON_API_KEY      – toncenter.com API key
//   STAKE_AMOUNT     – stake per player in nanoTON (default 1 TON)
//   MAX_PLAYERS      – max players per room (default 4)
//   TESTNET          – set to "true" for testnet

import {
  TonClient,
  WalletContractV4,
  Address,
  toNano,
  contractAddress,
  beginCell,
  storeStateInit,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import fs from "fs";
import path from "path";

const TESTNET = process.env.TESTNET === "true";
const ENDPOINT = TESTNET
  ? "https://testnet.toncenter.com/api/v2/jsonRPC"
  : "https://toncenter.com/api/v2/jsonRPC";
const STAKE_AMOUNT = BigInt(process.env.STAKE_AMOUNT || toNano("1").toString());
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS || "4");

async function deploy() {
  console.log(`[Deploy] Network: ${TESTNET ? "TESTNET" : "MAINNET"}`);

  // ── Wallet ──────────────────────────────────────────────────────────────────
  const mnemonic = process.env.OWNER_MNEMONIC.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  const client = new TonClient({ endpoint: ENDPOINT, apiKey: process.env.TON_API_KEY });
  const ownerAddr = wallet.address;

  console.log("[Deploy] Owner address:", ownerAddr.toString({ bounceable: false }));

  const walletBalance = await client.getBalance(ownerAddr);
  console.log("[Deploy] Balance:", walletBalance.toString(), "nanoTON");

  // ── Load compiled contracts ──────────────────────────────────────────────────
  const escrowCell = loadBoc("build/EscrowContract/EscrowContract.cell");
  const gameCell = loadBoc("build/GameContract/GameContract.cell");

  // ── 1. Deploy EscrowContract ─────────────────────────────────────────────────
  // The GameContract address is needed before deploying Escrow, but since both
  // are deterministic we can predict the Game address first.

  // Predict GameContract address (placeholder escrow; we'll set it properly)
  // In practice: deploy Escrow with owner, then compute Game address, then
  // re-deploy Escrow with the correct pair.  For simplicity we use a 2-step:

  // Step 1: Deploy Escrow with dummy game address = owner (will be updated)
  const escrowInitData = buildEscrowInitData(ownerAddr, ownerAddr);
  const escrowAddr = contractAddress(0, { code: escrowCell, data: escrowInitData });
  console.log("[Deploy] EscrowContract address:", escrowAddr.toString());

  // Step 2: Predict GameContract address
  const gameInitData = buildGameInitData(ownerAddr, escrowAddr, STAKE_AMOUNT, MAX_PLAYERS);
  const gameAddr = contractAddress(0, { code: gameCell, data: gameInitData });
  console.log("[Deploy] GameContract address:", gameAddr.toString());

  // Step 3: Redeploy Escrow with the real game address
  const escrowInitDataFinal = buildEscrowInitData(ownerAddr, gameAddr);
  const escrowAddrFinal = contractAddress(0, { code: escrowCell, data: escrowInitDataFinal });

  const walletContract = client.open(wallet);
  let seqno = await walletContract.getSeqno();

  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [{
      to: escrowAddrFinal,
      value: toNano("0.1"),
      init: { code: escrowCell, data: escrowInitDataFinal },
      bounce: false,
      body: beginCell().endCell(),
    }],
  });

  console.log("[Deploy] EscrowContract deployed, waiting...");
  await waitForSeqno(walletContract, seqno);

  // Step 4: Deploy GameContract
  seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [{
      to: gameAddr,
      value: toNano("0.1"),
      init: { code: gameCell, data: gameInitData },
      bounce: false,
      body: beginCell().endCell(),
    }],
  });

  console.log("[Deploy] GameContract deployed, waiting...");
  await waitForSeqno(walletContract, seqno);

  // ── Output ──────────────────────────────────────────────────────────────────
  const output = {
    network: TESTNET ? "testnet" : "mainnet",
    ownerAddress: ownerAddr.toString(),
    gameContract: gameAddr.toString(),
    escrowContract: escrowAddrFinal.toString(),
    stakeAmount: STAKE_AMOUNT.toString(),
    maxPlayers: MAX_PLAYERS,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(output, null, 2));
  console.log("\n✅ Deployment complete!");
  console.log(output);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers – match contract init() parameter encoding
// ─────────────────────────────────────────────────────────────────────────────

function buildEscrowInitData(owner, gameContract) {
  return beginCell()
    .storeAddress(owner)
    .storeAddress(gameContract)
    .storeCoins(0)          // totalPot
    .storeBit(false)        // gameFinished
    .storeBit(false)        // refunded
    .storeDict(null)        // deposits map
    .endCell();
}

function buildGameInitData(owner, escrow, stakeAmount, maxPlayers) {
  return beginCell()
    .storeAddress(owner)
    .storeAddress(escrow)
    .storeCoins(stakeAmount)
    .storeUint(maxPlayers, 8)
    .storeUint(0, 8)         // state
    .storeUint(0, 16)        // round
    .storeDict(null)         // players
    .storeDict(null)         // addrBySlot
    .storeUint(0, 8)         // playerCount
    .storeUint(0, 8)         // commitCount
    .storeUint(0, 8)         // revealCount
    .storeUint(0, 8)         // aliveCount
    .storeUint(0, 256)       // combinedEntropy
    .storeUint(0, 256)       // finalRandom
    .storeBit(false)         // winner null flag
    .endCell();
}

function loadBoc(relPath) {
  const buf = fs.readFileSync(path.resolve(relPath));
  return buf;   // @ton/ton accepts Buffer for cell
}

async function waitForSeqno(wallet, seqno, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    await sleep(3_000);
    const s = await wallet.getSeqno().catch(() => seqno);
    if (s > seqno) return;
  }
  throw new Error("Seqno did not advance – check transaction");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

deploy().catch(e => { console.error(e); process.exit(1); });