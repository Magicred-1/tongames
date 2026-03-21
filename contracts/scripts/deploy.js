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
//   WALLET_VERSION   – override wallet version: V3R1 | V3R2 | V4 | V5R1 (default: auto-detect)

import {
  Cell,
  TonClient,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
  internal,
  toNano,
  contractAddress,
  beginCell,
} from "@ton/ton";
import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import fs      from "node:fs";
import path    from "node:path";
import readline from "node:readline";
import { fileURLToPath }   from "node:url";
import { execSync, spawn } from "node:child_process";

// Must be declared before loadEnvFromLocalFile() — ESM const is not hoisted.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");

loadEnvFromLocalFile();

const TESTNET  = process.env.TESTNET === "true";
const ENDPOINT = TESTNET
  ? "https://testnet.toncenter.com/api/v2/jsonRPC"
  : "https://toncenter.com/api/v2/jsonRPC";

// ─────────────────────────────────────────────────────────────────────────────
// Wallet version resolution
// ─────────────────────────────────────────────────────────────────────────────

// All versions we try when auto-detecting, in order of likelihood.
const WALLET_VERSIONS = ["V4", "V3R2", "V5R1", "V3R1"];

function buildWallet(version, publicKey) {
  switch (version) {
    case "V3R1": return WalletContractV3R1.create({ publicKey, workchain: 0 });
    case "V3R2": return WalletContractV3R2.create({ publicKey, workchain: 0 });
    case "V4":   return WalletContractV4.create({ publicKey, workchain: 0 });
    case "V5R1": return WalletContractV5R1.create({ publicKey, workchain: 0 });
    default: throw new Error(`Unknown WALLET_VERSION "${version}". Valid: V3R1 V3R2 V4 V5R1`);
  }
}

/**
 * Auto-detect which wallet version has a non-zero on-chain balance / seqno.
 * Falls back to V4 if none are deployed yet (fresh mnemonic).
 */
async function detectWalletVersion(client, publicKey) {
  const override = process.env.WALLET_VERSION?.trim().toUpperCase();
  if (override) {
    console.log(`[Wallet] Using WALLET_VERSION override: ${override}`);
    return buildWallet(override, publicKey);
  }

  console.log("[Wallet] Auto-detecting wallet version...");
  let bestZeroBalanceCandidate = null;

  for (const version of WALLET_VERSIONS) {
    const candidate = buildWallet(version, publicKey);
    try {
      const balance = await client.getBalance(candidate.address);
      if (balance > 0n) {
        console.log(`[Wallet] ✅ Detected ${version} (balance: ${balance} nanoTON)`);
        return candidate;
      }

      // Keep a zero-balance candidate only as a final fallback.
      if (!bestZeroBalanceCandidate) {
        bestZeroBalanceCandidate = { version, wallet: candidate };
      }
    } catch {
      // Not deployed / not this version – try next
    }
  }

  if (bestZeroBalanceCandidate) {
    console.warn(
      `[Wallet] ⚠️  No funded wallet version found. Falling back to ${bestZeroBalanceCandidate.version} (zero balance).`
    );
    return bestZeroBalanceCandidate.wallet;
  }

  // No deployed wallet found – default to V4 (most common for new wallets)
  console.warn("[Wallet] ⚠️  No active wallet found for any version. Defaulting to V4.");
  console.warn("[Wallet]    If your address is wrong, set WALLET_VERSION=V3R2 (or V5R1) in .env");
  return buildWallet("V4", publicKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 – Compile TACT contracts
// ─────────────────────────────────────────────────────────────────────────────

async function compileContracts() {
  if (process.env.SKIP_COMPILE === "true") {
    console.log("[Compile] SKIP_COMPILE=true – using existing build/");
    return;
  }

  console.log("\n━━━ Step 1/3 – Compiling TACT contracts ━━━");

  const tactBin = resolveTactBinary();
  console.log(`[Compile] Using tact: ${tactBin}`);

  const tactConfig = path.join(ROOT, "tact.config.json");
  if (!fs.existsSync(tactConfig)) {
    throw new Error(`tact.config.json not found at ${tactConfig}.`);
  }

  const buildDir = path.join(ROOT, "build");
  if (fs.existsSync(buildDir)) {
    console.log("[Compile] Cleaning stale build/ ...");
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  await runCommand(tactBin, ["--config", tactConfig], ROOT);

  for (const contractName of ["GameContract", "EscrowContract"]) {
    const artifact = resolveContractArtifact(contractName);
    if (!artifact) {
      const expected = [
        path.join(ROOT, "build", contractName, `${contractName}_${contractName}.code.boc`),
        path.join(ROOT, "build", contractName, `${contractName}.cell`),
      ].join("\n");
      throw new Error(
        `Artifact missing after compile for ${contractName}.\nExpected one of:\n${expected}\nCheck tact.config.json output paths.`
      );
    }
  }

  console.log("[Compile] ✅ All contracts compiled\n");
}

function resolveTactBinary() {
  const local = path.join(ROOT, "node_modules", ".bin", "tact");
  if (fs.existsSync(local)) return local;
  try { execSync("npx --yes tact --version", { stdio: "pipe", cwd: ROOT }); return "npx tact"; } catch {}
  try { execSync("tact --version", { stdio: "pipe" }); return "tact"; } catch {}
  throw new Error(
    "TACT compiler not found.\n" +
    "  pnpm add -D @tact-lang/compiler   ← recommended\n" +
    "  npm install -g @tact-lang/compiler"
  );
}

function runCommand(bin, args, cwd) {
  return new Promise((resolve, reject) => {
    const [cmd, ...rest] = bin.split(" ");
    const proc = spawn(cmd, [...rest, ...args], {
      cwd, stdio: "inherit", shell: process.platform === "win32",
    });
    proc.on("error", err => reject(new Error(`Failed to start '${bin}': ${err.message}`)));
    proc.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`'${bin}' exited with code ${code}. Fix TACT errors above.`));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 – Validate config, detect wallet, confirm address
// ─────────────────────────────────────────────────────────────────────────────

async function deploy() {
  await compileContracts();

  console.log("━━━ Step 2/3 – Validating config & wallet ━━━");
  console.log(`[Deploy] Network: ${TESTNET ? "TESTNET" : "MAINNET"}`);

  const ownerMnemonicRaw = getRequiredEnv("OWNER_MNEMONIC");
  const tonApiKey        = getRequiredEnv("TON_API_KEY");

  const stakeAmountRaw = process.env.STAKE_AMOUNT || toNano("0.01").toString();
  let stakeAmount;
  try { stakeAmount = BigInt(stakeAmountRaw); }
  catch { throw new Error("Invalid STAKE_AMOUNT. Expected nanoTON integer, e.g. 1000000000"); }

  const deployValueRaw = process.env.DEPLOY_VALUE || toNano("0.15").toString();
  let deployValue;
  try { deployValue = BigInt(deployValueRaw); }
  catch { throw new Error("Invalid DEPLOY_VALUE. Expected nanoTON integer, e.g. 150000000"); }

  const maxPlayersRaw = process.env.MAX_PLAYERS || "4";
  const maxPlayers    = Number.parseInt(maxPlayersRaw, 10);
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) {
    throw new Error("Invalid MAX_PLAYERS. Expected integer 2–8");
  }

  const mnemonic = ownerMnemonicRaw.trim().split(/\s+/);
  if (mnemonic.length !== 24) {
    throw new Error("Invalid OWNER_MNEMONIC. Expected 24 space-separated words");
  }

  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const client  = new TonClient({ endpoint: ENDPOINT, apiKey: tonApiKey });

  // ── Auto-detect wallet version ────────────────────────────────────────────
  const wallet    = await detectWalletVersion(client, keyPair.publicKey);
  const ownerAddr = wallet.address;
  const addrStr   = ownerAddr.toString({ bounceable: false });
  const rawAddr   = ownerAddr.toString();

  console.log("\n┌─────────────────────────────────────────────────────┐");
  console.log("│  ⚠️   ADDRESS CONFIRMATION REQUIRED                  │");
  console.log("├─────────────────────────────────────────────────────┤");
  console.log(`│  Derived address: ${addrStr.padEnd(33)} │`);
  console.log(`│  Raw/friendly: ${rawAddr.padEnd(35)} │`);
  console.log("│                                                     │");
  console.log("│  Open your TON wallet app and verify this matches   │");
  console.log("│  your wallet address EXACTLY before continuing.     │");
  console.log("│                                                     │");
  console.log("│  If it does NOT match, Ctrl+C now and set:          │");
  console.log("│    WALLET_VERSION=V3R2   (or V5R1 / V3R1)          │");
  console.log("└─────────────────────────────────────────────────────┘\n");

  await askConfirmation("Does the address above match your wallet? (yes/no): ");

  const walletBalance = await client.getBalance(ownerAddr);
  console.log("[Deploy] Balance:", walletBalance.toString(), "nanoTON");

  if (walletBalance < toNano("0.25")) {
    throw new Error(
      `Insufficient balance. Need ≥ 0.25 TON, got ${walletBalance} nanoTON.\n` +
      `Fund this address and retry: ${addrStr}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 – Compute deterministic addresses + deploy
  // ─────────────────────────────────────────────────────────────────────────

  console.log("\n━━━ Step 3/3 – Deploying contracts ━━━");

  const escrowCode = loadContractCode("EscrowContract");
  const gameCode   = loadContractCode("GameContract");

  // Circular dependency resolution (see comments in original)
  const escrowInit1 = buildEscrowInitData(ownerAddr, ownerAddr);
  const escrowAddr1 = contractAddress(0, { code: escrowCode, data: escrowInit1 });
  const gameInit1   = buildGameInitData(ownerAddr, escrowAddr1, stakeAmount, maxPlayers);
  const gameAddr1   = contractAddress(0, { code: gameCode, data: gameInit1 });

  const escrowInitF = buildEscrowInitData(ownerAddr, gameAddr1);
  const escrowAddrF = contractAddress(0, { code: escrowCode, data: escrowInitF });
  const gameInitF   = buildGameInitData(ownerAddr, escrowAddrF, stakeAmount, maxPlayers);
  const gameAddrF   = contractAddress(0, { code: gameCode, data: gameInitF });

  console.log("[Deploy] EscrowContract →", escrowAddrF.toString());
  console.log("[Deploy] GameContract   →", gameAddrF.toString());

  const walletContract = client.open(wallet);

  const escrowAlreadyDeployed = await client.isContractDeployed(escrowAddrF);
  const gameAlreadyDeployed = await client.isContractDeployed(gameAddrF);

  // ── 3a. Deploy EscrowContract ─────────────────────────────────────────────
  if (escrowAlreadyDeployed) {
    console.log("[Deploy] EscrowContract already active – skipping redeploy");
  } else {
    let seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [internal({
        to: escrowAddrF, value: deployValue,
        init: { code: escrowCode, data: escrowInitF },
        bounce: false, body: beginCell().endCell(),
      })],
    });
    console.log("[Deploy] EscrowContract tx sent – waiting for confirmation...");
    await waitForSeqno(walletContract, seqno);

    const escrowActiveAfter = await client.isContractDeployed(escrowAddrF);
    if (!escrowActiveAfter) {
      throw new Error(
        "EscrowContract deployment transaction was sent but contract is still inactive. " +
        "This usually means the transfer failed on-chain (insufficient value or invalid init)."
      );
    }
    console.log("[Deploy] ✅ EscrowContract confirmed");
  }

  // ── 3b. Deploy GameContract ───────────────────────────────────────────────
  if (gameAlreadyDeployed) {
    console.log("[Deploy] GameContract already active – skipping redeploy");
  } else {
    let seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [internal({
        to: gameAddrF, value: deployValue,
        init: { code: gameCode, data: gameInitF },
        bounce: false, body: beginCell().endCell(),
      })],
    });
    console.log("[Deploy] GameContract tx sent – waiting for confirmation...");
    await waitForSeqno(walletContract, seqno);

    const gameActiveAfter = await client.isContractDeployed(gameAddrF);
    if (!gameActiveAfter) {
      throw new Error(
        "GameContract deployment transaction was sent but contract is still inactive. " +
        "This usually means the transfer failed on-chain (insufficient value or invalid init)."
      );
    }
    console.log("[Deploy] ✅ GameContract confirmed");
  }

  // ── Write deployment.json ─────────────────────────────────────────────────
  const output = {
    network:        TESTNET ? "testnet" : "mainnet",
    ownerAddress:   addrStr,
    walletVersion:  process.env.WALLET_VERSION || "auto-detected",
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
  // Matches generated EscrowContract_init_args serialization:
  // data = 1-bit prefix + owner + gameContract
  return beginCell()
    .storeUint(0, 1)
    .storeAddress(owner)
    .storeAddress(gameContract)
    .endCell();
}

function buildGameInitData(owner, escrow, stakeAmount, maxPlayers) {
  // Matches generated GameContract_init_args serialization:
  // data = 1-bit prefix + owner + escrow + int257(stakeAmount) + ref(int257(maxPlayers))
  const maxPlayersRef = beginCell()
    .storeInt(BigInt(maxPlayers), 257)
    .endCell();

  return beginCell()
    .storeUint(0, 1)
    .storeAddress(owner)
    .storeAddress(escrow)
    .storeInt(stakeAmount, 257)
    .storeRef(maxPlayersRef)
    .endCell();
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact loader
// ─────────────────────────────────────────────────────────────────────────────

function loadBoc(relPath) {
  const abs = path.resolve(ROOT, relPath);
  if (fs.existsSync(abs)) return fs.readFileSync(abs);
  const found = findFileRecursive(path.join(ROOT, "build"), path.basename(relPath));
  if (found) { console.warn(`[Deploy] Artifact at unexpected path – using: ${found}`); return fs.readFileSync(found); }
  throw new Error(`Missing compiled artifact: ${abs}\nRe-run without SKIP_COMPILE=true.`);
}

function resolveContractArtifact(contractName) {
  const preferred = path.join(ROOT, "build", contractName, `${contractName}_${contractName}.code.boc`);
  if (fs.existsSync(preferred)) return preferred;

  const legacy = path.join(ROOT, "build", contractName, `${contractName}.cell`);
  if (fs.existsSync(legacy)) return legacy;

  const byCodeBocName = findFileRecursive(path.join(ROOT, "build"), `${contractName}_${contractName}.code.boc`);
  if (byCodeBocName) return byCodeBocName;

  const byLegacyName = findFileRecursive(path.join(ROOT, "build"), `${contractName}.cell`);
  if (byLegacyName) return byLegacyName;

  return null;
}

function loadContractCode(contractName) {
  const artifact = resolveContractArtifact(contractName);
  if (!artifact) {
    throw new Error(
      `Missing compiled artifact for ${contractName}. Re-run compile and verify build output.`
    );
  }

  const preferredSuffix = `${contractName}_${contractName}.code.boc`;
  if (!artifact.endsWith(preferredSuffix)) {
    console.warn(`[Deploy] Using non-standard artifact path for ${contractName}: ${artifact}`);
  }

  const boc = fs.readFileSync(artifact);
  let cells;
  try {
    cells = Cell.fromBoc(boc);
  } catch (error) {
    throw new Error(
      `Failed to decode artifact BOC for ${contractName} at ${artifact}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!cells.length) {
    throw new Error(`Decoded zero cells for ${contractName} from ${artifact}`);
  }

  return cells[0];
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
// Interactive confirmation prompt
// ─────────────────────────────────────────────────────────────────────────────

function askConfirmation(question) {
  if (process.env.AUTO_CONFIRM === "true") {
    console.log("[Deploy] AUTO_CONFIRM=true – skipping interactive confirmation prompt.");
    return Promise.resolve();
  }

  if (!process.stdin.isTTY) {
    return Promise.reject(new Error(
      "Interactive confirmation requires a TTY. Re-run in an interactive terminal or set AUTO_CONFIRM=true."
    ));
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const normalised = answer.trim().toLowerCase();
      if (normalised === "yes" || normalised === "y") {
        resolve();
      } else {
        reject(new Error(
          "Deployment cancelled.\n" +
          "Set WALLET_VERSION=V3R2 (or V5R1 / V3R1) in .env and retry."
        ));
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Env helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required env var: ${name}\nCopy env.example → .env and fill in values.`);
  }
  return value;
}

function loadEnvFromLocalFile() {
  const candidates = [path.resolve(".env"), path.join(__dirname, ".env"), path.join(ROOT, ".env")];
  const seen = new Set();
  for (const p of candidates) { if (!seen.has(p)) { seen.add(p); loadEnvFile(p); } }
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    const rawValue = line.slice(eqIndex + 1).trim();
    let value;
    if (rawValue.startsWith('"')) { const end = rawValue.indexOf('"', 1); value = end > 0 ? rawValue.slice(1, end) : rawValue.slice(1); }
    else if (rawValue.startsWith("'")) { const end = rawValue.indexOf("'", 1); value = end > 0 ? rawValue.slice(1, end) : rawValue.slice(1); }
    else { value = rawValue.split("#")[0].trim(); }
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
deploy().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});