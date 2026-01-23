import ObjetGraphique from './objetGraphique.js';

export default class Vaisseau extends ObjetGraphique {
    minDist = 10;

    constructor(x, y, imagePath, largeur, hauteur, vitesse) {
        super(x, y, imagePath, largeur, hauteur, vitesse);
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
}