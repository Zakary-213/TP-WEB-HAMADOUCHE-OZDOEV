import ObjetGraphique from './objetGraphique.js';
import Bullet from './bullet.js';

export default class Vaisseau extends ObjetGraphique {
    minDist = 10;
    bullets = [];
    delayMinBetweenBullets = 500; // Temps minimum entre tirs en millisecondes
    lastBulletTime = undefined;

    isDashing = false;
    dashSpeed = 5;
    dashDuration = 150; 

    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 1) {
        super(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie);
        
        // --- Partie tremblement --- 
        this.isShaking = false;
        this.shakeIntensity = 8;
    }

    moveInDirection(dx, dy) {
        // Calculer l'angle basé sur les touches flèches
        if (dx !== 0 || dy !== 0) {
            // +π/2 car l'image de base pointe vers le haut
            this.angle = Math.atan2(dy, dx) + Math.PI / 2;
            
            // Normaliser la direction
            const dist = Math.hypot(dx, dy);
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Déplacement avec vitesse
            this.x += nx * this.vitesse;
            this.y += ny * this.vitesse;
        }
    }

    addBullet(time) {
        // Calculer le temps écoulé depuis le dernier tir
        let tempEcoule = 0;
        
        if (this.lastBulletTime !== undefined) {
            tempEcoule = time - this.lastBulletTime;
        }
        
        // Tirer seulement si le délai minimum est écoulé
        if ((this.lastBulletTime === undefined) || (tempEcoule > this.delayMinBetweenBullets)) {
            // Créer une bullet avec l'angle corrigé (enlever le décalage de π/2)
            let shootAngle = this.angle - Math.PI / 2;
            this.bullets.push(new Bullet({x: this.x, y: this.y, angle: shootAngle}));
            this.lastBulletTime = time;
        }
    }

    // --- Fonctions tremblement --- 
    startShake() { // Démarrer le tremblement
        this.isShaking = true;
    }

    stopShake() { // Arrêter le tremblement
        this.isShaking = false;
    }

    draw(ctx) {
        ctx.save();

        // --- tremblement visuel (On a adapter le code du cours de la classe "EnnemiQuiTremble") ---
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

    startDash(dx, dy) {
    if (this.isDashing) return;

    this.isDashing = true;

    const dist = Math.hypot(dx, dy);
    const nx = dx / dist;
    const ny = dy / dist;

    const dashStart = performance.now();

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