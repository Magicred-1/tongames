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

    // ── Stakes state ──────────────────────────────────────────────────────────
    deposits:     map<Address, Int>;   // player → amount deposited (nanoTON)
    totalPot:     Int as coins;
    gameFinished: Bool;
    refunded:     Bool;

    // ── Betting state ─────────────────────────────────────────────────────────
    bets:          map<Address, BetRecord>;  // bettor → {onPlayer, amount}
    bettorByIndex: map<Int, Address>;        // 0-based index → bettor address
    betCount:      Int as uint8;             // number of unique bettors (max 20)
    totalBetPool:  Int as coins;

    // ─────────────────────────────────────────────────────────────────────────
    init(owner: Address, gameContract: Address) {
        self.owner        = owner;
        self.gameContract = gameContract;
        self.deposits     = emptyMap();
        self.totalPot     = 0;
        self.gameFinished = false;
        self.refunded     = false;

        self.bets          = emptyMap();
        self.bettorByIndex = emptyMap();
        self.betCount      = 0;
        self.totalBetPool  = 0;
    }

    // ── Receive player stakes forwarded by GameContract ───────────────────────
    receive(msg: DepositStake) {
        require(context().sender == self.gameContract, "Only GameContract");
        require(!self.gameFinished,                    "Game already finished");

        let amount: Int = context().value - ton("0.002"); // keep gas
        require(amount > 0, "Zero deposit");

        let prev: Int? = self.deposits.get(msg.player);
        if (prev != null) {
            self.deposits.set(msg.player, prev!! + amount);
        } else {
            self.deposits.set(msg.player, amount);
        }
        self.totalPot += amount;
    }

    // ── Spectator places a bet on a player ───────────────────────────────────
    receive(msg: PlaceBet) {
        require(!self.gameFinished, "Game already finished");
        require(!self.refunded,     "Game refunded");
        require(self.betCount < 20, "Bet slots full");

        let amount: Int = context().value - ton("0.002");
        require(amount > 0, "Zero bet");

        let bettor: Address = context().sender;
        // One bet per bettor
        require(self.bets.get(bettor) == null, "Already placed a bet");

        self.bets.set(bettor, BetRecord{ onPlayer: msg.onPlayer, amount: amount });
        self.bettorByIndex.set(self.betCount, bettor);
        self.betCount     += 1;
        self.totalBetPool += amount;
    }

    // ── Release stakes to winner + distribute bet winnings ────────────────────
    receive(msg: ReleaseFunds) {
        require(context().sender == self.gameContract, "Only GameContract");
        require(!self.gameFinished,                    "Already paid out");
        require(!self.refunded,                        "Already refunded");

        self.gameFinished = true;

        // ── Stakes payout: 2% house fee, rest to winner ───────────────────────
        let stakeFee:    Int = self.totalPot / 50;
        let stakePayout: Int = self.totalPot - stakeFee;

        send(SendParameters{
            to:    msg.winner,
            value: stakePayout,
            mode:  SendIgnoreErrors,
            body:  beginCell().endCell()
        });

        // ── Bet pool distribution ─────────────────────────────────────────────
        if (self.totalBetPool > 0) {
            // Sum bets placed on the winner
            let winnerBetTotal: Int = 0;
            let i: Int = 0;
            repeat(20) {
                let bettor: Address? = self.bettorByIndex.get(i);
                if (bettor != null) {
                    let rec: BetRecord? = self.bets.get(bettor!!);
                    if (rec != null && rec!!.onPlayer == msg.winner) {
                        winnerBetTotal += rec!!.amount;
                    }
                }
                i += 1;
            }

            if (winnerBetTotal > 0) {
                let betFee:    Int = self.totalBetPool / 50;
                let betPayout: Int = self.totalBetPool - betFee;

                // Pay each winner-backer their proportional share
                let j: Int = 0;
                repeat(20) {
                    let bettor: Address? = self.bettorByIndex.get(j);
                    if (bettor != null) {
                        let rec: BetRecord? = self.bets.get(bettor!!);
                        if (rec != null && rec!!.onPlayer == msg.winner) {
                            let share: Int = betPayout * rec!!.amount / winnerBetTotal;
                            if (share > 0) {
                                send(SendParameters{
                                    to:    bettor!!,
                                    value: share,
                                    mode:  SendIgnoreErrors,
                                    body:  beginCell().endCell()
                                });
                            }
                        }
                    }
                    j += 1;
                }
            }
            // else: no bets on winner → house keeps entire bet pool
        }
    }

    // ── Emergency refund (owner only) ────────────────────────────────────────
    receive(msg: RefundAll) {
        require(context().sender == self.owner, "Only owner");
        require(!self.gameFinished,             "Game already finished");
        require(!self.refunded,                 "Already refunded");

        self.refunded = true;

        // Refund all bettors their bet amounts
        let i: Int = 0;
        repeat(20) {
            let bettor: Address? = self.bettorByIndex.get(i);
            if (bettor != null) {
                let rec: BetRecord? = self.bets.get(bettor!!);
                if (rec != null && rec!!.amount > 0) {
                    send(SendParameters{
                        to:    bettor!!,
                        value: rec!!.amount,
                        mode:  SendIgnoreErrors,
                        body:  beginCell().endCell()
                    });
                }
            }
            i += 1;
        }

        // Send stakes back to owner for manual distribution to players
        send(SendParameters{
            to:    self.owner,
            value: self.totalPot,
            mode:  SendIgnoreErrors,
            body:  beginCell().endCell()
        });
        self.totalPot    = 0;
        self.totalBetPool = 0;
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    get fun totalPot(): Int {
        return self.totalPot;
    }

    get fun totalBetPool(): Int {
        return self.totalBetPool;
    }

    get fun depositOf(player: Address): Int {
        let d: Int? = self.deposits.get(player);
        if (d == null) { return 0; }
        return d!!;
    }

    get fun betOf(bettor: Address): BetRecord? {
        return self.bets.get(bettor);
    }

    get fun isFinished(): Bool {
        return self.gameFinished;
    }
}
