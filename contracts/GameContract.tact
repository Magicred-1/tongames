// ─── TONGAMES – GameContract.tact ────────────────────────────────────────────
// Core game logic: commit-reveal RNG, class mechanics, combat, winner payout.
//
// State machine:
//   RoomCreated(0) → PlayersJoining(1) → Ready(2)
//   → CommitPhase(3) ↔ RevealPhase(4) → ResolvePhase(5)
//   → CheckWinner(6) → [next round OR] Finished(7) → Payout(8)

import "@stdlib/deploy";
import "./messages.tact";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATE_ROOM_CREATED:   Int = 0;
const STATE_JOINING:        Int = 1;
const STATE_READY:          Int = 2;
const STATE_COMMIT:         Int = 3;
const STATE_REVEAL:         Int = 4;
const STATE_RESOLVE:        Int = 5;
const STATE_CHECK_WINNER:   Int = 6;
const STATE_FINISHED:       Int = 7;
const STATE_PAYOUT:         Int = 8;

const CLASS_KNIGHT: Int = 0;
const CLASS_MAGE:   Int = 1;
const CLASS_ROGUE:  Int = 2;

const BASE_HP:          Int = 100;
const MAX_PLAYERS:      Int = 8;
const DICE_BASE_MAX:    Int = 10;   // 1–10 standard roll
const MAGE_DICE_MAX:    Int = 14;   // Mage rolls 1–14
const KNIGHT_REDUCTION: Int = 3;    // flat damage reduction
const ROGUE_CRIT_MULT:  Int = 2;    // crit multiplier

// ─────────────────────────────────────────────────────────────────────────────
contract GameContract with Deployable {

    // ── Immutable (set at deploy) ─────────────────────────────────────────────
    owner:       Address;
    escrow:      Address;
    stakeAmount: Int as coins;
    maxPlayers:  Int as uint8;

    // ── Game state ────────────────────────────────────────────────────────────
    state:       Int as uint8;
    round:       Int as uint16;

    // ── Player registry ───────────────────────────────────────────────────────
    // Keyed by address for O(1) lookup; slot index map for iteration.
    players:     map<Address, PlayerData>;
    addrBySlot:  map<Int, Address>;   // 0-based slot → address
    playerCount: Int as uint8;

    // ── Round tracking ────────────────────────────────────────────────────────
    commitCount: Int as uint8;
    revealCount: Int as uint8;
    aliveCount:  Int as uint8;

    // ── RNG ───────────────────────────────────────────────────────────────────
    combinedEntropy: Int as uint256;   // XOR of all revealed secrets
    finalRandom:     Int as uint256;   // sha256(combinedEntropy ++ round)

    // ── Winner ────────────────────────────────────────────────────────────────
    winner: Address?;

    // ─────────────────────────────────────────────────────────────────────────
    init(owner: Address, escrow: Address, stakeAmount: Int, maxPlayers: Int) {
        require(maxPlayers >= 2 && maxPlayers <= MAX_PLAYERS, "Bad player count");

        self.owner        = owner;
        self.escrow       = escrow;
        self.stakeAmount  = stakeAmount;
        self.maxPlayers   = maxPlayers;

        self.state       = STATE_ROOM_CREATED;
        self.round       = 0;

        self.players     = emptyMap();
        self.addrBySlot  = emptyMap();
        self.playerCount = 0;

        self.commitCount     = 0;
        self.revealCount     = 0;
        self.aliveCount      = 0;

        self.combinedEntropy = 0;
        self.finalRandom     = 0;
        self.winner          = null;
    }

    // =========================================================================
    // PHASE 0-1: Staking / Joining
    // =========================================================================

    receive(msg: Stake) {
        require(
            self.state == STATE_ROOM_CREATED || self.state == STATE_JOINING,
            "Not in joining phase"
        );
        require(context().value >= self.stakeAmount, "Insufficient stake");
        require(self.playerCount < self.maxPlayers,  "Game is full");
        require(msg.classType >= 0 && msg.classType <= 2, "Invalid class");

        let sender: Address = context().sender;
        require(self.players.get(sender) == null, "Already joined");

        // Register player
        let p: PlayerData = PlayerData{
            classType:    msg.classType,
            hp:           BASE_HP,
            commitHash:   0,
            secret:       0,
            nonce:        0,
            hasCommitted: false,
            hasRevealed:  false,
            target:       sender,   // will be set in SelectTarget
            isEliminated: false,
            staked:       self.stakeAmount
        };
        self.players.set(sender, p);
        self.addrBySlot.set(self.playerCount, sender);
        self.playerCount += 1;

        // Forward stake to escrow
        send(SendParameters{
            to:    self.escrow,
            value: context().value,
            mode:  SendIgnoreErrors,
            body:  DepositStake{ player: sender }.toCell()
        });

        // Transition state
        if (self.playerCount == 1) {
            self.state = STATE_JOINING;
        }
    }

    // =========================================================================
    // PHASE 2→3: Owner/Server starts the game
    // =========================================================================

    receive(msg: StartGame) {
        require(context().sender == self.owner, "Only owner");
        require(self.state == STATE_JOINING || self.state == STATE_READY, "Cannot start");
        require(self.playerCount >= 2, "Need at least 2 players");

        self.aliveCount = self.playerCount;
        self._beginCommitPhase();
    }

    // =========================================================================
    // PHASE 3: Commit – players submit hash(secret ++ nonce ++ address)
    // =========================================================================

    receive(msg: CommitHash) {
        require(self.state == STATE_COMMIT, "Not in commit phase");
        let sender: Address = context().sender;
        let p: PlayerData?  = self.players.get(sender);
        require(p != null,           "Not a player");
        require(!p!!.isEliminated,   "Eliminated");
        require(!p!!.hasCommitted,   "Already committed");

        let updated: PlayerData = p!!;
        updated.commitHash   = msg.commitHash;
        updated.hasCommitted = true;
        self.players.set(sender, updated);

        self.commitCount += 1;

        // All alive players committed → move to reveal
        if (self.commitCount == self.aliveCount) {
            self.state       = STATE_REVEAL;
            self.commitCount = 0;
        }
    }

    // =========================================================================
    // PHASE 4: Reveal – players reveal secret + nonce; contract verifies
    // =========================================================================

    receive(msg: RevealSecret) {
        require(self.state == STATE_REVEAL, "Not in reveal phase");
        let sender: Address = context().sender;
        let p: PlayerData?  = self.players.get(sender);
        require(p != null,          "Not a player");
        require(!p!!.isEliminated,  "Eliminated");
        require(p!!.hasCommitted,   "Did not commit");
        require(!p!!.hasRevealed,   "Already revealed");

        // Verify: sha256(secret ++ nonce ++ address_hash) must equal stored hash
        let expectedHash: Int = self._computeCommitHash(
            msg.secret, msg.nonce, sender
        );
        require(expectedHash == p!!.commitHash, "Hash mismatch – cheater detected");

        let updated: PlayerData = p!!;
        updated.secret      = msg.secret;
        updated.nonce       = msg.nonce;
        updated.hasRevealed = true;
        self.players.set(sender, updated);

        // XOR this secret into combined entropy
        self.combinedEntropy = self.combinedEntropy ^ msg.secret;
        self.revealCount += 1;

        // All alive players revealed → resolve
        if (self.revealCount == self.aliveCount) {
            self.state       = STATE_RESOLVE;
            self.revealCount = 0;
        }
    }

    // =========================================================================
    // PHASE 3b: Select Target (can be sent during commit or reveal phase)
    // =========================================================================

    receive(msg: SelectTarget) {
        require(
            self.state == STATE_COMMIT || self.state == STATE_REVEAL,
            "Wrong phase for target selection"
        );
        let sender: Address = context().sender;
        let p: PlayerData?  = self.players.get(sender);
        require(p != null,         "Not a player");
        require(!p!!.isEliminated, "Eliminated");

        let t: PlayerData? = self.players.get(msg.target);
        require(t != null,         "Target is not a player");
        require(!t!!.isEliminated, "Target is eliminated");
        require(msg.target != sender, "Cannot target yourself");

        let updated: PlayerData = p!!;
        updated.target = msg.target;
        self.players.set(sender, updated);
    }

    // =========================================================================
    // PHASE 5: Resolve – server triggers combat computation
    // =========================================================================

    receive(msg: TriggerResolve) {
        require(context().sender == self.owner, "Only owner");
        require(self.state == STATE_RESOLVE,    "Not in resolve phase");

        // Finalise the RNG seed:  sha256(combinedEntropy ++ round)
        self.finalRandom = self._computeFinalRandom(
            self.combinedEntropy, self.round
        );

        // --- Combat loop: iterate over all players ---
        let derivedSeed: Int = self.finalRandom;
        let i: Int = 0;
        repeat(MAX_PLAYERS) {
            let addr: Address? = self.addrBySlot.get(i);
            if (addr != null) {
                let attacker: PlayerData? = self.players.get(addr!!);
                if (attacker != null && !attacker!!.isEliminated) {
                    derivedSeed = self._computeFinalRandom(derivedSeed, i);
                    self._resolveCombat(addr!!, attacker!!, derivedSeed);
                }
            }
            i += 1;
        }

        self.state = STATE_CHECK_WINNER;
        self._checkWinner();
    }

    // =========================================================================
    // PHASE 8: Payout
    // =========================================================================

    receive(msg: TriggerPayout) {
        require(context().sender == self.owner, "Only owner");
        require(self.state == STATE_PAYOUT,     "Not in payout phase");
        require(self.winner != null,            "No winner set");

        let totalPot: Int = self.stakeAmount * self.playerCount;

        send(SendParameters{
            to:    self.escrow,
            value: ton("0.05"),       // gas for escrow execution
            mode:  SendIgnoreErrors,
            body:  ReleaseFunds{
                winner:   self.winner!!,
                totalPot: totalPot
            }.toCell()
        });

        self.state = STATE_FINISHED;
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    fun _beginCommitPhase() {
        self.state       = STATE_COMMIT;
        self.commitCount = 0;
        self.revealCount = 0;
        self.combinedEntropy = 0;
        self.round += 1;

        // Reset per-round flags for alive players
        let i: Int = 0;
        repeat(MAX_PLAYERS) {
            let addr: Address? = self.addrBySlot.get(i);
            if (addr != null) {
                let p: PlayerData? = self.players.get(addr!!);
                if (p != null && !p!!.isEliminated) {
                    let updated: PlayerData = p!!;
                    updated.hasCommitted = false;
                    updated.hasRevealed  = false;
                    updated.commitHash   = 0;
                    updated.secret       = 0;
                    self.players.set(addr!!, updated);
                }
            }
            i += 1;
        }
    }

    fun _resolveCombat(attackerAddr: Address, attacker: PlayerData, seed: Int) {
        // --- Roll dice based on class ---
        let diceMax: Int = DICE_BASE_MAX;
        if (attacker.classType == CLASS_MAGE) {
            diceMax = MAGE_DICE_MAX;   // Mage: increased dice range
        }
        // Derive a pseudo-random roll in [1, diceMax]
        let roll: Int = (seed % diceMax) + 1;

        // --- Compute damage ---
        let damage: Int = roll;
        let isCrit: Bool = false;

        if (attacker.classType == CLASS_ROGUE) {
            // Rogue: 30 % chance of critical hit (roll > 7 on base 10)
            if (roll > 7) {
                damage = roll * ROGUE_CRIT_MULT;
                isCrit = true;
            }
        }

        // --- Apply damage to target ---
        let targetAddr: Address = attacker.target;
        let target: PlayerData? = self.players.get(targetAddr);
        if (target != null && !target!!.isEliminated) {
            let finalDamage: Int = damage;

            if (target!!.classType == CLASS_KNIGHT) {
                // Knight: flat damage reduction
                finalDamage = damage - KNIGHT_REDUCTION;
                if (finalDamage < 1) { finalDamage = 1; }
            }

            let newHp: Int = target!!.hp - finalDamage;
            let updated: PlayerData = target!!;
            if (newHp <= 0) {
                updated.hp          = 0;
                updated.isEliminated = true;
                self.aliveCount     -= 1;
            } else {
                updated.hp = newHp;
            }
            self.players.set(targetAddr, updated);
        }
    }

    fun _checkWinner() {
        if (self.aliveCount == 1) {
            // Find the survivor
            let i: Int = 0;
            repeat(MAX_PLAYERS) {
                let addr: Address? = self.addrBySlot.get(i);
                if (addr != null) {
                    let p: PlayerData? = self.players.get(addr!!);
                    if (p != null && !p!!.isEliminated) {
                        self.winner = addr!!;
                    }
                }
                i += 1;
            }
            self.state = STATE_PAYOUT;
        } else if (self.aliveCount == 0) {
            // Draw – last attacker (slot 0 survivor) wins; refund all.
            self.state = STATE_PAYOUT;
        } else {
            // Game continues – start next commit phase
            self._beginCommitPhase();
        }
    }

    // ── Cryptographic helpers ─────────────────────────────────────────────────

    /// sha256( secret(256) ++ nonce(256) ++ address_as_uint256 )
    fun _computeCommitHash(secret: Int, nonce: Int, addr: Address): Int {
        // Build a Cell, hash it deterministically
        let b: Builder = beginCell();
        b = b.storeUint(secret, 256);
        b = b.storeUint(nonce,  256);
        b = b.storeAddress(addr);
        return b.endCell().hash();
    }

    /// sha256( combinedEntropy(256) ++ round(16) )
    fun _computeFinalRandom(entropy: Int, salt: Int): Int {
        let b: Builder = beginCell();
        b = b.storeUint(entropy, 256);
        b = b.storeUint(salt,    32);
        return b.endCell().hash();
    }

    // =========================================================================
    // Getters (off-chain read)
    // =========================================================================

    get fun gameState(): Int      { return self.state;       }
    get fun currentRound(): Int   { return self.round;       }
    get fun playerCount(): Int    { return self.playerCount; }
    get fun aliveCount(): Int     { return self.aliveCount;  }
    get fun winner(): Address?    { return self.winner;      }
    get fun finalRandom(): Int    { return self.finalRandom; }

    get fun playerData(addr: Address): PlayerData? {
        return self.players.get(addr);
    }

    get fun playerAddress(slot: Int): Address? {
        return self.addrBySlot.get(slot);
    }
}
