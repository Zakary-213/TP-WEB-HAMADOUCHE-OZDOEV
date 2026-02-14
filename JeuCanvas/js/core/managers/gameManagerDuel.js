// GameManagerDuel gère la logique du mode Duel (1 vs 1) :
// - déplacements des deux vaisseaux
// - collisions entre leurs tirs et vaisseaux
// - gestion des gadgets (spawn aléatoire pondéré + effets)
// - délégation de la gestion des entités communes à EntityManager

import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../../systems/effectsGadget.js';
import CollisionUtils from '../../systems/collisionUtils.js';
import ParticleManager from '../../systems/particles.js';
import GestionDegats from '../../systems/gestionDegats.js';
import EntityManager from './entityManager.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';
import { pickByWeight } from '../../systems/random.js';

/**
 * Gestionnaire spécifique au mode Duel (deux vaisseaux qui s'affrontent).
 */
export default class GameManagerDuel {
	/**
	 * @param {HTMLCanvasElement} canvas - Canvas de rendu principal.
	 * @param {Object} player - Modèle de joueur (partagé pour les récompenses/skins).
	 * @param {Object} assets - Assets chargés (images, sons...).
	 */
	constructor(canvas, player, assets = {}) {
		this.canvas = canvas;
		this.player = player;
		this.assets = assets;

		// Listes d'entités utilisées dans le duel (partagées avec EntityManager)
		this.meteorites = [];
		this.ennemis = [];
		this.gadgets = [];
		this.cloudZones = [];
		this.particles = new ParticleManager();

		// Etat logique interne du duel
		this.gameState = 'playing';
		this.collisionUtils = new CollisionUtils();
		this.HIT_DURATION = 600;
		this.gestionDegats = new GestionDegats(this.HIT_DURATION);
		this.lastVaisseauX = null;
		this.lastVaisseauY = null;

		// Gestion du spawn des gadgets
		this.nextGadgetSpawn = Date.now() + 1500;
		this.gadgetSpawnDelay = 9000;

		// Table de spawn pondéré des gadgets en duel
		this.gadgetSpawnTable = [
			{ type: TYPE_GADGET.COEUR, weight: 10 },
			{ type: TYPE_GADGET.BOUCLIER, weight: 25 },
			{ type: TYPE_GADGET.ECLAIR, weight: 20 },
			{ type: TYPE_GADGET.RAFALE, weight: 20 },
			{ type: TYPE_GADGET.MIRROIRE, weight: 25 }
		];

		// Réutilise la logique d'EntityManager pour météorites, gadgets, ennemis...
		this.entityManager = new EntityManager(this);
	}

	/**
	 * Réinitialise un round de duel (appelé entre deux manches).
	 */
	resetRound() {
		// On vide simplement toutes les entités et on repart en "playing"
		this.meteorites.length = 0;
		this.ennemis.length = 0;
		this.gadgets.length = 0;
		this.cloudZones.length = 0;
		this.particles.particles.length = 0;
		this.gameState = 'playing';
		this.nextGadgetSpawn = Date.now() + 1500;
	}

	/** Empêche un vaisseau (J1 ou J2) de sortir du canvas. */
	clampVaisseauToCanvas(vaisseau) {
		if (!vaisseau) return;
		const marginX = vaisseau.largeur / 2;
		const marginY = vaisseau.hauteur / 2;
		vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
		vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
	}

	/** Met à jour et nettoie les balles d'un vaisseau du duel. */
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

	/**
	 * Gère les collisions entre les balles d'un joueur (attacker)
	 * et le vaisseau adverse (target).
	 */
	handleBulletVaisseauCollisions(attacker, target) {
		if (!attacker || !target) return;
		if (!attacker.bullets || !attacker.bullets.length) return;
		for (let i = attacker.bullets.length - 1; i >= 0; i--) {
			const bullet = attacker.bullets[i];
			// Collision rect (vaisseau) / cercle (balle) centrée
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

			// On applique un coup au vaisseau touché et on retire la balle
			this.gestionDegats.appliquerCoup(target, this);
			attacker.bullets.splice(i, 1);
		}
	}

	/** Fait apparaître un gadget spécifique en fonction de son type. */
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

	/**
	 * Met à jour un "tick" du duel : déplacements, entités et collisions.
	 */
	update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2) {
		if (this.gameState === 'gameover') return;

		if (vaisseau1) {
			// Applique le mouvement et garde la position pour certains spawns
			vaisseau1.moveInDirection(dx1, dy1);
			this.clampVaisseauToCanvas(vaisseau1);
			this.lastVaisseauX = vaisseau1.x;
			this.lastVaisseauY = vaisseau1.y;
		}
		if (vaisseau2) {
			// Idem pour le vaisseau 2
			vaisseau2.moveInDirection(dx2, dy2);
			this.clampVaisseauToCanvas(vaisseau2);
		}

		this.entityManager.updateAll([vaisseau1, vaisseau2]);
		this.updateBullets(vaisseau1);
		this.updateBullets(vaisseau2);

		// Gestion des tirs croisés : J1 touche J2 puis J2 touche J1
		this.handleBulletVaisseauCollisions(vaisseau1, vaisseau2);
		this.handleBulletVaisseauCollisions(vaisseau2, vaisseau1);
	}

	/**
	 * Point d'entrée appelé depuis script.js pour mettre à jour le mode Duel.
	 */
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

		// Spawn périodique d'un gadget en utilisant la table de poids
		const now = Date.now();
		if (now >= this.nextGadgetSpawn) {
			const gadgetType = pickByWeight(this.gadgetSpawnTable);
			this.spawnGadgetByType(gadgetType);
			this.nextGadgetSpawn = now + this.gadgetSpawnDelay;
		}

		this.update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2);

		// Met à jour les barres de vie des deux joueurs dans le HUD
		if (typeof updateBarreDeVie === 'function') {
			updateBarreDeVie();
		}
	}

	/** Dessine les deux vaisseaux du duel + leurs effets. */
	draw(ctx, vaisseau1, vaisseau2) {
		ctx.save();
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
		ctx.restore();
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
