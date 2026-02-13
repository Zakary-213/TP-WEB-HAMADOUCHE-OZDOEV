import ObjetGraphique from './objetGraphique.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from './types/typeMeteorite.js';

export default class Meteorite extends ObjetGraphique {
    
    constructor(x, y, type = TYPE_METEORITE.NORMAL, options = {}) {
        let config = METEORITE_CONFIG[type];
        if (!config) {
            config = METEORITE_CONFIG[TYPE_METEORITE.NORMAL];
        }

        let imagePath = config.imagePath;
        let largeur = config.largeur;
        let hauteur = config.hauteur;
        let vitesse = config.vitesse;

        if (options.imagePath !== undefined) imagePath = options.imagePath;
        if (options.largeur !== undefined) largeur = options.largeur;
        if (options.hauteur !== undefined) hauteur = options.hauteur;
        if (options.vitesse !== undefined) vitesse = options.vitesse;

        super(x, y, imagePath, largeur, hauteur, vitesse);
        this.type = type;

        this.pv = config.pv;
        if (options.pv !== undefined) {
            this.pv = options.pv;
        }

        this.vx = 0;
        if (options.vx !== undefined) {
            this.vx = options.vx;
        }

        this.vy = this.vitesse;
        if (options.vy !== undefined) {
            this.vy = options.vy;
        }

        this.canSplit = true;
        if (options.canSplit !== undefined) {
            this.canSplit = options.canSplit;
        }

        this.spawnedAt = Date.now();
        this.explodeAfterMs = null;
        if (config.explodeAfterMs !== undefined) {
            this.explodeAfterMs = config.explodeAfterMs;
        }
        if (options.explodeAfterMs !== undefined) {
            this.explodeAfterMs = options.explodeAfterMs;
        }

        this.explosionRadius = null;
        if (config.explosionRadius !== undefined) {
            this.explosionRadius = config.explosionRadius;
        }
        if (options.explosionRadius !== undefined) {
            this.explosionRadius = options.explosionRadius;
        }
        // Rotation: désactivée pour LANCER, aléatoire sinon
        this.rotationSpeed = (this.type === TYPE_METEORITE.LANCER) ? 0 : (Math.random() - 0.5) * 0.1;

        // --- tremblement comme le vaisseau ---
        this.isShaking = false;
        this.shakeIntensity = 8;
    }

    shouldExplode(now = Date.now()) {
        return this.explodeAfterMs !== null && now - this.spawnedAt >= this.explodeAfterMs;
    }

    // Faire descendre la météorite
    descendre() {
        this.y += this.vy;
        this.x += this.vx;
        this.angle += this.rotationSpeed; // Rotation pendant la descente
    }

    // Vérifier si la météorite est sortie du canvas
    estHorsCanvas(canvasHeight) {
        return this.y - this.hauteur / 2 > canvasHeight;
    }

    // --- contrôle tremblement ---
    startShake() {
        this.isShaking = true;
    }

    stopShake() {
        this.isShaking = false;
    }

    draw(ctx) {
        ctx.save();

        // Appliquer tremblement visuel (même logique que vaisseau)
        if (this.isShaking) {
            const tremblementX = (Math.random() - 0.5) * this.shakeIntensity;
            const tremblementY = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(tremblementX, tremblementY);
        }

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
