import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';
import CollisionUtils from '../systems/collisionUtils.js';
import ParticleManager from '../systems/particles.js';
import GestionDegats from '../systems/gestionDegats.js';
import EntityManager from './entityManager.js';


export default class GameManagerDuo {
	constructor(canvas, player, assets = {}) {
		this.canvas = canvas;
		this.player = player;
		this.assets = assets;

		// Listes d'entités, comme en solo
		this.meteorites = [];
		this.ennemis = [];
		this.gadgets = [];
		this.cloudZones = [];
		this.particles = new ParticleManager();
		this.gameState = 'playing';
		this.collisionUtils = new CollisionUtils();
		this.HIT_DURATION = 600;
		this.gestionDegats = new GestionDegats(this.HIT_DURATION);
		this.lastVaisseauX = null;
		this.lastVaisseauY = null;
		this.nextMeteoriteSpawn = Date.now() + 1000; // première météorite dans ~1s

		// Gestion centralisée des entités (météorites, gadgets, ennemis...)
		this.entityManager = new EntityManager(this);

		// Callback optionnelle quand une météorite est détruite
		this.onMeteoriteDestroyed = null;
	}

	clampVaisseauToCanvas(vaisseau) {
		if (!vaisseau) return;
		const marginX = vaisseau.largeur / 2;
		const marginY = vaisseau.hauteur / 2;
		vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
		vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
	}

	updateBullets(vaisseau) {
		if (!vaisseau || !vaisseau.bullets) return;
		for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
			const bullet = vaisseau.bullets[i];
			bullet.move(this.canvas.width, this.canvas.height);

			if (bullet.estHorsCanvas(this.canvas.width, this.canvas.height) && bullet.bounces === 0) {
				vaisseau.bullets.splice(i, 1);
			}
		}
	}

	update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2) {
		if (this.gameState === 'gameover') return;

		if (vaisseau1) {
			vaisseau1.moveInDirection(dx1, dy1);
			this.clampVaisseauToCanvas(vaisseau1);
			this.lastVaisseauX = vaisseau1.x;
			this.lastVaisseauY = vaisseau1.y;
		}
		if (vaisseau2) {
			vaisseau2.moveInDirection(dx2, dy2);
			this.clampVaisseauToCanvas(vaisseau2);
			// Pour l'instant on garde la dernière position du joueur 1
		}

		// Mise à jour des entités et des collisions pour le joueur 1
		this.entityManager.updateAll([vaisseau1, vaisseau2]);
		if (vaisseau1) this.updateBullets(vaisseau1);
		if (vaisseau2) this.updateBullets(vaisseau2);

		// Spawns simples de météorites normales en mode duo
		const now = Date.now();
		if (now > this.nextMeteoriteSpawn) {
			// Sans paramètre -> TYPE_METEORITE.NORMAL par défaut dans EntityManager
			this.spawnMeteorrite();
			this.nextMeteoriteSpawn = now + 1200; // une météorite environ toutes les 1.2s
		}
	}

	draw(ctx, vaisseau1, vaisseau2) {
		// Dessiner toutes les entités (météorites, ennemis, gadgets, nuages, particules)
		this.entityManager.draw(ctx);

		if (vaisseau1) {
			vaisseau1.draw(ctx);
			drawShieldBubble(ctx, vaisseau1);
			drawEclairBar(ctx, vaisseau1);
			drawRafaleBar(ctx, vaisseau1);
		}

		if (vaisseau2) {
			vaisseau2.draw(ctx);
			drawShieldBubble(ctx, vaisseau2);
			drawEclairBar(ctx, vaisseau2);
			drawRafaleBar(ctx, vaisseau2);
		}
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

