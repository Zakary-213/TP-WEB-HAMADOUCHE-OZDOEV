import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';
import CollisionUtils from '../systems/collisionUtils.js';
import ParticleManager from '../systems/particles.js';
import GestionDegats from '../systems/gestionDegats.js';
import EntityManager from './entityManager.js';
import { TYPE_GADGET } from '../entities/typeGadget.js';
import { pickByWeight } from '../systems/random.js';

export default class GameManagerDuel {
	constructor(canvas, player, assets = {}) {
		this.canvas = canvas;
		this.player = player;
		this.assets = assets;

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

		this.nextGadgetSpawn = Date.now() + 1500;
		this.gadgetSpawnDelay = 9000;

		this.gadgetSpawnTable = [
			{ type: TYPE_GADGET.COEUR, weight: 10 },
			{ type: TYPE_GADGET.BOUCLIER, weight: 25 },
			{ type: TYPE_GADGET.ECLAIR, weight: 20 },
			{ type: TYPE_GADGET.RAFALE, weight: 20 },
			{ type: TYPE_GADGET.MIRROIRE, weight: 25 }
		];

		this.entityManager = new EntityManager(this);
	}

	resetRound() {
		this.meteorites.length = 0;
		this.ennemis.length = 0;
		this.gadgets.length = 0;
		this.cloudZones.length = 0;
		this.particles.particles.length = 0;
		this.gameState = 'playing';
		this.nextGadgetSpawn = Date.now() + 1500;
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

	handleBulletVaisseauCollisions(attacker, target) {
		if (!attacker || !target) return;
		if (!attacker.bullets || !attacker.bullets.length) return;
		for (let i = attacker.bullets.length - 1; i >= 0; i--) {
			const bullet = attacker.bullets[i];
			const collision = this.collisionUtils.rectCircleFromCenter(
				target.x,
				target.y,
				target.largeur,
				target.hauteur,
				bullet.x,
				bullet.y,
				5
			);
			if (!collision) continue;

			this.gestionDegats.appliquerCoup(target, this);
			attacker.bullets.splice(i, 1);
		}
	}

	spawnGadgetByType(type) {
		switch (type) {
			case TYPE_GADGET.COEUR:
				this.spawnGadgetCoeur();
				break;
			case TYPE_GADGET.BOUCLIER:
				this.spawnGadgetBouclier();
				break;
			case TYPE_GADGET.ECLAIR:
				this.spawnGadgetEclair();
				break;
			case TYPE_GADGET.RAFALE:
				this.spawnGadgetRafale();
				break;
			case TYPE_GADGET.MIRROIRE:
				this.spawnGadgetMirroire();
				break;
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
		}

		this.entityManager.updateAll([vaisseau1, vaisseau2]);
		this.updateBullets(vaisseau1);
		this.updateBullets(vaisseau2);

		this.handleBulletVaisseauCollisions(vaisseau1, vaisseau2);
		this.handleBulletVaisseauCollisions(vaisseau2, vaisseau1);
	}

	updateGameStateDuel({
		vaisseau1,
		vaisseau2,
		keys,
		customKeys,
		customKeys2,
		updateBarreDeVie
	}) {
		if (this.gameState === 'gameover') return;

		let dx1 = 0;
		let dy1 = 0;
		if (vaisseau1) {
			if (keys[customKeys.up]) dy1 = -1;
			if (keys[customKeys.down]) dy1 = 1;
			if (keys[customKeys.left]) dx1 = -1;
			if (keys[customKeys.right]) dx1 = 1;
		}

		let dx2 = 0;
		let dy2 = 0;
		if (vaisseau2) {
			if (keys[customKeys2.up]) dy2 = -1;
			if (keys[customKeys2.down]) dy2 = 1;
			if (keys[customKeys2.left]) dx2 = -1;
			if (keys[customKeys2.right]) dx2 = 1;
		}

		const now = Date.now();
		if (now >= this.nextGadgetSpawn) {
			const gadgetType = pickByWeight(this.gadgetSpawnTable);
			this.spawnGadgetByType(gadgetType);
			this.nextGadgetSpawn = now + this.gadgetSpawnDelay;
		}

		this.update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2);

		if (typeof updateBarreDeVie === 'function') {
			updateBarreDeVie();
		}
	}

	draw(ctx, vaisseau1, vaisseau2) {
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