/**
 * @module Player
 * @description Gère le profil du joueur, son économie (or) et sa collection de vaisseaux.
 * Assure la persistance des données via le localStorage.
 */

import { TYPE_VAISSEAU } from './types/typeVaisseau.js';

/**
 * @class Player
 * @description Représente l'utilisateur, ses possessions et ses préférences d'équipement.
 */
export default class Player {
    /**
     * Initialise le joueur et charge les données sauvegardées.
     */
    constructor() {
        /** @type {number} Montant total d'or possédé */
        this.gold = 0;

        /** @type {string[]} Liste des identifiants de vaisseaux débloqués */
        this.ownedShips = [];

        /** @type {string|null} Identifiant du vaisseau actuellement sélectionné pour jouer */
        this.equippedShip = null;

        // Chargement automatique au démarrage
        this.load();
    }

    // --- Gestion de l'économie (Gold) ---

    /**
     * Ajoute de l'or au solde du joueur.
     * @param {number} amount - Quantité d'or à ajouter.
     */
    addGold(amount) {
        this.gold += amount;
        this.save();
    }

    /**
     * Déduit de l'or si le solde est suffisant.
     * @param {number} amount - Prix de l'achat.
     * @returns {boolean} True si la transaction a réussi, False si solde insuffisant.
     */
    spendGold(amount) {
        if (this.gold < amount) return false;
        this.gold -= amount;
        this.save();
        return true;
    }

    // --- Gestion du Hangar (Vaisseaux) ---

    /**
     * Vérifie si le joueur possède un vaisseau spécifique.
     * @param {string} shipId - L'ID du vaisseau à vérifier.
     * @returns {boolean}
     */
    hasShip(shipId) {
        return this.ownedShips.includes(shipId);
    }

    /**
     * Ajoute un nouveau vaisseau à la collection du joueur.
     * @param {string} shipId - L'ID du vaisseau débloqué.
     */
    addShip(shipId) {
        if (!this.hasShip(shipId)) {
            this.ownedShips.push(shipId);
            this.save();
        }
    }

    /**
     * Équipe un vaisseau possédé.
     * @param {string} shipId - L'ID du vaisseau à équiper.
     * @returns {boolean} True si l'équipement est réussi.
     */
    equipShip(shipId) {
        if (!this.hasShip(shipId)) return false;
        this.equippedShip = shipId;
        this.save();
        return true;
    }

    /**
     * @returns {string|null} L'identifiant du vaisseau équipé.
     */
    getEquippedShip() {
        return this.equippedShip;
    }

    // --- Persistance des données (Save / Load) ---

    /**
     * Sauvegarde l'état actuel du joueur dans le stockage local du navigateur.
     */
    save() {
        localStorage.setItem('playerData', JSON.stringify({
            gold: this.gold,
            ownedShips: this.ownedShips,
            equippedShip: this.equippedShip
        }));
    }

    /**
     * Charge les données depuis le localStorage.
     * Initialise des valeurs par défaut si aucune sauvegarde n'est trouvée.
     */
    load() {
        const data = JSON.parse(localStorage.getItem('playerData'));
        
        if (!data) {
            // Configuration initiale par défaut pour un nouveau joueur
            this.gold = 0;
            this.ownedShips = [TYPE_VAISSEAU.NORMAL];
            this.equippedShip = TYPE_VAISSEAU.NORMAL;
            this.save();
            return;
        }

        // Utilisation de l'opérateur de coalescence (??) pour garantir l'intégrité des données
        this.gold = data.gold ?? 0;
        this.ownedShips = data.ownedShips ?? [TYPE_VAISSEAU.NORMAL];
        this.equippedShip = data.equippedShip ?? TYPE_VAISSEAU.NORMAL;
    }
}