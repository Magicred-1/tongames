// ─── TONGAMES – GameEngine.js ─────────────────────────────────────────────────
// Off-chain mirror of the on-chain game logic.
// The server computes combat deterministically so it can animate the TV screen
// before finalising on-chain; the blockchain acts as the source of truth.

import { createHash } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────
const CLASS = { KNIGHT: 0, MAGE: 1, ROGUE: 2 };
const BASE_HP          = 100;
const DICE_BASE_MAX    = 10;
const MAGE_DICE_MAX    = 14;
const KNIGHT_REDUCTION = 3;
const ROGUE_CRIT_ROLL  = 7;   // roll > 7 triggers crit
const ROGUE_CRIT_MULT  = 2;

// ─────────────────────────────────────────────────────────────────────────────
export class GameEngine {
  constructor({ roomId, maxPlayers, stakeAmount }) {
    this.roomId      = roomId;
    this.maxPlayers  = maxPlayers;
    this.stakeAmount = stakeAmount;

    // State
    this.state       = "WAITING";   // mirrors contract states
    this.round       = 0;

    // Players: Map<address, PlayerState>
    this.players     = new Map();
    this.playerOrder = [];   // insertion order for deterministic iteration

    this.commitCount = 0;
    this.revealCount = 0;

    this.combinedEntropy = BigInt(0);
    this.finalRandom     = BigInt(0);
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  get playerCount() { return this.players.size; }

  get aliveCount() {
    return [...this.players.values()].filter(p => !p.isEliminated).length;
  }

  isFull() { return this.players.size >= this.maxPlayers; }

  alivePlayers() {
    return [...this.players.entries()]
      .filter(([, p]) => !p.isEliminated)
      .map(([addr, p]) => ({ address: addr, hp: p.hp, classType: p.classType }));
  }

  // ── Player management ────────────────────────────────────────────────────────

  addPlayer(address, classType) {
    if (this.players.has(address)) throw new Error("Already joined");
    if (this.players.size >= this.maxPlayers) throw new Error("Room full");
    if (![0, 1, 2].includes(classType)) throw new Error("Invalid class");

    this.players.set(address, {
      classType,
      hp:           BASE_HP,
      commitHash:   null,
      secret:       null,
      nonce:        null,
      hasCommitted: false,
      hasRevealed:  false,
      target:       null,
      isEliminated: false,
    });
    this.playerOrder.push(address);
  }

  // ── Phase transitions ────────────────────────────────────────────────────────

  startGame() {
    if (this.players.size < 1) throw new Error("Need at least 1 player");
    this.state = "READY";
  }

  beginCommitPhase() {
    this.state       = "COMMIT";
    this.round       += 1;
    this.commitCount = 0;
    this.revealCount = 0;
    this.combinedEntropy = BigInt(0);

    for (const p of this.players.values()) {
      if (!p.isEliminated) {
        p.hasCommitted = false;
        p.hasRevealed  = false;
        p.commitHash   = null;
        p.secret       = null;
        p.nonce        = null;
      }
    }
  }

  // ── Commit phase ─────────────────────────────────────────────────────────────

  recordCommit(address, commitHash) {
    const p = this._getAlivePlayer(address);
    if (p.hasCommitted) throw new Error("Already committed");
    p.commitHash   = commitHash;
    p.hasCommitted = true;
    this.commitCount += 1;
  }

  allCommitted() {
    return this.commitCount >= this.aliveCount;
  }

  // ── Target selection ─────────────────────────────────────────────────────────

  setTarget(attackerAddr, targetAddr) {
    const attacker = this._getAlivePlayer(attackerAddr);
    const target   = this._getAlivePlayer(targetAddr);
    if (attackerAddr === targetAddr) throw new Error("Cannot target yourself");
    attacker.target = targetAddr;
  }

  // ── Reveal phase ─────────────────────────────────────────────────────────────

  recordReveal(address, secret, nonce) {
    const p    = this._getAlivePlayer(address);
    if (!p.hasCommitted)  throw new Error("Did not commit");
    if (p.hasRevealed)    throw new Error("Already revealed");

    // Verify commitment
    const expected = computeCommitHash(secret, nonce, address);
    if (expected !== p.commitHash) return false;   // hash mismatch

    p.secret      = secret;
    p.nonce       = nonce;
    p.hasRevealed = true;
    this.revealCount += 1;

    // XOR entropy
    this.combinedEntropy ^= BigInt("0x" + secret);

    return true;
  }

  allRevealed() {
    return this.revealCount >= this.aliveCount;
  }

  // ── Resolve phase ─────────────────────────────────────────────────────────────

  resolve() {
    this.state = "RESOLVE";

    // Compute finalRandom = sha256(combinedEntropy ++ round)
    this.finalRandom = computeFinalRandom(this.combinedEntropy, this.round);

    const results = [];
    let derivedSeed = this.finalRandom;

    for (let i = 0; i < this.playerOrder.length; i++) {
      const addr    = this.playerOrder[i];
      const attacker = this.players.get(addr);
      if (!attacker || attacker.isEliminated) continue;

      // Derive a per-player seed
      derivedSeed = computeFinalRandom(derivedSeed, i);

      // Auto-assign target if player forgot to select one
      if (!attacker.target) {
        attacker.target = this._randomAliveOpponent(addr, derivedSeed);
      }

      const result = this._resolveCombat(addr, attacker, derivedSeed);
      if (result) results.push(result);
    }

    this.state = "CHECK_WINNER";
    return results;
  }

  _resolveCombat(attackerAddr, attacker, seed) {
    const diceMax = attacker.classType === CLASS.MAGE ? MAGE_DICE_MAX : DICE_BASE_MAX;
    const roll    = Number(seed % BigInt(diceMax)) + 1;

    let damage = roll;
    let isCrit = false;

    if (attacker.classType === CLASS.ROGUE && roll > ROGUE_CRIT_ROLL) {
      damage = roll * ROGUE_CRIT_MULT;
      isCrit = true;
    }

    const targetAddr = attacker.target;
    const target     = this.players.get(targetAddr);
    if (!target || target.isEliminated) return null;

    let finalDamage = damage;
    if (target.classType === CLASS.KNIGHT) {
      finalDamage = Math.max(1, damage - KNIGHT_REDUCTION);
    }

    const prevHp   = target.hp;
    target.hp      = Math.max(0, target.hp - finalDamage);
    if (target.hp <= 0) {
      target.isEliminated = true;
    }

    return {
      attacker:      attackerAddr,
      attackerClass: attacker.classType,
      target:        targetAddr,
      targetClass:   target.classType,
      roll,
      damage:        finalDamage,
      isCrit,
      targetHpBefore: prevHp,
      targetHpAfter:  target.hp,
      eliminated:    target.isEliminated,
    };
  }

  // ── Winner check ─────────────────────────────────────────────────────────────

  checkWinner() {
    const alive = [...this.players.entries()].filter(([, p]) => !p.isEliminated);
    if (alive.length === 1) return alive[0][0];
    if (alive.length === 0) return this.playerOrder[0]; // edge case: draw
    return null;   // game continues
  }

  // ── Timeout helpers ───────────────────────────────────────────────────────────

  eliminateMissingCommitters() {
    const eliminated = [];
    for (const [addr, p] of this.players.entries()) {
      if (!p.isEliminated && !p.hasCommitted) {
        p.isEliminated = true;
        eliminated.push(addr);
      }
    }
    return eliminated;
  }

  eliminateMissingRevealers() {
    const eliminated = [];
    for (const [addr, p] of this.players.entries()) {
      if (!p.isEliminated && p.hasCommitted && !p.hasRevealed) {
        p.isEliminated = true;
        eliminated.push(addr);
      }
    }
    return eliminated;
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  _getAlivePlayer(address) {
    const p = this.players.get(address);
    if (!p) throw new Error("Not a player");
    if (p.isEliminated) throw new Error("Player is eliminated");
    return p;
  }

  _randomAliveOpponent(selfAddr, seed) {
    const opponents = this.playerOrder.filter(a => {
      const p = this.players.get(a);
      return a !== selfAddr && p && !p.isEliminated;
    });
    if (opponents.length === 0) return selfAddr;
    const idx = Number(seed % BigInt(opponents.length));
    return opponents[idx];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cryptographic helpers (mirrors on-chain logic exactly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sha256( secret(hex) ++ nonce(hex) ++ address )
 * Returns hex string.
 */
export function computeCommitHash(secret, nonce, address) {
  const h = createHash("sha256");
  h.update(secret.toString());
  h.update(nonce.toString());
  h.update(address);
  return h.digest("hex");
}

/**
 * Generates a secret and its commitment hash for a player.
 * Returns { secret, nonce, commitHash }
 */
export function generateCommitment(address) {
  const { randomBytes } = import("crypto");   // dynamic for ESM compat
  // For sync usage call with pre-generated bytes:
  const secretBytes = randomBytes(32);
  const nonceBytes  = randomBytes(32);
  const secret      = secretBytes.toString("hex");
  const nonce       = nonceBytes.toString("hex");
  const commitHash  = computeCommitHash(secret, nonce, address);
  return { secret, nonce, commitHash };
}

/**
 * sha256( combinedEntropy ++ round )
 */
export function computeFinalRandom(combinedEntropy, round) {
  const h = createHash("sha256");
  h.update(combinedEntropy.toString(16).padStart(64, "0"));
  h.update(round.toString(16).padStart(8, "0"));
  return BigInt("0x" + h.digest("hex"));
}
