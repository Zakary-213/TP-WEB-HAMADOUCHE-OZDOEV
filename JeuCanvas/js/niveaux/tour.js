export default class Tour {
    constructor() {
        this.roundNumber = 1;
        this.roundWinner = null;
        this.isRoundComplete = false;
    }

    startNewRound() {
        this.roundNumber++;
        this.roundWinner = null;
        this.isRoundComplete = false;
    }

    endRound(winnerLabel) {
        this.roundWinner = winnerLabel;
        this.isRoundComplete = true;
        console.log(`Tour ${this.roundNumber} terminé - ${winnerLabel} a gagné !`);
    }

    getRoundMessage() {
        if (!this.isRoundComplete || !this.roundWinner) {
            return '';
        }
        return `${this.roundWinner} a gagné le tour ${this.roundNumber - 1}`;
    }

    getRoundNumber() {
        return this.roundNumber;
    }

    getWinner() {
        return this.roundWinner;
    }

    isComplete() {
        return this.isRoundComplete;
    }

    reset() {
        this.roundNumber = 1;
        this.roundWinner = null;
        this.isRoundComplete = false;
    }
}
