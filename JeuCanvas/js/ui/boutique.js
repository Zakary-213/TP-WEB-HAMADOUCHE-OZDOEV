/**
 * @module Boutique
 * @description Gère le système d'achat et d'équipement des vaisseaux, ainsi que 
 * l'interface utilisateur du carrousel de la boutique.
 */

import { TYPE_VAISSEAU } from '../entities/types/typeVaisseau.js';

/**
 * @class Boutique
 * @description Logique interne de la boutique : catalogue, vérification des prix et transactions.
 */
export default class Boutique {
    /**
     * @param {Player} player - L'instance du joueur pour gérer l'or et l'inventaire.
     */
    constructor(player) {
        this.player = player;

        /** @type {Array<Object>} Catalogue des vaisseaux disponibles */
        this.ships = [
            {
                id: TYPE_VAISSEAU.NORMAL,
                name: "Vaisseau Classique",
                description: "Équilibré et fiable pour débuter.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.SPLIT,
                name: "Vaisseau Split",
                description: "Tirs qui se divisent à l’impact.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.SPREAD,
                name: "Vaisseau Spread",
                description: "Tir double pour couvrir plus de zone.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.RICOCHET,
                name: "Vaisseau Ricochet",
                description: "Les balles rebondissent sur les bords du canvas.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.PIERCE,
                name: "Vaisseau Pierce",
                description: "Les tirs traversent plusieurs météorites.",
                price: 0
            }
        ];
    }

    // --- Accesseurs (Getters) ---

    /** @returns {Array} La liste complète des vaisseaux du catalogue. */
    getAllShips() {
        return this.ships;
    }

    /** @param {string} shipId @returns {Object|undefined} */
    getShipById(shipId) {
        return this.ships.find(ship => ship.id === shipId);
    }

    /** @param {string} shipId @returns {boolean} */
    isOwned(shipId) {
        return this.player.hasShip(shipId);
    }

    /** @param {string} shipId @returns {boolean} */
    isEquipped(shipId) {
        return this.player.getEquippedShip() === shipId;
    }

    // --- Logique d'Achat ---

    /**
     * Vérifie si un vaisseau peut être acheté.
     * @param {string} shipId 
     * @returns {boolean}
     */
    canBuy(shipId) {
        const ship = this.getShipById(shipId);
        if (!ship || this.isOwned(shipId)) return false;
        return this.player.gold >= ship.price;
    }

    /**
     * Effectue la transaction d'achat.
     * @param {string} shipId 
     * @returns {boolean} True si l'achat est validé.
     */
    buy(shipId) {
        const ship = this.getShipById(shipId);

        if (!ship) {
            console.warn("Vaisseau inexistant :", shipId);
            return false;
        }

        if (this.isOwned(shipId)) {
            console.warn("Vaisseau déjà possédé");
            return false;
        }

        if (this.player.gold < ship.price) {
            console.warn("Pas assez de gold");
            return false;
        }

        // Débit du compte et ajout à l'inventaire
        this.player.spendGold(ship.price);
        this.player.addShip(shipId);
        return true;
    }

    /**
     * Équipe le vaisseau sélectionné.
     * @param {string} shipId 
     */
    equip(shipId) {
        return this.player.equipShip(shipId);
    }
}

/**
 * @class BoutiqueUI
 * @description Gère l'affichage du carrousel de la boutique et les interactions DOM.
 */
export class BoutiqueUI {
    /**
     * @param {Player} player - Instance du joueur.
     */
    constructor(player) {
        this.player = player;
        this.boutique = new Boutique(player);
        
        // Liste ordonnée des vaisseaux pour le carrousel
        this.shipIds = [
            TYPE_VAISSEAU.NORMAL,
            TYPE_VAISSEAU.SPLIT,
            TYPE_VAISSEAU.SPREAD,
            TYPE_VAISSEAU.RICOCHET,
            TYPE_VAISSEAU.PIERCE
        ];
        
        this.currentShipIndex = 0;

        // Références DOM
        this.buyButton = document.querySelector('.ship-action');
        this.shopGold = document.querySelector('.shop-gold');
        this.shopShips = document.querySelectorAll('.ship');
        this.shopName = document.querySelector('.ship-name');
        this.shopDescription = document.querySelector('.ship-description');
        this.shopStatus = document.querySelector('.ship-status');
        this.carouselLeftButton = document.querySelector('.shop-arrow.left');
        this.carouselRightButton = document.querySelector('.shop-arrow.right');

        this._initListeners();
        this.updateGold();
        this.updateShipInfo();
    }

    /**
     * Initialise les écouteurs d'événements pour la navigation et l'achat.
     * @private
     */
    _initListeners() {
        // Navigation Gauche
        this.carouselLeftButton?.addEventListener('click', () => {
            const total = this.shipIds.length;
            this.currentShipIndex = (this.currentShipIndex - 1 + total) % total;
            this.updateShipInfo();
        });

        // Navigation Droite
        this.carouselRightButton?.addEventListener('click', () => {
            const total = this.shipIds.length;
            this.currentShipIndex = (this.currentShipIndex + 1) % total;
            this.updateShipInfo();
        });

        // Action principale (Acheter / Équiper)
        this.buyButton?.addEventListener('click', () => {
            const currentShipId = this.shipIds[this.currentShipIndex];

            // Cas : Achat
            if (!this.player.hasShip(currentShipId)) {
                if (this.boutique.buy(currentShipId)) {
                    this.updateGold();
                    this.player.equipShip(currentShipId);
                    this.updateShipInfo();
                }
                return;
            }

            // Cas : Équiper
            if (this.player.getEquippedShip() !== currentShipId) {
                this.player.equipShip(currentShipId);
                this.updateShipInfo();
            }
        });
    }

    /** Met à jour l'affichage du solde du joueur. */
    updateGold() {
        if (this.shopGold) this.shopGold.textContent = `💰 ${this.player.gold}`;
    }

    /**
     * Met à jour l'ensemble des textes, images et états du carrousel.
     */
    updateShipInfo() {
        const total = this.shipIds.length;
        if (total === 0) return;

        const currentShipId = this.shipIds[this.currentShipIndex];
        const shipData = this.boutique.getShipById(currentShipId);

        // 1. Mise à jour des textes descriptifs
        if (this.shopName) this.shopName.textContent = shipData?.name || currentShipId;
        if (this.shopDescription) this.shopDescription.textContent = shipData?.description || "";

        // 2. Mise à jour du statut (Possédé, Équipé, etc.)
        this._updateActionStatus(currentShipId);

        // 3. Mise à jour visuelle du carrousel (Images)
        this._updateCarouselVisuals(total);
    }

    /**
     * Gère l'affichage du bouton d'action et du label de statut.
     * @private
     */
    _updateActionStatus(shipId) {
        const isOwned = this.player.hasShip(shipId);
        const isEquipped = this.player.getEquippedShip() === shipId;

        if (!isOwned) {
            this.shopStatus.textContent = "🔒 Non possédé";
            this.buyButton.textContent = "Acheter";
        } else if (!isEquipped) {
            this.shopStatus.textContent = "✅ Acheté";
            this.buyButton.textContent = "Équiper";
        } else {
            this.shopStatus.textContent = "✔ Équipé";
            this.buyButton.textContent = "Équipé";
        }
    }

    /**
     * Calcule et place les images pour l'effet de carrousel (Gauche, Centre, Droite).
     * @private
     */
    _updateCarouselVisuals(total) {
        const prevIndex = (this.currentShipIndex - 1 + total) % total;
        const nextIndex = (this.currentShipIndex + 1) % total;

        const getImg = (id) => `assets/img/vaisseaux/${id}.png`;

        const slots = [
            { el: this.shopShips[0], idx: prevIndex, pos: 'left' },
            { el: this.shopShips[1], idx: this.currentShipIndex, pos: 'center' },
            { el: this.shopShips[2], idx: nextIndex, pos: 'right' }
        ];

        slots.forEach(slot => {
            if (!slot.el) return;
            const shipId = this.shipIds[slot.idx];
            slot.el.src = getImg(shipId);
            slot.el.classList.remove('left', 'center', 'right');
            slot.el.classList.add(slot.pos);
        });
    }
}