/**
 * @module Tour
 * @description Gère la logique séquentielle des manches (rounds) dans le mode Duel.
 * Suit le numéro du tour actuel et l'historique du gagnant de la manche.
 */

/**
 * @class Tour
 * @description Classe utilitaire pour suivre l'évolution des manches d'un duel.
 */
export default class Tour {
    /**
     * Initialise les propriétés du tour à leur état de départ.
     */
    constructor() {
        /** @type {number} Numéro de la manche actuelle */
        this.roundNumber = 1;

        /** @type {string|null} Nom ou étiquette du gagnant de la manche en cours */
        this.roundWinner = null;

        /** @type {boolean} État de la manche actuelle */
        this.isRoundComplete = false;
    }

    /**
     * Incrémente le compteur de tour et réinitialise les données de victoire 
     * pour entamer une nouvelle manche.
     */
    startNewRound() {
        this.roundNumber++;
        this.roundWinner = null;
        this.isRoundComplete = false;
    }

    /**
     * Enregistre la fin d'une manche avec son gagnant.
     * @param {string} winnerLabel - Le nom du joueur ayant remporté le point (ex: "Joueur 1").
     */
    endRound(winnerLabel) {
        this.roundWinner = winnerLabel;
        this.isRoundComplete = true;
        console.log(`Tour ${this.roundNumber} terminé - ${winnerLabel} a gagné !`);
    }

    /**
     * Génère un message récapitulatif du résultat de la manche précédente.
     * @returns {string} Le message de victoire ou une chaîne vide si le tour n'est pas fini.
     */
    getRoundMessage() {
        if (!this.isRoundComplete || !this.roundWinner) {
            return '';
        }
        // On affiche le numéro du tour qui vient de se terminer
        return `${this.roundWinner} a gagné le tour ${this.roundNumber}`;
    }

    /**
     * @returns {number} Le numéro de la manche actuelle.
     */
    getRoundNumber() {
        return this.roundNumber;
    }

    /**
     * @returns {string|null} Le gagnant de la dernière manche finie.
     */
    getWinner() {
        return this.roundWinner;
    }

    /**
     * @returns {boolean} True si la manche en cours est terminée.
     */
    isComplete() {
        return this.isRoundComplete;
    }

    /**
     * Remet le gestionnaire de tours à zéro (score 0-0, retour au Tour 1).
     */
    reset() {
        this.roundNumber = 1;
        this.roundWinner = null;
        this.isRoundComplete = false;
    }
}