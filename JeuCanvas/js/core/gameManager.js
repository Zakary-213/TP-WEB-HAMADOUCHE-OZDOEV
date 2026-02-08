import CollisionUtils from '../systems/collisionUtils.js';
import ParticleManager from '../systems/particles.js';
import GestionDegats from '../systems/gestionDegats.js';
import EntityManager from './entityManager.js';

export default class GameManager {
    constructor(canvas, player, assets = {}) {
        this.canvas = canvas;
        this.player = player;
        this.assets = assets;
        this.meteorites = [];
        this.ennemis = [];
        this.gadgets = [];
        this.cloudZones = [];
        this.particles = new ParticleManager();
        this.gameState = "playing";
        this.collisionUtils = new CollisionUtils();
        this.HIT_DURATION = 600;
        this.gestionDegats = new GestionDegats(this.HIT_DURATION);
        this.nextMeteoriteSpawn = 0;
        this.nextEnnemiSpawn = Date.now() + 5000; // Premier ennemi après 5 secondes
        this.nextGadgetSpawn = Date.now() + 500; // premier gadget rapidement
        this.lastVaisseauX = null;
        this.lastVaisseauY = null;

        // Gestion centralisée des entités et de leurs interactions
        this.entityManager = new EntityManager(this);

        // Callback appelé lorsqu'une météorite est détruite (configuré depuis l'extérieur)
        this.onMeteoriteDestroyed = null;
    }

    spawnEclatsPieces(parentMeteorite) {
        const offsetX = parentMeteorite.largeur * 0.4;
        const childLargeur = Math.max(16, parentMeteorite.largeur * 0.6);
        const childHauteur = Math.max(16, parentMeteorite.hauteur * 0.6);
        const childVitesse = parentMeteorite.vitesse * 1.1;
        const driftX = 0.15;

        const left = new Meteorite(
            parentMeteorite.x - offsetX,
            parentMeteorite.y,
            TYPE_METEORITE.ECLATS,
            {
                largeur: childLargeur,
                hauteur: childHauteur,
                vitesse: childVitesse,
                pv: 1,
                vx: -driftX,
                canSplit: false,
            }
        );
        const right = new Meteorite(
            parentMeteorite.x + offsetX,
            parentMeteorite.y,
            TYPE_METEORITE.ECLATS,
            {
                largeur: childLargeur,
                hauteur: childHauteur,
                vitesse: childVitesse,
                pv: 1,
                vx: driftX,
                canSplit: false,
            }
        );

        this.meteorites.push(left, right);
    }

    spawnCloudZone(meteorite) {
        const config = METEORITE_CONFIG[TYPE_METEORITE.NUAGE] || {};
        const radius = (config.cloudRadius !== undefined) ? config.cloudRadius : Math.max(meteorite.largeur, meteorite.hauteur) * 3;
        const duration = (config.cloudDurationMs !== undefined) ? config.cloudDurationMs : 3000;

        this.cloudZones.push({
            x: meteorite.x,
            y: meteorite.y,
            radius,
            expiresAt: Date.now() + duration,
        });
    }

    isHit() {
        return this.gameState === "hit";
    }

    isGameOver() {
        return this.gameState === "gameover";
    }

    setGameOver() {
        this.gameState = "gameover";
    }

    clampVaisseauToCanvas(vaisseau) {
        const marginX = vaisseau.largeur / 2;
        const marginY = vaisseau.hauteur / 2;
        vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
        vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
    }

    updateBullets(vaisseau) {
        for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
            const bullet = vaisseau.bullets[i];
            bullet.move(this.canvas.width, this.canvas.height);

            if (bullet.estHorsCanvas(this.canvas.width, this.canvas.height) && bullet.bounces === 0) 
            {
                vaisseau.bullets.splice(i, 1);
            }

        }
    }

    update(vaisseau) {
        if (this.isGameOver()) return;

        if (vaisseau.estMort()) {
            this.setGameOver();
            return;
        }

        // Mise à jour position du vaisseau + cache pour certains spawns
        this.clampVaisseauToCanvas(vaisseau);
        this.lastVaisseauX = vaisseau.x;
        this.lastVaisseauY = vaisseau.y;

        // Déléguer la mise à jour des entités au EntityManager
        this.entityManager.updateAll(vaisseau);
        this.updateBullets(vaisseau);
        //this.handleSpawns();
    }

    handleSpawns() {
        const now = Date.now();

        // Spawns météorites
        if (now > this.nextMeteoriteSpawn) {
            this.spawnMeteorrite();
            this.nextMeteoriteSpawn = now + 1000;
        }

        // Spawner uniquement le gadget Coeur périodiquement pour test
        if (now > this.nextGadgetSpawn) {
            this.spawnGadgetBouclier();
            this.nextGadgetSpawn = now + 5000; // toutes 5s
        }
    }

    // --- Délégations vers l'EntityManager pour garder la compatibilité externe ---

    draw(ctx) {
        this.entityManager.draw(ctx);
    }

    spawnMeteorrite(type) {
        this.entityManager.spawnMeteorrite(type);
    }

    spawnEnnemi() {
        this.entityManager.spawnEnnemi();
    }

    spawnGadgetEclair() {
        this.entityManager.spawnGadgetEclair();
    }

    spawnGadgetBouclier() {
        this.entityManager.spawnGadgetBouclier();
    }

    spawnGadgetMirroire() {
        this.entityManager.spawnGadgetMirroire();
    }

    spawnGadgetRafale() {
        this.entityManager.spawnGadgetRafale();
    }

    spawnGadgetCoeur() {
        this.entityManager.spawnGadgetCoeur();
    }
}
