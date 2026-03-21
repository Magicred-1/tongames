// ─── TONGAMES – BlockchainAdapter.js ─────────────────────────────────────────
// Wraps @ton/ton SDK calls so the game server can interact with the deployed
// GameContract and EscrowContract on TON (mainnet / testnet).
//
// Install:  npm i @ton/ton @ton/crypto @ton/core

import {
  TonClient,
  WalletContractV4,
  internal,
  beginCell,
  Address,
  toNano,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

// ── Op-codes must match messages.tact ─────────────────────────────────────────
const OP = {
  STAKE:           0x10,
  COMMIT_HASH:     0x11,
  REVEAL_SECRET:   0x12,
  SELECT_TARGET:   0x13,
  START_GAME:      0x20,
  TRIGGER_RESOLVE: 0x21,
  TRIGGER_PAYOUT:  0x22,
};

// ─────────────────────────────────────────────────────────────────────────────
export class BlockchainAdapter {
  /**
   * @param {object} opts
   * @param {string} opts.gameContractAddr  - Deployed GameContract address
   * @param {string} opts.escrowAddr        - Deployed EscrowContract address
   * @param {string} opts.ownerMnemonic     - 24-word mnemonic for owner wallet
   * @param {string} [opts.endpoint]        - TON HTTP API endpoint
   */
  constructor({ gameContractAddr, escrowAddr, ownerMnemonic, endpoint }) {
    this.gameContractAddr = Address.parse(gameContractAddr);
    this.escrowAddr       = Address.parse(escrowAddr);
    this.ownerMnemonic    = ownerMnemonic.split(" ");
    this.endpoint         = endpoint || "https://toncenter.com/api/v2/jsonRPC";

    this.client  = null;
    this.wallet  = null;
    this.keyPair = null;
    this._ready  = this._init();
  }

  async _init() {
    this.client = new TonClient({
      endpoint: this.endpoint,
      apiKey:   process.env.TON_API_KEY,
    });

    this.keyPair = await mnemonicToPrivateKey(this.ownerMnemonic);
    this.wallet  = WalletContractV4.create({
      publicKey:  this.keyPair.publicKey,
      workchain: 0,
    });
    console.log("[Blockchain] Owner wallet:", this.wallet.address.toString());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Owner-only transactions (server → contract)
  // ─────────────────────────────────────────────────────────────────────────

  /** Transition: Ready → CommitPhase */
  async sendStartGame() {
    await this._send(
      this.gameContractAddr,
      toNano("0.05"),
      buildBody(OP.START_GAME)
    );
  }

  /** Transition: ResolvePhase → CheckWinner */
  async sendTriggerResolve() {
    await this._send(
      this.gameContractAddr,
      toNano("0.05"),
      buildBody(OP.TRIGGER_RESOLVE)
    );
  }

  /** Trigger payout → EscrowContract releases funds */
  async sendTriggerPayout() {
    await this._send(
      this.gameContractAddr,
      toNano("0.05"),
      buildBody(OP.TRIGGER_PAYOUT)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Player transactions (built client-side, signed by player's wallet)
  // These return the unsigned cell so the client can sign + send.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build a Stake message payload for a player.
   * @param {number} classType  0=Knight 1=Mage 2=Rogue
   */
  buildStakePayload(classType) {
    return beginCell()
      .storeUint(OP.STAKE, 32)
      .storeUint(0, 64)             // query_id
      .storeUint(classType, 8)
      .endCell()
      .toBoc()
      .toString("base64");
  }

  /**
   * Build a CommitHash payload.
   * @param {string} commitHashHex  64-char hex string
   */
  buildCommitPayload(commitHashHex) {
    return beginCell()
      .storeUint(OP.COMMIT_HASH, 32)
      .storeUint(0, 64)
      .storeUint(BigInt("0x" + commitHashHex), 256)
      .endCell()
      .toBoc()
      .toString("base64");
  }

  /**
   * Build a RevealSecret payload.
   */
  buildRevealPayload(secretHex, nonceHex) {
    return beginCell()
      .storeUint(OP.REVEAL_SECRET, 32)
      .storeUint(0, 64)
      .storeUint(BigInt("0x" + secretHex), 256)
      .storeUint(BigInt("0x" + nonceHex),  256)
      .endCell()
      .toBoc()
      .toString("base64");
  }

  /**
   * Build a SelectTarget payload.
   */
  buildSelectTargetPayload(targetAddress) {
    return beginCell()
      .storeUint(OP.SELECT_TARGET, 32)
      .storeUint(0, 64)
      .storeAddress(Address.parse(targetAddress))
      .endCell()
      .toBoc()
      .toString("base64");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read game state from chain
  // ─────────────────────────────────────────────────────────────────────────

  async getGameState() {
    await this._ready;
    const result = await this.client.runMethod(
      this.gameContractAddr,
      "gameState",
      []
    );
    return result.stack.readNumber();
  }

  async getPlayerData(playerAddress) {
    await this._ready;
    const result = await this.client.runMethod(
      this.gameContractAddr,
      "playerData",
      [{ type: "slice", cell: beginCell().storeAddress(Address.parse(playerAddress)).endCell() }]
    );
    // Parse TupleReader into a JS object
    const tuple = result.stack;
    return {
      classType:    tuple.readNumber(),
      hp:           tuple.readNumber(),
      hasCommitted: tuple.readBoolean(),
      hasRevealed:  tuple.readBoolean(),
      isEliminated: tuple.readBoolean(),
    };
  }

  async getWinner() {
    await this._ready;
    const result = await this.client.runMethod(
      this.gameContractAddr,
      "winner",
      []
    );
    try {
      const cell = result.stack.readCell();
      return cell ? Address.parseRaw(cell.beginParse().loadBits(267).toString()).toString() : null;
    } catch {
      return null;
    }
  }

  async getEscrowBalance() {
    await this._ready;
    const result = await this.client.runMethod(
      this.escrowAddr,
      "totalPot",
      []
    );
    return result.stack.readBigNumber();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────

  async _send(to, value, body) {
    await this._ready;
    const contract = this.client.open(this.wallet);
    const seqno    = await contract.getSeqno();

    await contract.sendTransfer({
      secretKey:  this.keyPair.secretKey,
      seqno,
      messages: [
        internal({ to, value, body })
      ],
    });

    // Wait for tx to appear (simple polling)
    let attempts = 0;
    while (attempts < 20) {
      await sleep(3_000);
      const newSeqno = await contract.getSeqno().catch(() => seqno);
      if (newSeqno > seqno) return;
      attempts++;
    }
    throw new Error("Transaction confirmation timeout");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildBody(opCode) {
  return beginCell()
    .storeUint(opCode, 32)
    .storeUint(0, 64)   // query_id
    .endCell();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
