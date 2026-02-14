/**
 * @module Meteorite
 * @description Gère le cycle de vie, le mouvement, la rotation et les effets visuels 
 * (comme le tremblement) des météorites.
 */

import ObjetGraphique from './objetGraphique.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from './types/typeMeteorite.js';

/**
 * @class Meteorite
 * @extends ObjetGraphique
 * @description Classe représentant une météorite avec des propriétés physiques 
 * et des capacités d'explosion ou de division.
 */
export default class Meteorite extends ObjetGraphique {
    
    /**
     * @param {number} x - Position initiale sur l'axe X.
     * @param {number} y - Position initiale sur l'axe Y.
     * @param {string} type - Type de météorite (issu de TYPE_METEORITE).
     * @param {Object} [options={}] - Paramètres de surcharge (pv, vitesse, taille, etc.).
     */
    constructor(x, y, type = TYPE_METEORITE.NORMAL, options = {}) {
        // Récupération de la configuration de base selon le type
        const config = METEORITE_CONFIG[type] || METEORITE_CONFIG[TYPE_METEORITE.NORMAL];

        // Définition des propriétés avec priorité : Options > Config > Valeurs par défaut
        const imagePath = options.imagePath ?? config.imagePath;
        const largeur = options.largeur ?? config.largeur;
        const hauteur = options.hauteur ?? config.hauteur;
        const vitesse = options.vitesse ?? config.vitesse;

        super(x, y, imagePath, largeur, hauteur, vitesse);
        
        this.type = type;
        this.pv = options.pv ?? config.pv;
        this.vx = options.vx ?? 0;
        this.vy = options.vy ?? this.vitesse;
        this.canSplit = options.canSplit ?? true;

        // --- Logique d'explosion temporelle ---
        this.spawnedAt = Date.now();
        this.explodeAfterMs = options.explodeAfterMs ?? config.explodeAfterMs ?? null;
        this.explosionRadius = options.explosionRadius ?? config.explosionRadius ?? null;

        // --- Physique et Effets ---
        // Rotation : fixe pour les projectiles (LANCER), aléatoire pour les débris
        this.rotationSpeed = (this.type === TYPE_METEORITE.LANCER) ? 0 : (Math.random() - 0.5) * 0.1;

        // État de tremblement (feedback visuel lors des dégâts)
        this.isShaking = false;
        this.shakeIntensity = 8;
    }

    /**
     * Vérifie si le délai avant auto-explosion est dépassé.
     * @param {number} [now=Date.now()] - Temps actuel pour la comparaison.
     * @returns {boolean}
     */
    shouldExplode(now = Date.now()) {
        return this.explodeAfterMs !== null && now - this.spawnedAt >= this.explodeAfterMs;
    }

    /**
     * Met à jour la position et la rotation de la météorite.
     */
    descendre() {
        this.y += this.vy;
        this.x += this.vx;
        this.angle += this.rotationSpeed; 
    }

    /**
     * Détermine si la météorite a quitté la zone de jeu par le bas.
     * @param {number} canvasHeight - Hauteur totale du canvas.
     * @returns {boolean}
     */
    estHorsCanvas(canvasHeight) {
        return this.y - this.hauteur / 2 > canvasHeight;
    }

    /**
     * Active l'effet de tremblement visuel.
     */
    startShake() {
        this.isShaking = true;
    }

    /**
     * Désactive l'effet de tremblement visuel.
     */
    stopShake() {
        this.isShaking = false;
    }

    /**
     * Dessine la météorite avec gestion de la rotation et du tremblement.
     * @param {CanvasRenderingContext2D} ctx - Contexte de rendu 2D.
     */
    draw(ctx) {
        ctx.save();

        // 1. Application du tremblement (décalage aléatoire du contexte)
        if (this.isShaking) {
            const tremblementX = (Math.random() - 0.5) * this.shakeIntensity;
            const tremblementY = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(tremblementX, tremblementY);
        }

        // 2. Rendu de l'image avec rotation
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.drawImage(
                this.image,
                -this.largeur / 2,
                -this.hauteur / 2,
                this.largeur,
                this.hauteur
            );
        }

        ctx.restore();
    }
}