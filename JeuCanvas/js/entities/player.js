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

        /** @type {Promise<void>} Dernière synchronisation serveur en cours */
        this.syncPromise = Promise.resolve();

        // Chargement automatique au démarrage
        this.load();
        this.syncWithServer();
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
        localStorage.setItem(this._getStorageKey(), JSON.stringify({
            gold: this.gold,
            ownedShips: this.ownedShips,
            equippedShip: this.equippedShip
        }));

        this._saveToServer();
    }

    /**
     * Charge les données depuis le localStorage.
     * Initialise des valeurs par défaut si aucune sauvegarde n'est trouvée.
     */
    load() {
        const data = JSON.parse(localStorage.getItem(this._getStorageKey()));
        
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

        if (!this.ownedShips.includes(TYPE_VAISSEAU.NORMAL)) {
            this.ownedShips.unshift(TYPE_VAISSEAU.NORMAL);
        }

        if (!this.ownedShips.includes(this.equippedShip)) {
            this.equippedShip = TYPE_VAISSEAU.NORMAL;
        }
    }

    /**
     * Recharge les données locales puis synchronise avec la sauvegarde serveur.
     * @returns {Promise<void>}
     */
    async syncWithServer() {
        this.load();

        const userId = this._getUserId();
        if (!userId) {
            this.syncPromise = Promise.resolve();
            return;
        }

        this.syncPromise = this._loadFromServer();
        await this.syncPromise;
    }

    _getUserId() {
        if (!window.CANVAS_API || typeof window.CANVAS_API.getUserId !== 'function') {
            return null;
        }

        return window.CANVAS_API.getUserId();
    }

    _getStorageKey() {
        const userId = this._getUserId() || 'guest';
        return `playerData_${userId}`;
    }

    async _loadFromServer() {
        const userId = this._getUserId();
        if (!userId) return;

        try {
            const query = new URLSearchParams({ userId });
            const response = await fetch(window.CANVAS_API.toUrl(`/api/canvas-profile?${query.toString()}`));
            const result = await response.json();

            if (!result.success || !result.data) {
                return;
            }

            const safeData = this._normalizeData(result.data);
            this.gold = safeData.gold;
            this.ownedShips = safeData.ownedShips;
            this.equippedShip = safeData.equippedShip;

            localStorage.setItem(this._getStorageKey(), JSON.stringify(safeData));
        } catch (error) {
            console.error('Erreur lors du chargement du profil Canvas:', error);
        }
    }

    async _saveToServer() {
        const userId = this._getUserId();
        if (!userId) return;

        const payload = {
            userId,
            gold: this.gold,
            ownedShips: this.ownedShips,
            equippedShip: this.equippedShip
        };

        try {
            await fetch(window.CANVAS_API.toUrl('/api/canvas-profile'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du profil Canvas:', error);
        }
    }

    _normalizeData(data) {
        const safeOwnedShips = Array.isArray(data.ownedShips)
            ? data.ownedShips.filter((shipId) => typeof shipId === 'string' && shipId.length > 0)
            : [TYPE_VAISSEAU.NORMAL];

        if (!safeOwnedShips.includes(TYPE_VAISSEAU.NORMAL)) {
            safeOwnedShips.unshift(TYPE_VAISSEAU.NORMAL);
        }

        const safeEquipped = typeof data.equippedShip === 'string' && safeOwnedShips.includes(data.equippedShip)
            ? data.equippedShip
            : TYPE_VAISSEAU.NORMAL;

        const safeGold = Number.isFinite(Number(data.gold)) ? Math.max(0, Number(data.gold)) : 0;

        return {
            gold: safeGold,
            ownedShips: safeOwnedShips,
            equippedShip: safeEquipped
        };
    }
}