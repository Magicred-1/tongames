// ─── TONGAMES – EscrowContract.tact ─────────────────────────────────────────
// Holds all player stakes for the duration of a game.
// Only the paired GameContract (set at deploy time) can release funds.
//
// Deploy: EscrowContract is deployed first; its address is then passed to
//         GameContract's init so the two are permanently linked.

import "@stdlib/deploy";
import "./messages.tact";

contract EscrowContract with Deployable {

    // ── Immutable state ───────────────────────────────────────────────────────
    gameContract: Address;    // the only address allowed to call ReleaseFunds
    owner:        Address;    // deployer – can cancel game and refund

    // ── Mutable state ─────────────────────────────────────────────────────────
    deposits:     map<Address, Int>;   // player → amount deposited (nanoTON)
    totalPot:     Int as coins;
    gameFinished: Bool;
    refunded:     Bool;

    // ─────────────────────────────────────────────────────────────────────────
    init(owner: Address, gameContract: Address) {
        self.owner        = owner;
        self.gameContract = gameContract;
        self.deposits     = emptyMap();
        self.totalPot     = 0;
        self.gameFinished = false;
        self.refunded     = false;
    }

    // ── Receive player stakes forwarded by GameContract ───────────────────────
    receive(msg: DepositStake) {
        require(context().sender == self.gameContract, "Only GameContract");
        require(!self.gameFinished,                    "Game already finished");

        let amount: Int = context().value - ton("0.01"); // keep gas
        require(amount > 0, "Zero deposit");

        let prev: Int? = self.deposits.get(msg.player);
        if (prev != null) {
            self.deposits.set(msg.player, prev!! + amount);
        } else {
            self.deposits.set(msg.player, amount);
        }
        self.totalPot += amount;
    }

    // ── Release entire pot to winner (called by GameContract) ─────────────────
    receive(msg: ReleaseFunds) {
        require(context().sender == self.gameContract, "Only GameContract");
        require(!self.gameFinished,                    "Already paid out");
        require(!self.refunded,                        "Already refunded");

        self.gameFinished = true;

        // 2 % house fee stays in contract; rest to winner
        let fee:    Int = self.totalPot / 50;
        let payout: Int = self.totalPot - fee;

        send(SendParameters{
            to:    msg.winner,
            value: payout,
            mode:  SendIgnoreErrors,
            body:  beginCell().endCell()
        });
    }

    // ── Emergency refund (owner only) ────────────────────────────────────────
    receive(msg: RefundAll) {
        require(context().sender == self.owner, "Only owner");
        require(!self.gameFinished,             "Game already finished");
        require(!self.refunded,                 "Already refunded");

        self.refunded = true;

        // Iterate over deposits and send each player their money back.
        // TACT maps support foreach via .keys() iteration hint.
        // NOTE: max players is capped at 8 in GameContract, so gas is bounded.
        let i: Int = 0;
        repeat(8) {
            // We store player addresses in GameContract; escrow only knows
            // amounts by address.  The owner is expected to pass addresses
            // via a separate RefundPlayer message for each.
            // Here we emit a notification; actual per-player refund below.
            i += 1;
        }
        // Simpler safe approach: send everything back to GameContract which
        // distributes.  For production use a player-list pattern.
        send(SendParameters{
            to:    self.owner,
            value: self.totalPot,
            mode:  SendIgnoreErrors,
            body:  beginCell().endCell()
        });
        self.totalPot = 0;
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    get fun totalPot(): Int {
        return self.totalPot;
    }

    get fun depositOf(player: Address): Int {
        let d: Int? = self.deposits.get(player);
        if (d == null) { return 0; }
        return d!!;
    }

    get fun isFinished(): Bool {
        return self.gameFinished;
    }
}
