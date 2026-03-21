// ─── TONGAMES – Game Server (index.js) ───────────────────────────────────────
// WebSocket server that orchestrates game phases, drives the blockchain adapter,
// and feeds the TV Screen / Sync Engine.

import { WebSocketServer } from "ws";
import { createServer }    from "http";
import { GameEngine }      from "./gameEngine.js";
import { BlockchainAdapter } from "./blockchainAdapter.js";
import { SyncEngine }      from "./syncEngine.js";

const PORT = process.env.PORT || 3000;

// ── HTTP + WS server ──────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "TONGAMES Server", status: "online" }));
});

const wss = new WebSocketServer({ server: httpServer });

// ── Active rooms:  roomId → { engine, clients, blockchain, sync } ─────────────
const rooms = new Map();

// ─────────────────────────────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  console.log("[WS] New connection");
  ws._roomId    = null;
  ws._playerAddr = null;

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { return sendError(ws, "Invalid JSON"); }

    const { type, payload } = msg;

    try {
      switch (type) {
        // ── Room management ──────────────────────────────────────────────────
        case "CREATE_ROOM":   await handleCreateRoom(ws, payload);   break;
        case "JOIN_ROOM":     await handleJoinRoom(ws, payload);     break;
        case "START_GAME":    await handleStartGame(ws, payload);    break;

        // ── Game phases ───────────────────────────────────────────────────────
        case "SELECT_TARGET": await handleSelectTarget(ws, payload); break;
        case "COMMIT_HASH":   await handleCommit(ws, payload);       break;
        case "REVEAL_SECRET": await handleReveal(ws, payload);       break;

        default:
          sendError(ws, `Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error("[WS] Handler error:", err);
      sendError(ws, err.message);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Disconnected: ${ws._playerAddr}`);
    // Notify room if player disconnects mid-game
    if (ws._roomId && rooms.has(ws._roomId)) {
      const room = rooms.get(ws._roomId);
      room.clients.delete(ws._playerAddr);
      broadcastToRoom(ws._roomId, {
        type: "PLAYER_DISCONNECTED",
        payload: { address: ws._playerAddr }
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleCreateRoom(ws, { ownerAddress, stakeAmount, maxPlayers, contractAddress, escrowAddress }) {
  const roomId = generateRoomId();

  const blockchain = new BlockchainAdapter({
    gameContractAddr: contractAddress,
    escrowAddr:       escrowAddress,
    ownerMnemonic:    process.env.OWNER_MNEMONIC
  });

  const engine = new GameEngine({ roomId, maxPlayers, stakeAmount });
  const sync   = new SyncEngine(roomId);

  rooms.set(roomId, {
    engine,
    blockchain,
    sync,
    clients: new Map()   // address → ws
  });

  ws._roomId     = roomId;
  ws._playerAddr = ownerAddress;
  rooms.get(roomId).clients.set(ownerAddress, ws);

  send(ws, { type: "ROOM_CREATED", payload: { roomId, contractAddress } });
  console.log(`[Room ${roomId}] Created by ${ownerAddress}`);
}

async function handleJoinRoom(ws, { roomId, playerAddress, classType }) {
  if (!rooms.has(roomId)) return sendError(ws, "Room not found");
  const room = rooms.get(roomId);

  ws._roomId     = roomId;
  ws._playerAddr = playerAddress;
  room.clients.set(playerAddress, ws);

  room.engine.addPlayer(playerAddress, classType);

  broadcastToRoom(roomId, {
    type:    "PLAYER_JOINED",
    payload: { address: playerAddress, classType, playerCount: room.engine.playerCount }
  });

  // Also update TV screen
  room.sync.emit("PLAYER_JOINED", { address: playerAddress, classType });

  if (room.engine.isFull()) {
    broadcastToRoom(roomId, { type: "ROOM_FULL", payload: {} });
  }
}

async function handleStartGame(ws, { roomId }) {
  const room = rooms.get(roomId);
  if (!room) return sendError(ws, "Room not found");

  room.engine.startGame();
  broadcastToRoom(roomId, { type: "GAME_STARTED", payload: { round: 1 } });
  room.sync.emit("GAME_STARTED", {});

  // Kick off first commit phase
  await beginCommitPhase(roomId);
}

async function handleSelectTarget(ws, { target }) {
  const roomId = ws._roomId;
  const room   = rooms.get(roomId);
  if (!room) return;

  room.engine.setTarget(ws._playerAddr, target);
  send(ws, { type: "TARGET_SET", payload: { target } });
}

async function handleCommit(ws, { commitHash }) {
  const roomId = ws._roomId;
  const room   = rooms.get(roomId);
  if (!room) return;

  room.engine.recordCommit(ws._playerAddr, commitHash);

  broadcastToRoom(roomId, {
    type:    "PLAYER_COMMITTED",
    payload: { address: ws._playerAddr, committed: room.engine.commitCount }
  });

  // Once all alive players committed → reveal phase
  if (room.engine.allCommitted()) {
    await beginRevealPhase(roomId);
  }
}

async function handleReveal(ws, { secret, nonce }) {
  const roomId = ws._roomId;
  const room   = rooms.get(roomId);
  if (!room) return;

  const valid = room.engine.recordReveal(ws._playerAddr, secret, nonce);
  if (!valid) return sendError(ws, "Hash mismatch – commit/reveal mismatch");

  broadcastToRoom(roomId, {
    type:    "PLAYER_REVEALED",
    payload: { address: ws._playerAddr, revealed: room.engine.revealCount }
  });

  // All revealed → resolve
  if (room.engine.allRevealed()) {
    await resolveRound(roomId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase orchestration
// ─────────────────────────────────────────────────────────────────────────────

async function beginCommitPhase(roomId) {
  const room = rooms.get(roomId);
  room.engine.beginCommitPhase();

  broadcastToRoom(roomId, {
    type:    "COMMIT_PHASE",
    payload: { round: room.engine.round, timeoutMs: 30_000 }
  });
  room.sync.emit("COMMIT_PHASE", { round: room.engine.round });

  // Timeout: auto-eliminate non-committers after 30 s
  setTimeout(() => enforceCommitTimeout(roomId), 30_000);
}

async function beginRevealPhase(roomId) {
  const room = rooms.get(roomId);
  broadcastToRoom(roomId, {
    type:    "REVEAL_PHASE",
    payload: { round: room.engine.round, timeoutMs: 20_000 }
  });
  room.sync.emit("REVEAL_PHASE", { round: room.engine.round });

  setTimeout(() => enforceRevealTimeout(roomId), 20_000);
}

async function resolveRound(roomId) {
  const room    = rooms.get(roomId);
  const results = room.engine.resolve();   // compute combat off-chain

  // Animate on TV
  room.sync.emit("ANIMATE_DICE", { results });
  broadcastToRoom(roomId, { type: "RESOLVE_PHASE", payload: { results } });

  await sleep(3_000); // let animation play

  room.sync.emit("SHOW_DAMAGE", { results });
  broadcastToRoom(roomId, { type: "ROUND_RESULTS", payload: { results } });

  // Post round result to blockchain
  try {
    await room.blockchain.sendTriggerResolve();
  } catch (e) {
    console.warn("[Blockchain] TriggerResolve failed:", e.message);
  }

  await sleep(2_000);

  // Check winner
  const winner = room.engine.checkWinner();
  if (winner) {
    await handleGameOver(roomId, winner);
  } else {
    broadcastToRoom(roomId, {
      type:    "NEXT_ROUND",
      payload: { round: room.engine.round + 1, alivePlayers: room.engine.alivePlayers() }
    });
    await sleep(3_000);
    await beginCommitPhase(roomId);
  }
}

async function handleGameOver(roomId, winner) {
  const room = rooms.get(roomId);
  broadcastToRoom(roomId, { type: "GAME_OVER", payload: { winner } });
  room.sync.emit("GAME_OVER", { winner });

  // Trigger blockchain payout
  try {
    await room.blockchain.sendTriggerPayout();
    broadcastToRoom(roomId, { type: "PAYOUT_SENT", payload: { winner } });
  } catch (e) {
    console.error("[Blockchain] Payout failed:", e.message);
  }

  rooms.delete(roomId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeout enforcement
// ─────────────────────────────────────────────────────────────────────────────

function enforceCommitTimeout(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.engine.state !== "COMMIT") return;

  const missing = room.engine.eliminateMissingCommitters();
  if (missing.length) {
    broadcastToRoom(roomId, {
      type:    "TIMEOUT_ELIMINATE",
      payload: { eliminated: missing, reason: "no_commit" }
    });
  }

  if (room.engine.allCommitted()) {
    beginRevealPhase(roomId);
  }
}

function enforceRevealTimeout(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.engine.state !== "REVEAL") return;

  const missing = room.engine.eliminateMissingRevealers();
  if (missing.length) {
    broadcastToRoom(roomId, {
      type:    "TIMEOUT_ELIMINATE",
      payload: { eliminated: missing, reason: "no_reveal" }
    });
  }

  if (room.engine.allRevealed() || room.engine.aliveCount <= 1) {
    resolveRound(roomId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function sendError(ws, message) {
  send(ws, { type: "ERROR", payload: { message } });
}

function broadcastToRoom(roomId, data) {
  const room = rooms.get(roomId);
  if (!room) return;
  const payload = JSON.stringify(data);
  for (const ws of room.clients.values()) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[TONGAMES] Server listening on port ${PORT}`);
});
