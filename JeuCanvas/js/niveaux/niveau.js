/**
 * @module Niveau
 * @description Classe de base abstraite définissant la structure d'un niveau.
 * Gère le chronométrage, l'état d'avancement et la distribution des bonus (gadgets).
 */

import { TYPE_GADGET } from '../entities/types/typeGadget.js';

/**
 * @class Niveau
 * @description Fournit les fonctionnalités communes pour la gestion du temps et le spawn d'objets.
 */
export default class Niveau {
    /**
     * @param {Object} gameManager - Référence au gestionnaire de jeu pour manipuler les entités.
     */
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // --- États du niveau ---
        this.started = false;
        this.finished = false;
        
        // --- Chronométrage ---
        this.startTime = null;
        this.elapsedTime = 0;
    }

    /**
     * Initialise le chronomètre et marque le niveau comme actif.
     */
    start() {
        this.started = true;
        this.finished = false;
        // Utilisation de performance.now() pour une précision à la microseconde
        this.startTime = performance.now();
    }

    /**
     * Met à jour le temps écoulé si le niveau est en cours.
     * Cette méthode est destinée à être étendue (override) dans les classes enfants.
     */
    update() {
        if (!this.started || this.finished) return;
        
        // Calcul du temps écoulé depuis le début du niveau
        this.elapsedTime = performance.now() - this.startTime;
    }

    /**
     * @returns {number} Le temps écoulé en millisecondes.
     */
    getElapsedTime() {
        return this.elapsedTime;
    }

    /**
     * @returns {boolean} L'état de complétion du niveau.
     */
    isFinished() {
        return this.finished;
    }

    /**
     * Système de routage pour faire apparaître un bonus spécifique via le GameManager.
     * @param {string} type - Le type de gadget (issu de TYPE_GADGET).
     */
    spawnGadgetByType(type) {
        switch (type) {
            case TYPE_GADGET.COEUR:
                this.gameManager.spawnGadgetCoeur();
                break;
            case TYPE_GADGET.BOUCLIER:
                this.gameManager.spawnGadgetBouclier();
                break;
            case TYPE_GADGET.ECLAIR:
                this.gameManager.spawnGadgetEclair();
                break;
            case TYPE_GADGET.RAFALE:
                this.gameManager.spawnGadgetRafale();
                break;
            case TYPE_GADGET.MIRROIRE:
                this.gameManager.spawnGadgetMirroire();
                break;
        }
    }
}