/**
 * @module Gadget
 * @description Gère le cycle de vie, le mouvement et l'application des effets des bonus (gadgets) 
 * que le joueur peut ramasser en jeu.
 */

import ObjetGraphique from './objetGraphique.js';
import { TYPE_GADGET, GADGET_CONFIG } from './types/typeGadget.js';
import CollisionUtils from '../systems/collisionUtils.js';
import { applyEclairEffect, applyRafaleEffect } from '../systems/effectsGadget.js';

/**
 * Mapping d'images par défaut pour les gadgets si aucune image spécifique n'est fournie.
 * @readonly
 */
const DEFAULT_SPRITES = {
    [TYPE_GADGET.ECLAIR]: './assets/img/gadgets/eclair.png',
    [TYPE_GADGET.BOUCLIER]: './assets/img/gadgets/bouclier.png',
    [TYPE_GADGET.MIRROIRE]: './assets/img/gadgets/mirroire.png',
    [TYPE_GADGET.RAFALE]: './assets/img/gadgets/rafale.png',
    [TYPE_GADGET.COEUR]: './assets/img/gadgets/coeur.png'
};

/**
 * @class Gadget
 * @extends ObjetGraphique
 * @description Représente un item bonus tombant du haut de l'écran.
 */
export default class Gadget extends ObjetGraphique {
    /**
     * @param {number} x - Position X de départ.
     * @param {number} y - Position Y de départ.
     * @param {string} type - Type de gadget (issu de TYPE_GADGET).
     * @param {Object} [options={}] - Paramètres optionnels (vitesse, dimensions, ttl).
     */
    constructor(x, y, type, options = {}) {
        // Sélection de l'image (Priorité : Options > Mapping défaut > Fallback eclair)
        let imagePath = options.imagePath || DEFAULT_SPRITES[type] || './assets/img/gadgets/eclair.png';
        
        const largeur = options.largeur || 32;
        const hauteur = options.hauteur || 32;
        const vitesse = options.vitesse || options.speedY || 1.5;

        super(x, y, imagePath, largeur, hauteur, vitesse);

        this.type = type;
        this.vx = options.vx || 0;
        this.vy = options.vy || this.vitesse;
        
        // Rayon de détection pour le ramassage
        this.pickupRadius = options.pickupRadius || Math.max(largeur, hauteur) * 0.6;
        
        // Gestion de la durée de vie (Time To Live)
        this.spawnedAt = performance.now();
        this.ttlMs = options.ttlMs || null; 
        this.consumed = false;

        this._collision = new CollisionUtils();
    }

    /**
     * Met à jour la position du gadget selon ses vecteurs de vitesse.
     */
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    /**
     * Vérifie si le gadget doit disparaître (temps écoulé ou sortie d'écran).
     * @param {number} canvasHeight - Hauteur de la zone de jeu.
     * @returns {boolean}
     */
    shouldDespawn(canvasHeight) {
        if (this.ttlMs && performance.now() - this.spawnedAt > this.ttlMs) return true;
        return this.y - this.hauteur / 2 > canvasHeight;
    }

    /**
     * Teste si le vaisseau est assez proche pour ramasser le gadget.
     * Utilise une collision de type Rectangle (gadget) contre Cercle (vaisseau).
     * @param {Vaisseau} vaisseau 
     * @returns {boolean}
     */
    canPickup(vaisseau) {
        const radius = Math.max(vaisseau.largeur, vaisseau.hauteur) / 2;
        return this._collision.rectCircleFromCenter(
            this.x,
            this.y,
            this.largeur,
            this.hauteur,
            vaisseau.x,
            vaisseau.y,
            radius + this.pickupRadius * 0.2 // Marge de tolérance
        );
    }

    /**
     * Marque le gadget comme consommé et déclenche son effet.
     * @param {Vaisseau} vaisseau - La cible de l'effet.
     * @param {Object} gameCtx - Contexte de jeu (dimensions du canvas, etc.).
     */
    pickup(vaisseau, gameCtx) {
        if (this.consumed) return;
        this.applyEffect(vaisseau, gameCtx);
        this.consumed = true;
    }

    /**
     * Logique métier des effets selon le type de gadget.
     * @param {Vaisseau} vaisseau 
     * @param {Object} gameCtx 
     */
    applyEffect(vaisseau, gameCtx) {
        const cfg = GADGET_CONFIG[this.type] || {};

        // --- ÉCLAIR : Bonus de vitesse temporaire ---
        if (this.type === TYPE_GADGET.ECLAIR && cfg.speed) {
            const dur = cfg.duration || 10000;
            applyEclairEffect(vaisseau, { speedDelta: cfg.speed, durationMs: dur });
        }

        // --- BOUCLIER : Ajoute des points de protection ---
        if (this.type === TYPE_GADGET.BOUCLIER && cfg.shield) {
            vaisseau.shieldHP = (vaisseau.shieldHP || 0) + cfg.shield;
        }

        // --- MIROIR : Téléportation aléatoire (esquive d'urgence) ---
        if (this.type === TYPE_GADGET.MIRROIRE && cfg.teleport) {
            const W = gameCtx?.canvasWidth || 800;
            const H = gameCtx?.canvasHeight || 600;
            vaisseau.x = Math.random() * (W - vaisseau.largeur) + vaisseau.largeur / 2;
            vaisseau.y = Math.random() * (H - vaisseau.hauteur) + vaisseau.hauteur / 2;
        }

        // --- RAFALE : Cadence de tir ultra-rapide ---
        if (this.type === TYPE_GADGET.RAFALE && cfg.unlimitedAmmo) {
            const dur = cfg.duration || 10000;
            applyRafaleEffect(vaisseau, { durationMs: dur, newDelay: 10 });
        }

        // --- COEUR : Soin instantané ---
        if (this.type === TYPE_GADGET.COEUR && cfg.heal) {
            const currentHP = vaisseau.pointsDeVie || 0;
            const maxHP = vaisseau.pointsDeVieMax || 3;

            // Annule l'effet si la vie est déjà au maximum
            if (currentHP >= maxHP) return;

            const newHP = currentHP + cfg.heal;
            vaisseau.pointsDeVie = Math.min(newHP, maxHP);
        }
    }

    /**
     * Dessine le gadget sur le contexte 2D.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        super.draw(ctx);
    }
}