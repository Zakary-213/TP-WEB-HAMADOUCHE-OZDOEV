import ObjetGraphique from "./objetGraphique.js";
import Bullet from "./bullet.js";

export default class Ennemi extends ObjetGraphique {
    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 3) {
        super(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie);
        this.bullets = [];
        this.delayMinBetweenBullets = 3000; // Tir toutes les 1.5 secondes
        this.lastBulletTime = undefined;
        this.direction = 1; // 1 = droite, -1 = gauche
        this.isShaking = false;
        this.shakeIntensity = 8;
    }

    update(canvasWidth, playerX, playerY) {
        // Déplacement horizontal (droite à gauche)
        this.x += this.vitesse * this.direction;

        // Changer de direction si on touche les bords
        if (this.x <= this.largeur / 2 || this.x >= canvasWidth - this.largeur / 2) {
            this.direction *= -1;
        }

        // Calculer l'angle vers le joueur pour orienter l'ennemi
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        this.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    shoot(time, playerX, playerY) {
        let tempEcoule = 0;
        
        if (this.lastBulletTime !== undefined) {
            tempEcoule = time - this.lastBulletTime;
        }
        
        // Tirer seulement si le délai minimum est écoulé
        if ((this.lastBulletTime === undefined) || (tempEcoule > this.delayMinBetweenBullets)) {
            // Calculer l'angle vers le joueur
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

    updateBullets(canvasWidth, canvasHeight) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.move(canvasWidth, canvasHeight);

            if (bullet.estHorsCanvas(canvasWidth, canvasHeight)) {
                this.bullets.splice(i, 1);
            }
        }
    }

    // --- Fonctions tremblement --- 
    startShake() { // Démarrer le tremblement
        this.isShaking = true;
    }

    stopShake() { // Arrêter le tremblement
        this.isShaking = false;
    }
}
