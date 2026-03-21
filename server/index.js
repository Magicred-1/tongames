// ─── TONGAMES – Game Server (index.js) ───────────────────────────────────────
// WebSocket server that orchestrates game phases, drives the blockchain adapter,
// and feeds the TV Screen / Sync Engine.

import { WebSocketServer } from "ws";
import { createServer }    from "http";
import { GameEngine }      from "./gameEngine.js";
import { BlockchainAdapter } from "./blockchainAdapter.js";
import { SyncEngine }      from "./syncEngine.js";
import QRCode from "qrcode";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4020;

// ── QR Code cache: data → { png: Buffer, timestamp: number } ────────────────
const qrCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Function to clean up old cache entries
function cleanQrCache() {
  const now = Date.now();
  for (const [key, value] of qrCache) {
    if (now - value.timestamp > CACHE_TTL) {
      qrCache.delete(key);
    }
  }
}

// ── HTTP + WS server ──────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Handle QR code generation endpoint
  if (req.url.startsWith("/api/qr")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const data = url.searchParams.get("data");

    if (!data) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'data' query parameter" }));
      return;
    }

    // Check cache first
    if (qrCache.has(data)) {
      const { png } = qrCache.get(data);
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(png);
      return;
    }

    // Generate QR code locally
    QRCode.toBuffer(data, { width: 220 })
      .then((png) => {
        // Cache the result
        qrCache.set(data, { png, timestamp: Date.now() });
        // Clean up old entries
        cleanQrCache();

        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(png);
      })
      .catch((err) => {
        console.error("[QR] Local generation failed, falling back to qrserver.com:", err);
        // Fallback to qrserver.com
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
        fetch(fallbackUrl)
          .then((response) => response.buffer())
          .then((png) => {
            // Cache the fallback result
            qrCache.set(data, { png, timestamp: Date.now() });
            res.writeHead(200, { "Content-Type": "image/png" });
            res.end(png);
          })
          .catch((fallbackErr) => {
            console.error("[QR] Fallback to qrserver.com failed:", fallbackErr);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "QR code generation failed" }));
          });
      });
    return;
  }

  // Default response for other endpoints
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "TONGAMES Server", status: "online" }));
});

const wss = new WebSocketServer({ server: httpServer });

// ── Active rooms:  roomId → { engine, clients, blockchain, sync } ─────────────
const rooms = new Map();

// ── Lobby presence:  address → { address, displayName, avatarUrl } ────────────
const lobbyPlayers = new Map();

// ─────────────────────────────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] New connection from ${clientIp}`);
  ws._roomId    = null;
  ws._playerAddr = null;

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch {
      console.error("[WS] Invalid JSON received:", raw.toString().slice(0, 100));
      return sendError(ws, "Invalid JSON");
    }

    const { type, payload } = msg;
    console.log(`[WS] Message received: type=${type}, playerAddr=${ws._playerAddr}`);

    try {
      switch (type) {
        // ── Lobby presence ───────────────────────────────────────────────────
        case "LOBBY_JOIN":    handleLobbyJoin(ws, payload);          break;

        // ── Room management ──────────────────────────────────────────────────
        case "CREATE_ROOM":   await handleCreateRoom(ws, payload);   break;
        case "JOIN_ROOM":     await handleJoinRoom(ws, payload);     break;
        case "START_GAME":    await handleStartGame(ws, payload);    break;

        // ── Game phases ───────────────────────────────────────────────────────
        case "SELECT_TARGET": await handleSelectTarget(ws, payload); break;
        case "COMMIT_HASH":   await handleCommit(ws, payload);       break;
        case "REVEAL_SECRET": await handleReveal(ws, payload);       break;

        // ── Blockchain confirmation ───────────────────────────────────────────
        case "TX_CONFIRMED":  await handleTxConfirmed(ws, payload);  break;

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

    // Remove from lobby presence
    if (ws._playerAddr && lobbyPlayers.has(ws._playerAddr)) {
      lobbyPlayers.delete(ws._playerAddr);
      broadcastAll({
        type: "LOBBY_PLAYER_LEFT",
        payload: { address: ws._playerAddr, playerCount: lobbyPlayers.size }
      });
    }

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

function handleLobbyJoin(ws, { playerAddress, displayName, avatarUrl }) {
  ws._playerAddr = playerAddress;
  lobbyPlayers.set(playerAddress, { address: playerAddress, displayName, avatarUrl });

  // Send the current lobby roster to the joining client
  send(ws, {
    type: "LOBBY_STATE",
    payload: { players: Array.from(lobbyPlayers.values()) }
  });

  // Announce the new player to everyone
  broadcastAll({
    type: "LOBBY_PLAYER_JOINED",
    payload: { address: playerAddress, displayName, avatarUrl, playerCount: lobbyPlayers.size }
  });

  console.log(`[Lobby] ${displayName ?? playerAddress} joined (${lobbyPlayers.size} present)`);
}

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
    contractAddress,
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

  // Ask this player to stake on-chain
  send(ws, {
    type:    "TX_REQUEST",
    payload: {
      operation: "STAKE",
      to:        room.contractAddress,
      amount:    room.engine.stakeAmount.toString(),
      boc:       room.blockchain.buildStakePayload(classType),
    }
  });

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

  // Ask player to record target on-chain
  try {
    send(ws, {
      type:    "TX_REQUEST",
      payload: {
        operation: "SELECT_TARGET",
        to:        room.contractAddress,
        boc:       room.blockchain.buildSelectTargetPayload(target),
      }
    });
  } catch (e) {
    console.warn("[Blockchain] buildSelectTargetPayload failed:", e.message);
  }
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

  // Ask player to record commit hash on-chain
  try {
    send(ws, {
      type:    "TX_REQUEST",
      payload: {
        operation: "COMMIT_HASH",
        to:        room.contractAddress,
        boc:       room.blockchain.buildCommitPayload(commitHash),
      }
    });
  } catch (e) {
    console.warn("[Blockchain] buildCommitPayload failed:", e.message);
  }

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

  // Ask player to record reveal on-chain
  try {
    send(ws, {
      type:    "TX_REQUEST",
      payload: {
        operation: "REVEAL_SECRET",
        to:        room.contractAddress,
        boc:       room.blockchain.buildRevealPayload(secret, nonce),
      }
    });
  } catch (e) {
    console.warn("[Blockchain] buildRevealPayload failed:", e.message);
  }

  // All revealed → resolve
  if (room.engine.allRevealed()) {
    await resolveRound(roomId);
  }
}

async function handleTxConfirmed(ws, { operation, txHash }) {
  const addr = ws._playerAddr;
  console.log(`[Blockchain] TX_CONFIRMED  op=${operation}  addr=${addr}  tx=${txHash ?? "n/a"}`);

  // Broadcast on-chain confirmation to room so the arena UI can show a tick
  if (ws._roomId && rooms.has(ws._roomId)) {
    broadcastToRoom(ws._roomId, {
      type:    "TX_CONFIRMED",
      payload: { address: addr, operation, txHash }
    });
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

  // Broadcast dice rolling animations for each result
  for (const result of results) {
    // Announce that player is rolling
    broadcastToRoom(roomId, {
      type: "DICE_ROLLING",
      payload: { address: result.attacker }
    });

    // Wait a bit for animation, then reveal result
    await sleep(600);

    const diceMax = room.engine.players.get(result.attacker).classType === 1 ? 14 : 10;
    broadcastToRoom(roomId, {
      type: "DICE_RESULT",
      payload: {
        address: result.attacker,
        roll: result.roll,
        diceMax: diceMax,
      }
    });

    await sleep(400);
  }

  // Animate on TV
  room.sync.emit("ANIMATE_DICE", { results });
  broadcastToRoom(roomId, { type: "RESOLVE_PHASE", payload: { results } });

  await sleep(2_000); // let animation play

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

function broadcastAll(data) {
  const payload = JSON.stringify(data);
  for (const ws of wss.clients) {
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
