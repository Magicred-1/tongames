# 🎮 TONGAMES

> A verifiably fair, on-chain RPG battle game on **TON** with commit-reveal randomness and class-based combat.

---

## Architecture Overview

```
Clients (Phone Players)
    │  WebSocket
    ▼
Game Server (Node.js + WS)
    ├── GameEngine        ← off-chain combat mirror
    ├── BlockchainAdapter ← TON SDK wrapper
    └── SyncEngine        ──► TV Screen / Main Display

Blockchain (TON)
    ├── GameContract.tact ← commit/reveal, combat state, winner
    └── EscrowContract.tact ← holds stakes, releases to winner
```

---

## Game Flow

### Phase Sequence
```
RoomCreated → PlayersJoining → Ready
  → CommitPhase ↔ RevealPhase
    → ResolvePhase → CheckWinner
      → [Next Round] OR Finished → Payout
```

### Commit-Reveal RNG
1. Each player generates a random **secret** and sends `sha256(secret ++ nonce ++ address)` as a commitment.
2. After all commit, players reveal their secret.
3. Contract verifies each reveal against its commitment.
4. All secrets are **XOR-combined** → `combinedEntropy`
5. `finalRandom = sha256(combinedEntropy ++ round)` — deterministic, tamper-proof.

### Classes

| Class | Ability |
|-------|---------|
| **Knight** | Reduces all incoming damage by 3 |
| **Mage** | Rolls on a 1-14 dice instead of 1-10 |
| **Rogue** | Deals 2× damage on a roll > 7 (critical hit) |

---

## Project Structure

```
tongames/
├── contracts/
│   ├── messages.tact        # Shared message types & structs
│   ├── GameContract.tact    # Main game logic
│   └── EscrowContract.tact  # Stake escrow
├── server/
│   ├── index.js             # WebSocket server entry point
│   ├── gameEngine.js        # Off-chain combat engine
│   ├── blockchainAdapter.js # TON SDK wrapper
│   └── syncEngine.js        # TV screen broadcast
├── scripts/
│   └── deploy.js            # Contract deployment script
├── package.json
├── tact.config.json
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npm install
npm install -g @tact-lang/compiler
```

### 2. Compile contracts

```bash
tact --config tact.config.json
```

Compiled artifacts appear in `build/`.

### 3. Configure environment

```bash
export OWNER_MNEMONIC="word1 word2 ... word24"
export TON_API_KEY="your-toncenter-api-key"
export STAKE_AMOUNT="1000000000"   # 1 TON in nanoTON
export MAX_PLAYERS="4"
export TESTNET="true"              # omit for mainnet
```

### 4. Deploy contracts

```bash
node scripts/deploy.js
```

This writes `deployment.json` with the contract addresses.

### 5. Start the game server

```bash
npm start
```

---

## WebSocket API

Connect players to `ws://your-server:3000`

### Messages sent by client

| type | payload | description |
|------|---------|-------------|
| `CREATE_ROOM` | `{ ownerAddress, stakeAmount, maxPlayers, contractAddress, escrowAddress }` | Create a game room |
| `JOIN_ROOM` | `{ roomId, playerAddress, classType }` | Join a room (0=Knight, 1=Mage, 2=Rogue) |
| `START_GAME` | `{ roomId }` | Owner starts the game |
| `SELECT_TARGET` | `{ target }` | Choose who to attack this round |
| `COMMIT_HASH` | `{ commitHash }` | Submit commitment hash |
| `REVEAL_SECRET` | `{ secret, nonce }` | Reveal pre-image |

### Messages received by client

| type | payload | description |
|------|---------|-------------|
| `ROOM_CREATED` | `{ roomId }` | Confirmation |
| `PLAYER_JOINED` | `{ address, classType, playerCount }` | New player joined |
| `GAME_STARTED` | `{ round }` | Game begins |
| `COMMIT_PHASE` | `{ round, timeoutMs }` | Commit window open (30 s) |
| `REVEAL_PHASE` | `{ round, timeoutMs }` | Reveal window open (20 s) |
| `RESOLVE_PHASE` | `{ results[] }` | Combat resolution |
| `ROUND_RESULTS` | `{ results[] }` | Detailed damage log |
| `NEXT_ROUND` | `{ round, alivePlayers }` | Continue |
| `GAME_OVER` | `{ winner }` | Winner address |
| `PAYOUT_SENT` | `{ winner }` | On-chain payout triggered |
| `TIMEOUT_ELIMINATE` | `{ eliminated[], reason }` | AFK elimination |
| `ERROR` | `{ message }` | Error details |

---

## Smart Contracts

### GameContract

**Key functions (messages)**

| Message | Who sends | Effect |
|---------|-----------|--------|
| `Stake { classType }` | Player | Register + forward stake to Escrow |
| `CommitHash { commitHash }` | Player | Store commitment |
| `RevealSecret { secret, nonce }` | Player | Verify + aggregate entropy |
| `SelectTarget { target }` | Player | Set attack target |
| `StartGame {}` | Owner | Begin CommitPhase |
| `TriggerResolve {}` | Owner | Run combat, advance state |
| `TriggerPayout {}` | Owner | Release pot to winner |

**Getters**

```
gameState()               → Int (0-8)
currentRound()            → Int
playerCount()             → Int
aliveCount()              → Int
winner()                  → Address?
finalRandom()             → Int (256-bit)
playerData(addr)          → PlayerData
playerAddress(slot)       → Address?
```

### EscrowContract

**Key functions**

| Message | Who sends | Effect |
|---------|-----------|--------|
| `DepositStake { player }` | GameContract | Record deposit |
| `ReleaseFunds { winner, totalPot }` | GameContract | Send 98% to winner |
| `RefundAll {}` | Owner | Emergency full refund |

**Getters**

```
totalPot()          → Int (nanoTON)
depositOf(player)   → Int (nanoTON)
isFinished()        → Bool
```

---

## Security Notes

- **Commit-reveal prevents RNG manipulation**: no player can see others' secrets before committing, so XOR entropy cannot be gamed.
- **Hash verification on-chain**: a mismatched reveal is rejected; a cheating player is automatically eliminated.
- **Escrow separation**: funds are held by a separate contract that only the GameContract can instruct, preventing the owner from stealing stakes.
- **Timeout elimination**: players who fail to commit or reveal within the time window are auto-eliminated server-side (and the server calls TriggerResolve on-chain).
- **2% house fee** is kept in the escrow on payout.

---

## License

MIT