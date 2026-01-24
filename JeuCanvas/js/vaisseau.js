import ObjetGraphique from './objetGraphique.js';

export default class Vaisseau extends ObjetGraphique {
    minDist = 10;

    constructor(x, y, imagePath, largeur, hauteur, vitesse) {
        super(x, y, imagePath, largeur, hauteur, vitesse);
        
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

}