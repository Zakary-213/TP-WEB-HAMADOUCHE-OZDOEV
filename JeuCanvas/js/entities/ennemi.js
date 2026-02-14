/**
 * @module Ennemi
 * @description Gère le comportement, les déplacements et le système de tir des ennemis.
 */

import ObjetGraphique from "./objetGraphique.js";
import Bullet from "./bullet.js";

/**
 * @class Ennemi
 * @extends ObjetGraphique
 * @description Représente une entité ennemie capable de se déplacer latéralement et de viser le joueur.
 */
export default class Ennemi extends ObjetGraphique {
    /**
     * @param {number} x - Position initiale en X.
     * @param {number} y - Position initiale en Y.
     * @param {string|HTMLImageElement} imagePath - Chemin de l'image ou objet image.
     * @param {number} largeur - Largeur de l'ennemi.
     * @param {number} hauteur - Hauteur de l'ennemi.
     * @param {number} vitesse - Vitesse de déplacement.
     * @param {number} [pointsDeVie=3] - Points de vie initiaux.
     */
    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 3) {
        super(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie);

        // --- Système de combat ---
        this.bullets = [];
        this.delayMinBetweenBullets = 3000; // Délai de recharge (en ms)
        this.lastBulletTime = undefined;

        // --- État et mouvement ---
        this.direction = 1; // 1 = droite, -1 = gauche
        this.isShaking = false;
        this.shakeIntensity = 8;
    }

    /**
     * Met à jour la position de l'ennemi et son orientation vers le joueur.
     * @param {number} canvasWidth - Largeur du canvas pour les rebonds.
     * @param {number} playerX - Position X du joueur.
     * @param {number} playerY - Position Y du joueur.
     */
    update(canvasWidth, playerX, playerY) {
        // Mouvement latéral fluide
        this.x += this.vitesse * this.direction;

        // Gestion du rebond sur les bords du canvas
        if (this.x <= this.largeur / 2 || this.x >= canvasWidth - this.largeur / 2) {
            this.direction *= -1;
        }

        // Orientation visuelle : l'ennemi regarde toujours vers le joueur
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        
        // Math.atan2 retourne l'angle en radians. 
        // On ajoute PI/2 car les images de vaisseaux pointent souvent vers le haut par défaut.
        this.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    /**
     * Gère la logique de tir automatique vers le joueur.
     * @param {number} time - Temps actuel (timestamp).
     * @param {number} playerX - Position X de la cible.
     * @param {number} playerY - Position Y de la cible.
     */
    shoot(time, playerX, playerY) {
        let tempEcoule = 0;
        
        if (this.lastBulletTime !== undefined) {
            tempEcoule = time - this.lastBulletTime;
        }
        
        // Vérification du cooldown (délai de recharge)
        if ((this.lastBulletTime === undefined) || (tempEcoule > this.delayMinBetweenBullets)) {
            
            // Calcul du vecteur directionnel vers le joueur
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const shootAngle = Math.atan2(dy, dx);
            
            this.bullets.push(new Bullet({
                x: this.x,
                y: this.y,
                angle: shootAngle,
                color: 'red'
            }));
            
            this.lastBulletTime = time;
        }
    }

    /**
     * Met à jour la position des projectiles de l'ennemi et nettoie ceux hors écran.
     * @param {number} canvasWidth 
     * @param {number} canvasHeight 
     */
    updateBullets(canvasWidth, canvasHeight) {
        // Parcours inversé pour permettre la suppression (splice) sans sauter d'index
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.move(canvasWidth, canvasHeight);

            // Nettoyage de la mémoire si le projectile quitte l'écran
            if (bullet.estHorsCanvas(canvasWidth, canvasHeight)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    /**
     * Active l'effet visuel de tremblement (utile lors d'un impact).
     */
    startShake() {
        this.isShaking = true;
    }

    /**
     * Désactive l'effet visuel de tremblement.
     */
    stopShake() {
        this.isShaking = false;
    }
}