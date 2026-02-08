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
	}

	// Logique complète de mise à jour du jeu en duo à partir des inputs et du levelManagerDuo.
	// Cette méthode reprend ce qui était auparavant dans updateGameStateDuo() de script.js.
	updateGameStateDuo({
		vaisseau1,
		vaisseau2,
		levelManagerDuo,
		keys,
		customKeys,
		customKeys2,
		setEtat,
		ETAT,
		updateBarreDeVie,
		chronometre,
		formatTime
	}) {
		// Si le gestionnaire duo est en game over, on ne fait rien
		if (this.gameState === 'gameover') return;

		// Joueur 1 : touches personnalisées (uniquement si le vaisseau existe encore)
		let dx1 = 0;
		let dy1 = 0;
		if (vaisseau1) {
			if (keys[customKeys.up]) dy1 = -1;
			if (keys[customKeys.down]) dy1 = 1;
			if (keys[customKeys.left]) dx1 = -1;
			if (keys[customKeys.right]) dx1 = 1;
		}

		// Joueur 2 : touches configurables (fallback ZQSD) si le vaisseau existe
		let dx2 = 0;
		let dy2 = 0;
		if (vaisseau2) {
			if (keys[customKeys2.up]) dy2 = -1;
			if (keys[customKeys2.down]) dy2 = 1;
			if (keys[customKeys2.left]) dx2 = -1;
			if (keys[customKeys2.right]) dx2 = 1;
		}

		// Mettre à jour le niveau duo (spawns météorites / gadgets)
		if (levelManagerDuo) {
			levelManagerDuo.update();
		}

		// Mise à jour des entités et déplacements
		this.update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2);

		if (typeof updateBarreDeVie === 'function') {
			updateBarreDeVie();
		}

		// Mettre à jour le chronomètre en fonction du niveau duo courant
		if (levelManagerDuo) {
			const level = levelManagerDuo.getCurrentLevel();
			if (level && chronometre && typeof formatTime === 'function') {
				chronometre.textContent = formatTime(level.getElapsedTime());
			}
		}

		// La gestion du fait de rendre vaisseau1 / vaisseau2 "null"
		// (pour arrêter l'affichage / les contrôles) reste gérée à l'extérieur,
		// car les références sont dans script.js.
		if (!vaisseau1 && !vaisseau2 && typeof setEtat === 'function' && ETAT) {
			setEtat(ETAT.GAME_OVER);
			console.log('Game Over Duo : les deux joueurs sont morts');
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

	spawnEnnemi(options) {
		this.entityManager.spawnEnnemi(options);
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

