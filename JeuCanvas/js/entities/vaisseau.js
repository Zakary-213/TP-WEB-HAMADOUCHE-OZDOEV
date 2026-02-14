/**
 * @module Vaisseau
 * @description Gère les comportements du joueur : déplacements, tirs spécialisés, 
 * effets de tremblement et capacités spéciales (Dash).
 */

import ObjetGraphique from './objetGraphique.js';
import Bullet from './bullet.js';
import { TYPE_VAISSEAU } from './types/typeVaisseau.js';

/**
 * @class Vaisseau
 * @extends ObjetGraphique
 * @description Représente le vaisseau contrôlé par le joueur avec ses différentes variantes de tir.
 */
export default class Vaisseau extends ObjetGraphique {
    // --- Propriétés de combat ---
    minDist = 10;
    bullets = [];
    delayMinBetweenBullets = 500; 
    lastBulletTime = undefined;

    // --- Propriétés de mouvement spécial (Dash) ---
    isDashing = false;
    dashSpeed = 5;
    dashDuration = 150; 

    /**
     * @param {number} x - Position X initiale.
     * @param {number} y - Position Y initiale.
     * @param {HTMLImageElement|string} imagePath - Ressource graphique.
     * @param {number} largeur - Largeur du vaisseau.
     * @param {number} hauteur - Hauteur du vaisseau.
     * @param {number} vitesse - Vitesse de déplacement standard.
     * @param {number} [pointsDeVie=1] - Points de vie de départ.
     * @param {string} [type=TYPE_VAISSEAU.NORMAL] - Type de vaisseau pour les variantes de tir.
     */
    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 1, type = TYPE_VAISSEAU.NORMAL) {
        super(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie);
        this.type = type;
        
        /** @type {number} Stockage des PV max pour limiter les soins (objets Coeur) */
        this.pointsDeVieMax = pointsDeVie;
        
        // --- Feedback visuel --- 
        this.isShaking = false;
        this.shakeIntensity = 8;
        this.debugHitbox = true;
    }

    /**
     * Déplace le vaisseau dans une direction donnée et oriente son angle.
     * @param {number} dx - Direction horizontale (-1, 0, 1).
     * @param {number} dy - Direction verticale (-1, 0, 1).
     */
    moveInDirection(dx, dy) {
        if (dx !== 0 || dy !== 0) {
            // Calcul de l'angle de rotation (Correction de +π/2 car l'image pointe vers le haut)
            this.angle = Math.atan2(dy, dx) + Math.PI / 2;
            
            // Normalisation du vecteur pour maintenir une vitesse constante en diagonale
            const dist = Math.hypot(dx, dy);
            const nx = dx / dist;
            const ny = dy / dist;
            
            this.x += nx * this.vitesse;
            this.y += ny * this.vitesse;
        }
    }

    /**
     * Ajoute des projectiles selon le type de vaisseau équipé.
     * @param {number} time - Temps actuel pour la gestion du délai de tir.
     */
    addBullet(time) {
        let tempEcoule = this.lastBulletTime !== undefined ? time - this.lastBulletTime : Infinity;
        
        if (tempEcoule > this.delayMinBetweenBullets) {
            // Angle de tir (On retire la correction de l'image pour tirer droit devant)
            let shootAngle = this.angle - Math.PI / 2;
            const offset = 10;

            // VARIANTE : Tir double (Perpendiculaire au vaisseau)
            if (this.type === TYPE_VAISSEAU.SPREAD) {
                // Calcul du vecteur perpendiculaire (Normalisé) pour décaler les tirs sur les côtés
                const perpX = -Math.sin(shootAngle);
                const perpY =  Math.cos(shootAngle);

                this.bullets.push(
                    new Bullet({ x: this.x + perpX * offset, y: this.y + perpY * offset, angle: shootAngle }),
                    new Bullet({ x: this.x - perpX * offset, y: this.y - perpY * offset, angle: shootAngle })
                );
            } 
            // VARIANTE : Tir rebondissant
            else if (this.type === TYPE_VAISSEAU.RICOCHET) {
                const bullet = new Bullet({ x: this.x, y: this.y, angle: shootAngle });
                bullet.bounces = 3; 
                this.bullets.push(bullet);
            }
            // VARIANTE : Tir standard
            else {
                this.bullets.push(new Bullet({ x: this.x, y: this.y, angle: shootAngle }));
            }

            this.lastBulletTime = time;
        }
    }

    /** Active le tremblement (Effet de dégâts) */
    startShake() { this.isShaking = true; }

    /** Désactive le tremblement */
    stopShake() { this.isShaking = false; }

    /**
     * Rendu graphique incluant l'effet de tremblement aléatoire.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();

        if (this.isShaking) {
            const tremblementX = (Math.random() - 0.5) * this.shakeIntensity;
            const tremblementY = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(tremblementX, tremblementY);
        }

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.drawImage(
            this.image,
            -this.largeur / 2,
            -this.hauteur / 2,
            this.largeur,
            this.hauteur
        );

        ctx.restore();
    }

    /**
     * Déclenche une accélération brutale (Dash) dans une direction donnée.
     * @param {number} dx - Vecteur X du dash.
     * @param {number} dy - Vecteur Y du dash.
     */
    startDash(dx, dy) {
        if (this.isDashing || (dx === 0 && dy === 0)) return;

        this.isDashing = true;
        const dist = Math.hypot(dx, dy);
        const nx = dx / dist;
        const ny = dy / dist;

        const dashStart = performance.now();

        /** Boucle interne pour l'animation fluide du dash */
        const dashLoop = (time) => {
            if (time - dashStart < this.dashDuration) {
                this.x += nx * this.dashSpeed;
                this.y += ny * this.dashSpeed;
                requestAnimationFrame(dashLoop);
            } else {
                this.isDashing = false;
            }
        };

        requestAnimationFrame(dashLoop);
    }
}