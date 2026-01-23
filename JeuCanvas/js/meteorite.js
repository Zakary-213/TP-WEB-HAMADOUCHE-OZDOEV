import ObjetGraphique from './objetGraphique.js';

export default class Meteorite extends ObjetGraphique {
    
    constructor(x, y, imagePath, largeur, hauteur, vitesse) {
        super(x, y, imagePath, largeur, hauteur, vitesse);
        // Faire tourner légèrement la météorite
        this.rotationSpeed = (Math.random() - 0.5) * 0.1; // Vitesse de rotation aléatoire
    }

    // Faire descendre la météorite
    descendre() {
        this.y += this.vitesse;
        this.angle += this.rotationSpeed; // Rotation pendant la descente
    }

    // Vérifier si la météorite est sortie du canvas
    estHorsCanvas(canvasHeight) {
        return this.y - this.hauteur / 2 > canvasHeight;
    }
}
