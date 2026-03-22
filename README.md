# TonGames

On-chain PvP arena game on the TON blockchain. Players commit-reveal dice rolls to battle, with spectator betting and smart contract escrow.

## Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| GameContract | [`EQCJRyGAv8p9z2Cq_0G54U1fq3bc3UZnlsBUtZOGRDgfMN_I`](https://testnet.tonscan.org/address/EQCJRyGAv8p9z2Cq_0G54U1fq3bc3UZnlsBUtZOGRDgfMN_I) |
| EscrowContract | [`EQBVcvwGfb31t86hMA_zDqmpJymybADjCmo0cfTfnonL2pO-`](https://testnet.tonscan.org/address/EQBVcvwGfb31t86hMA_zDqmpJymybADjCmo0cfTfnonL2pO-) |

- **Network:** Testnet
- **Stake amount:** 0.01 TON (100,000,000 nanoTON)
- **Max players:** 4
- **Owner:** `UQBc3bogyzi1ZwPZFO3wyaCgYOEq8pZNqQ6OIr9cNYSNLz95`
- **Deployed at:** 2026-03-21T22:17:24Z

## Project Structure

```
contracts/       Tact smart contracts (GameContract, EscrowContract)
frontend/        Next.js app (Tailwind, Dynamic.xyz, TON Connect through Dynamic.xyz)
server/          Node.js WebSocket game server
telegram_bot/    Telegram bot for mini app auth & lobby links
```

## Architecture

```mermaid
flowchart TD
    subgraph Clients["📱 Clients"]
        TMA["Telegram Mini App\n(auto-login via Dynamic.xyz)"]
        TV["TV / Spectator Screen"]
    end

    subgraph Server["🖥️ Game Server (Node.js + WebSocket)"]
        GE["GameEngine\n(off-chain combat mirror)"]
        SE["SyncEngine\n(broadcast to TV)"]
        BA["BlockchainAdapter\n(TON SDK)"]
    end

    subgraph Chain["⛓️ TON Blockchain"]
        GC["GameContract\ncommit · reveal · resolve · payout"]
        EC["EscrowContract\nholds stakes · releases to winner"]
    end

    TMA -->|WebSocket| GE
    GE -->|broadcast| SE
    SE -->|WebSocket| TV
    GE -->|build + send tx| BA
    BA -->|Stake / CommitHash\nRevealSecret / TriggerResolve\nTriggerPayout| GC
    GC -->|DepositStake| EC
    GC -->|ReleaseFunds / RefundAll| EC
    EC -->|"98% prize\n(2% house fee)"| TMA
```

## Game Flow

```mermaid
sequenceDiagram
    participant P as Players (×4)
    participant S as Game Server
    participant GC as GameContract
    participant EC as EscrowContract

    P->>S: LOBBY_JOIN
    P->>GC: Stake{classType} (0.01 TON)
    GC->>EC: DepositStake

    loop Each Round
        S->>P: COMMIT_PHASE
        P->>GC: CommitHash{sha256(secret‖nonce‖addr)}
        S->>P: REVEAL_PHASE
        P->>GC: RevealSecret{secret, nonce}
        Note over GC: XOR all secrets → combinedEntropy<br/>finalRandom = sha256(entropy‖round)
        P->>GC: SelectTarget
        S->>GC: TriggerResolve
        GC->>S: combat results (damage, crits, eliminations)
        S->>P: ROUND_RESULTS + DICE_ROLLING / DICE_RESULT
    end

    GC-->>GC: checkWinner (1 player alive)
    S->>GC: TriggerPayout
    GC->>EC: ReleaseFunds{winner}
    EC->>P: 98% of pot → winner
```

## Stack

- **Frontend:** Next.js · Tailwind CSS · Dynamic.xyz auth · TON Connect
- **Backend:** Node.js WebSocket server with commit-reveal game engine
- **Contracts:** Tact (TON) — GameContract + EscrowContract with spectator betting
- **Auth:** Telegram Mini App (auto-login via Dynamic.xyz `telegramSignIn`)
