// ─── TONGAMES – SyncEngine.js ────────────────────────────────────────────────
// Broadcasts game events to the TV Screen / Main Display via a separate
// WebSocket channel (or SSE).  Decoupled from player WebSockets so the
// big-screen renderer can connect independently.

import { EventEmitter } from "events";

const tvClients = new Map();   // roomId → Set<ws>

export class SyncEngine extends EventEmitter {
  constructor(roomId) {
    super();
    this.roomId = roomId;
    if (!tvClients.has(roomId)) tvClients.set(roomId, new Set());
  }

  /**
   * Emit an event to all TV clients watching this room.
   * @param {string} eventType
   * @param {object} data
   */
  emit(eventType, data) {
    const clients = tvClients.get(this.roomId);
    if (!clients) return;
    const payload = JSON.stringify({ type: eventType, payload: data });
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(payload);
    }
  }

  /** Register a TV screen WebSocket for a room. */
  static registerTVClient(roomId, ws) {
    if (!tvClients.has(roomId)) tvClients.set(roomId, new Set());
    tvClients.get(roomId).add(ws);
    ws.on("close", () => tvClients.get(roomId)?.delete(ws));
  }
}
