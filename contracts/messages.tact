// ─── TONGAMES – Shared Messages & Structs ───────────────────────────────────
// All op-codes are unique 32-bit identifiers so the TVM dispatcher routes
// correctly even when contracts call each other.

// ── Game state constants ─────────────────────────────────────────────────────
// 0 RoomCreated  1 PlayersJoining  2 Ready
// 3 CommitPhase  4 RevealPhase     5 ResolvePhase
// 6 CheckWinner  7 Finished        8 Payout

// ── Class constants ──────────────────────────────────────────────────────────
// 0 Knight  1 Mage  2 Rogue

// ─────────────────────────────────────────────────────────────────────────────
// Player → GameContract
// ─────────────────────────────────────────────────────────────────────────────

/// Sent with the stake amount attached.  classType: 0=Knight 1=Mage 2=Rogue
message(0x10) Stake {
    classType: Int as uint8;
}

/// Hash commitment: sha256(secret ++ nonce ++ sender)
message(0x11) CommitHash {
    commitHash: Int as uint256;
}

/// Reveal the pre-image so the contract can verify and aggregate entropy.
message(0x12) RevealSecret {
    secret: Int as uint256;
    nonce:  Int as uint256;
}

/// Player nominates an opponent to attack this round.
message(0x13) SelectTarget {
    target: Address;
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner / Server → GameContract
// ─────────────────────────────────────────────────────────────────────────────

/// Server triggers the transition from Ready → CommitPhase.
message(0x20) StartGame {}

/// Server triggers ResolvePhase once all secrets are revealed.
message(0x21) TriggerResolve {}

/// Server triggers Payout after winner is determined.
message(0x22) TriggerPayout {}

// ─────────────────────────────────────────────────────────────────────────────
// GameContract → EscrowContract
// ─────────────────────────────────────────────────────────────────────────────

/// Sent when a player stakes; escrow holds funds until game ends.
message(0x30) DepositStake {
    player: Address;
}

/// Sent when the game finishes; escrow releases funds to winner.
message(0x31) ReleaseFunds {
    winner: Address;
    totalPot: Int as coins;
}

/// Emergency refund in case game is cancelled.
message(0x32) RefundAll {}

// ─────────────────────────────────────────────────────────────────────────────
// Internal structs
// ─────────────────────────────────────────────────────────────────────────────

struct PlayerData {
    classType:    Int as uint8;   // 0 Knight / 1 Mage / 2 Rogue
    hp:           Int as uint16;  // starts at 100
    commitHash:   Int as uint256; // sha256 commitment
    secret:       Int as uint256; // revealed pre-image
    nonce:        Int as uint256;
    hasCommitted: Bool;
    hasRevealed:  Bool;
    target:       Address;        // chosen attack target for this round
    isEliminated: Bool;
    staked:       Int as coins;
}

struct RoundResult {
    attacker:   Address;
    target:     Address;
    roll:       Int as uint8;   // 1-10 (or higher for Mage)
    damage:     Int as uint16;
    isCrit:     Bool;           // Rogue only
    targetHpAfter: Int as uint16;
}
