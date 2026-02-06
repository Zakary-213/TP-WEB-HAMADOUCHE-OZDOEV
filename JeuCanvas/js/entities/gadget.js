import ObjetGraphique from './objetGraphique.js';
import { TYPE_GADGET, GADGET_CONFIG } from './typeGadget.js';
import CollisionUtils from '../systems/collisionUtils.js';
import { applyEclairEffect, applyRafaleEffect } from '../systems/effectsGadget.js';

// Mapping d'images (fallback)
const DEFAULT_SPRITES = {
    [TYPE_GADGET.ECLAIR]: './assets/img/gadgets/eclair.png',
    [TYPE_GADGET.BOUCLIER]: './assets/img/gadgets/bouclier.png',
    [TYPE_GADGET.MIRROIRE]: './assets/img/gadgets/mirroire.png',
    [TYPE_GADGET.RAFALE]: './assets/img/gadgets/rafale.png',
    [TYPE_GADGET.COEUR]: './assets/img/gadgets/coeur.png'
};

export default class Gadget extends ObjetGraphique {
    constructor(x, y, type, options = {}) {
        const cfg = (GADGET_CONFIG[type] !== undefined && GADGET_CONFIG[type] !== null) ? GADGET_CONFIG[type] : {};

        let imagePath;
        if (options.imagePath !== undefined && options.imagePath !== null) {
            imagePath = options.imagePath;
        } else if (DEFAULT_SPRITES[type] !== undefined && DEFAULT_SPRITES[type] !== null) {
            imagePath = DEFAULT_SPRITES[type];
        } else {
            imagePath = './assets/img/gadgets/eclair.png';
        }
        const largeur = (options.largeur !== undefined && options.largeur !== null) ? options.largeur : 32;
        const hauteur = (options.hauteur !== undefined && options.hauteur !== null) ? options.hauteur : 32;
        let vitesse;
        if (options.vitesse !== undefined && options.vitesse !== null) {
            vitesse = options.vitesse;
        } else if (options.speedY !== undefined && options.speedY !== null) {
            vitesse = options.speedY;
        } else {
            vitesse = 1.5;
        }

        super(x, y, imagePath, largeur, hauteur, vitesse);

        this.type = type;
        this.vx = (options.vx !== undefined && options.vx !== null) ? options.vx : 0;
        this.vy = (options.vy !== undefined && options.vy !== null) ? options.vy : this.vitesse;
        this.pickupRadius = (options.pickupRadius !== undefined && options.pickupRadius !== null) ? options.pickupRadius : Math.max(largeur, hauteur) * 0.6;
        this.spawnedAt = performance.now();
        this.ttlMs = (options.ttlMs !== undefined && options.ttlMs !== null) ? options.ttlMs : null; // durée de vie du gadget avant disparition (optionnel)
        this.consumed = false;

        this._collision = new CollisionUtils();
    }

    update() {
        // Descente simple (peut être ajustée avec vx/vy)
        this.x += this.vx;
        this.y += this.vy;
    }

    shouldDespawn(canvasHeight) {
        if (this.ttlMs && performance.now() - this.spawnedAt > this.ttlMs) return true;
        return this.y - this.hauteur / 2 > canvasHeight;
    }

    canPickup(vaisseau) {
        // Test collision rectangle (gadget) vs cercle (vaisseau)
        const radius = Math.max(vaisseau.largeur, vaisseau.hauteur) / 2;
        return this._collision.rectCircleFromCenter(
            this.x,
            this.y,
            this.largeur,
            this.hauteur,
            vaisseau.x,
            vaisseau.y,
            radius + this.pickupRadius * 0.2 // légère tolérance
        );
    }

    pickup(vaisseau, gameCtx) {
        if (this.consumed) return;
        this.applyEffect(vaisseau, gameCtx);
        this.consumed = true;
    }

    applyEffect(vaisseau, gameCtx) {
        const cfg = (GADGET_CONFIG[this.type] !== undefined && GADGET_CONFIG[this.type] !== null) ? GADGET_CONFIG[this.type] : {};

        // ÉCLAIR: +vitesse pendant 10s
        if (this.type === TYPE_GADGET.ECLAIR && cfg.speed) {
            const dur = (cfg.duration !== undefined && cfg.duration !== null) ? cfg.duration : 10000;
            applyEclairEffect(vaisseau, { speedDelta: cfg.speed, durationMs: dur });
        }

        // BOUCLIER: +2 PV de bouclier (charges)
        if (this.type === TYPE_GADGET.BOUCLIER && cfg.shield) {
            const currentShield = (vaisseau.shieldHP !== undefined && vaisseau.shieldHP !== null) ? vaisseau.shieldHP : 0;
            vaisseau.shieldHP = currentShield + cfg.shield;
        }

        // MIRROIRE: téléportation immédiate aléatoire
        if (this.type === TYPE_GADGET.MIRROIRE && cfg.teleport) {
            const W = (gameCtx && gameCtx.canvasWidth !== undefined && gameCtx.canvasWidth !== null) ? gameCtx.canvasWidth : 800;
            const H = (gameCtx && gameCtx.canvasHeight !== undefined && gameCtx.canvasHeight !== null) ? gameCtx.canvasHeight : 600;
            vaisseau.x = Math.random() * (W - vaisseau.largeur) + vaisseau.largeur / 2;
            vaisseau.y = Math.random() * (H - vaisseau.hauteur) + vaisseau.hauteur / 2;
        }

        // RAFALE: tir illimité pendant 10s (réduction délai entre tirs)
        if (this.type === TYPE_GADGET.RAFALE && cfg.unlimitedAmmo) {
            const dur = (cfg.duration !== undefined && cfg.duration !== null) ? cfg.duration : 10000;
            applyRafaleEffect(vaisseau, { durationMs: dur, newDelay: 10 });
        }

        // COEUR: +1 PV instantané (sans dépasser le max, et inutile si déjà full)
        if (this.type === TYPE_GADGET.COEUR && cfg.heal) {
            const currentHP = (vaisseau.pointsDeVie !== undefined && vaisseau.pointsDeVie !== null) ? vaisseau.pointsDeVie : 0;
            const maxHP = (vaisseau.pointsDeVieMax !== undefined && vaisseau.pointsDeVieMax !== null) ? vaisseau.pointsDeVieMax : 3;

            // Si déjà à la vie max, on n'applique pas le coeur
            if (currentHP >= maxHP) {
                return;
            }

            const newHP = currentHP + cfg.heal;
            vaisseau.pointsDeVie = (newHP > maxHP) ? maxHP : newHP;
        }
    }

    draw(ctx) {
        super.draw(ctx);
    }
}