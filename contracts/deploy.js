// ─── TONGAMES – deploy.js ─────────────────────────────────────────────────────
// Compiles TACT contracts, then deploys EscrowContract + GameContract on TON.
// Run: node scripts/deploy.js
//
// Required env vars (or set in .env):
//   OWNER_MNEMONIC   – 24-word owner wallet mnemonic
//   TON_API_KEY      – toncenter.com API key
//   STAKE_AMOUNT     – stake per player in nanoTON (default 1 TON = 1000000000)
//   MAX_PLAYERS      – max players per room (default 4)
//   TESTNET          – set to "true" for testnet
//   SKIP_COMPILE     – set to "true" to skip recompilation (use existing build/)

import {
  TonClient,
  WalletContractV4,
  toNano,
  contractAddress,
  beginCell,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath }   from "node:url";
import { execSync, spawn } from "node:child_process";

loadEnvFromLocalFile();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");   // project root
const TESTNET   = process.env.TESTNET === "true";
const ENDPOINT  = TESTNET
  ? "https://testnet.toncenter.com/api/v2/jsonRPC"
  : "https://toncenter.com/api/v2/jsonRPC";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 – Compile TACT contracts
// ─────────────────────────────────────────────────────────────────────────────

async function compileContracts() {
  if (process.env.SKIP_COMPILE === "true") {
    console.log("[Compile] SKIP_COMPILE=true – skipping compilation, using existing build/");
    return;
  }

  console.log("\n━━━ Step 1/3 – Compiling TACT contracts ━━━");

  // Verify tact is available
  const tactBin = resolveTactBinary();
  console.log(`[Compile] Using tact: ${tactBin}`);

  const tactConfig = path.join(ROOT, "tact.config.json");
  if (!fs.existsSync(tactConfig)) {
    throw new Error(
      `tact.config.json not found at ${tactConfig}.\n` +
      "Make sure you are running from the project root or that tact.config.json exists."
    );
  }

  // Clean stale build artifacts so we never deploy old bytecode
  const buildDir = path.join(ROOT, "build");
  if (fs.existsSync(buildDir)) {
    console.log("[Compile] Cleaning stale build/ ...");
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  // tact --config tact.config.json
  await runCommand(tactBin, ["--config", tactConfig], ROOT);

  // Verify expected outputs
  const required = [
    "build/GameContract/GameContract.cell",
    "build/EscrowContract/EscrowContract.cell",
  ];
  for (const rel of required) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(
        `Compilation finished but artifact is missing: ${abs}\n` +
        "Check the 'output' paths in tact.config.json match these locations."
      );
    }
  }

  console.log("[Compile] ✅ All contracts compiled\n");
}

/** Resolves the tact binary: local node_modules → npx → global PATH */
function resolveTactBinary() {
  // 1. Local install (preferred – pinned version)
  const local = path.join(ROOT, "node_modules", ".bin", "tact");
  if (fs.existsSync(local)) return local;

  // 2. npx (available anywhere npm is installed)
  try {
    execSync("npx --yes tact --version", { stdio: "pipe", cwd: ROOT });
    return "npx tact";
  } catch { /* not via npx */ }

  // 3. Global install
  try {
    execSync("tact --version", { stdio: "pipe" });
    return "tact";
  } catch { /* not on PATH */ }

  throw new Error(
    "TACT compiler not found. Install it with:\n" +
    "  npm install --save-dev @tact-lang/compiler   ← recommended (local)\n" +
    "  npm install -g @tact-lang/compiler            ← global\n" +
    "Then rerun: node scripts/deploy.js"
  );
}

/** Runs a command, streaming stdout/stderr live. Rejects on non-zero exit. */
function runCommand(bin, args, cwd) {
  return new Promise((resolve, reject) => {
    const [cmd, ...rest] = bin.split(" ");
    const proc = spawn(cmd, [...rest, ...args], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    proc.on("error", err => reject(new Error(`Failed to start '${bin}': ${err.message}`)));
    proc.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(
        `'${bin} ${args.join(" ")}' exited with code ${code}.\n` +
        "Fix the TACT errors printed above, then retry."
      ));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 – Validate config & connect wallet
// ─────────────────────────────────────────────────────────────────────────────

async function deploy() {
  await compileContracts();

  console.log("━━━ Step 2/3 – Validating config & wallet ━━━");
  console.log(`[Deploy] Network: ${TESTNET ? "TESTNET" : "MAINNET"}`);

  const ownerMnemonicRaw = getRequiredEnv("OWNER_MNEMONIC");
  const tonApiKey        = getRequiredEnv("TON_API_KEY");

  const stakeAmountRaw = process.env.STAKE_AMOUNT || toNano("1").toString();
  let stakeAmount;
  try {
    stakeAmount = BigInt(stakeAmountRaw);
  } catch {
    throw new Error("Invalid STAKE_AMOUNT. Expected a nanoTON integer, e.g. 1000000000");
  }

  const maxPlayersRaw = process.env.MAX_PLAYERS || "4";
  const maxPlayers    = Number.parseInt(maxPlayersRaw, 10);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
    throw new Error("Invalid MAX_PLAYERS. Expected an integer 2–8 (contract MAX_PLAYERS cap)");
  }

  const mnemonic = ownerMnemonicRaw.trim().split(/\s+/);
  if (mnemonic.length !== 24) {
    throw new Error("Invalid OWNER_MNEMONIC. Expected 24 space-separated words");
  }

  const keyPair   = await mnemonicToPrivateKey(mnemonic);
  const wallet    = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  const client    = new TonClient({ endpoint: ENDPOINT, apiKey: tonApiKey });
  const ownerAddr = wallet.address;

  console.log("[Deploy] Owner address:", ownerAddr.toString({ bounceable: false }));

  const walletBalance = await client.getBalance(ownerAddr);
  console.log("[Deploy] Balance:", walletBalance.toString(), "nanoTON");

  if (walletBalance < toNano("0.25")) {
    throw new Error(
      `Insufficient balance. Need ≥ 0.25 TON, got ${walletBalance} nanoTON.\n` +
      `Fund this address and retry: ${ownerAddr.toString({ bounceable: false })}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 – Compute deterministic addresses + deploy
  // ─────────────────────────────────────────────────────────────────────────

  console.log("\n━━━ Step 3/3 – Deploying contracts ━━━");

  const escrowCode = loadBoc("build/EscrowContract/EscrowContract.cell");
  const gameCode   = loadBoc("build/GameContract/GameContract.cell");

  // Circular dependency resolution:
  //   Escrow needs gameAddr → Game needs escrowAddr
  // Solution: compute Escrow(owner, owner) → derive gameAddr → recompute
  //           Escrow(owner, gameAddr) → recompute gameAddr with final escrowAddr.
  const escrowInit1   = buildEscrowInitData(ownerAddr, ownerAddr);
  const escrowAddr1   = contractAddress(0, { code: escrowCode, data: escrowInit1 });

  const gameInit1     = buildGameInitData(ownerAddr, escrowAddr1, stakeAmount, maxPlayers);
  const gameAddr1     = contractAddress(0, { code: gameCode, data: gameInit1 });

  // Final pair (escrow knows the real game address)
  const escrowInitF   = buildEscrowInitData(ownerAddr, gameAddr1);
  const escrowAddrF   = contractAddress(0, { code: escrowCode, data: escrowInitF });

  const gameInitF     = buildGameInitData(ownerAddr, escrowAddrF, stakeAmount, maxPlayers);
  const gameAddrF     = contractAddress(0, { code: gameCode, data: gameInitF });

  console.log("[Deploy] EscrowContract →", escrowAddrF.toString());
  console.log("[Deploy] GameContract   →", gameAddrF.toString());

  const walletContract = client.open(wallet);

  // ── 3a. Deploy EscrowContract ─────────────────────────────────────────────
  let seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [{
      to:     escrowAddrF,
      value:  toNano("0.1"),
      init:   { code: escrowCode, data: escrowInitF },
      bounce: false,
      body:   beginCell().endCell(),
    }],
  });
  console.log("[Deploy] EscrowContract tx sent – waiting for confirmation...");
  await waitForSeqno(walletContract, seqno);
  console.log("[Deploy] ✅ EscrowContract confirmed");

  // ── 3b. Deploy GameContract ───────────────────────────────────────────────
  seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [{
      to:     gameAddrF,
      value:  toNano("0.1"),
      init:   { code: gameCode, data: gameInitF },
      bounce: false,
      body:   beginCell().endCell(),
    }],
  });
  console.log("[Deploy] GameContract tx sent – waiting for confirmation...");
  await waitForSeqno(walletContract, seqno);
  console.log("[Deploy] ✅ GameContract confirmed");

  // ── Write deployment.json ─────────────────────────────────────────────────
  const output = {
    network:        TESTNET ? "testnet" : "mainnet",
    ownerAddress:   ownerAddr.toString(),
    gameContract:   gameAddrF.toString(),
    escrowContract: escrowAddrF.toString(),
    stakeAmount:    stakeAmount.toString(),
    maxPlayers,
    deployedAt:     new Date().toISOString(),
  };

  const outPath = path.join(ROOT, "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n🎮 Deployment complete! Manifest saved to ${outPath}`);
  console.log(output);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell builders – field order must match TACT contract init() exactly
// ─────────────────────────────────────────────────────────────────────────────

function buildEscrowInitData(owner, gameContract) {
  return beginCell()
    .storeAddress(owner)
    .storeAddress(gameContract)
    .storeCoins(0)       // totalPot
    .storeBit(false)     // gameFinished
    .storeBit(false)     // refunded
    .storeDict(null)     // deposits map
    .endCell();
}

function buildGameInitData(owner, escrow, stakeAmount, maxPlayers) {
  return beginCell()
    .storeAddress(owner)
    .storeAddress(escrow)
    .storeCoins(stakeAmount)
    .storeUint(maxPlayers, 8)
    .storeUint(0, 8)      // state
    .storeUint(0, 16)     // round
    .storeDict(null)      // players
    .storeDict(null)      // addrBySlot
    .storeUint(0, 8)      // playerCount
    .storeUint(0, 8)      // commitCount
    .storeUint(0, 8)      // revealCount
    .storeUint(0, 8)      // aliveCount
    .storeUint(0, 256)    // combinedEntropy
    .storeUint(0, 256)    // finalRandom
    .storeBit(false)      // winner? null flag
    .endCell();
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact loader
// ─────────────────────────────────────────────────────────────────────────────

function loadBoc(relPath) {
  const abs = path.resolve(ROOT, relPath);
  if (fs.existsSync(abs)) return fs.readFileSync(abs);

  // Fallback: search recursively under build/
  const found = findFileRecursive(path.join(ROOT, "build"), path.basename(relPath));
  if (found) {
    console.warn(`[Deploy] Artifact at unexpected path – using: ${found}`);
    return fs.readFileSync(found);
  }

  throw new Error(
    `Missing compiled artifact: ${abs}\n` +
    "Re-run without SKIP_COMPILE=true to force recompilation."
  );
}

function findFileRecursive(rootDir, targetName) {
  if (!fs.existsSync(rootDir)) return null;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name === targetName) return full;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Env helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `Missing required env var: ${name}\n` +
      "Copy env.example → .env, fill in the values, then rerun."
    );
  }
  return value;
}

function loadEnvFromLocalFile() {
  const candidates = [
    path.resolve(".env"),
    path.join(__dirname, ".env"),
    path.join(ROOT, ".env"),
  ];
  const seen = new Set();
  for (const p of candidates) {
    if (!seen.has(p)) { seen.add(p); loadEnvFile(p); }
  }
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    const rawValue = line.slice(eqIndex + 1).trim();
    let value;
    if (rawValue.startsWith('"')) {
      const end = rawValue.indexOf('"', 1);
      value = end > 0 ? rawValue.slice(1, end) : rawValue.slice(1);
    } else if (rawValue.startsWith("'")) {
      const end = rawValue.indexOf("'", 1);
      value = end > 0 ? rawValue.slice(1, end) : rawValue.slice(1);
    } else {
      value = rawValue.split("#")[0].trim();
    }
    process.env[key] = value;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seqno polling
// ─────────────────────────────────────────────────────────────────────────────

async function waitForSeqno(wallet, seqno, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    await sleep(3_000);
    const s = await wallet.getSeqno().catch(() => seqno);
    if (s > seqno) return;
  }
  throw new Error("Transaction not confirmed after 90 s. Check your TON explorer and retry.");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
await deploy();