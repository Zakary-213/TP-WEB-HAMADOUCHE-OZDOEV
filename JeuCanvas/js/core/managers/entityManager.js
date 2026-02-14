// Gestionnaire central des entités dynamiques du jeu :
// - météorites (mouvements, explosions, collisions)
// - ennemis (Logique simple, tirs, collisions)
// - gadgets (spawn, ramassage, disparition)
// - particules et zones de nuage
// Il délègue les calculs au GameManager (collision, dégâts, player, etc.).

import Meteorite from '../../entities/meteorite.js';
import Bullet from '../../entities/bullet.js';
import Ennemi from '../../entities/ennemi.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import Gadget from '../../entities/gadget.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';
import { TYPE_VAISSEAU } from '../../entities/types/typeVaisseau.js';
import { getMeteoriteImageForType, spawnImpactParticles, spawnExplosionParticles } from '../../systems/meteoriteEffects.js';

/**
 * Responsable de la gestion et des interactions des entités du monde.
 * Le GameManager fournit le contexte (canvas, assets, player, systèmes de dégâts, etc.).
 */
export default class EntityManager {
	/**
	 * @param {Object} game - Instance du GameManager (ou objet équivalent)
	 * contenant les tableaux d'entités et utilitaires (collision, dégâts...).
	 */
	constructor(game) {
		// Référence vers le GameManager pour réutiliser son état et ses services
		this.game = game;
	}

	/**
	 * Met à jour toutes les entités dépendantes des vaisseaux :
	 * météorites, zones de nuage, gadgets, ennemis et leurs collisions.
	 * @param {Object|Object[]} vaisseauOrArray - Un vaisseau ou un tableau de vaisseaux.
	 */
	updateAll(vaisseauOrArray) {
		const game = this.game;
		const vaisseaux = Array.isArray(vaisseauOrArray)
			? vaisseauOrArray.filter(v => !!v)
			: [vaisseauOrArray];
		if (!vaisseaux.length) return;

		// Garder en mémoire la dernière position du vaisseau principal pour certains spawns
		game.lastVaisseauX = vaisseaux[0].x;
		game.lastVaisseauY = vaisseaux[0].y;

		this.updateMeteorites(vaisseaux);
		this.updateCloudZonesAndParticles();
		this.handleBulletMeteoriteCollisions(vaisseaux);
		this.updateGadgets(vaisseaux);
		this.updateEnnemis(vaisseaux);
	}

	/**
	 * Fait apparaître deux petites météorites d'éclats à partir
	 * d'une météorite parente (utilisé pour le type ECLATS).
	 */
	spawnEclatsPieces(parentMeteorite) {
		const game = this.game;
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

		game.meteorites.push(left, right);
	}

	/**
	 * Ajoute une zone de nuage persistante à l'endroit d'explosion
	 * d'une météorite de type NUAGE.
	 */
	spawnCloudZone(meteorite) {
		const game = this.game;
		const config = METEORITE_CONFIG[TYPE_METEORITE.NUAGE] || {};
		const radius = (config.cloudRadius !== undefined) ? config.cloudRadius : Math.max(meteorite.largeur, meteorite.hauteur) * 3;
		const duration = (config.cloudDurationMs !== undefined) ? config.cloudDurationMs : 3000;

		game.cloudZones.push({
			x: meteorite.x,
			y: meteorite.y,
			radius,
			expiresAt: Date.now() + duration,
		});
	}

	/**
	 * Met à jour la position et le comportement de toutes les météorites,
	 * gère les explosions temporisées, les collisions avec les vaisseaux
	 * et la sortie du canvas.
	 */
	updateMeteorites(vaisseaux) {
		const game = this.game;
		const meteorites = game.meteorites;

		for (let i = meteorites.length - 1; i >= 0; i--) {
			const meteorite = meteorites[i];
			meteorite.descendre();

			// timer d'explosion (dynamite, nuage, ...)
			if (meteorite.explodeAfterMs !== null) {
				const elapsed = Date.now() - meteorite.spawnedAt;
				const remaining = meteorite.explodeAfterMs - elapsed;
				// Tremblement dans la dernière fenêtre avant explosion
				if (remaining > 0 && remaining <= game.HIT_DURATION) {
					meteorite.startShake();
				}
			}

			// Explosion des météorites à timer
			if (meteorite.shouldExplode()) {
				if (game.assets && game.assets.explosion && typeof game.assets.explosion.play === 'function') {
					game.assets.explosion.play();
				}
				// Comportement spécifique selon le type
				if (meteorite.type === TYPE_METEORITE.NUAGE) {
					// Le nuage n'enlève pas de vie à l'explosion :
					// il crée seulement une zone de nuage
					this.spawnCloudZone(meteorite);
					spawnExplosionParticles(game.particles, meteorite);
					meteorites.splice(i, 1);
					continue;
				}

				// Par défaut (ex : DYNAMITE) : explosion qui peut faire des dégâts
				spawnExplosionParticles(game.particles, meteorite);
				meteorites.splice(i, 1);

				// Rayon d'effet autour de la météorite pour appliquer les dégâts
				const explosionRadius = meteorite.explosionRadius ?? (meteorite.largeur * 2);
				for (const v of vaisseaux) {
					const dx = v.x - meteorite.x;
					const dy = v.y - meteorite.y;
					const distSq = dx * dx + dy * dy;
					if (distSq <= explosionRadius * explosionRadius) {
						game.gestionDegats.appliquerCoup(v, game);
					}
				}
				continue;
			}

			// Collision météorite / vaisseaux
			let meteoriteRemoved = false;
			for (const v of vaisseaux) {
				const collision = game.collisionUtils.rectCircleFromCenter(
					v.x,
					v.y,
					v.largeur,
					v.hauteur,
					meteorite.x,
					meteorite.y,
					meteorite.largeur / 2
				);

				if (collision && game.gameState === "playing") {
					meteorites.splice(i, 1);
					game.gestionDegats.appliquerCoup(v, game);
					meteoriteRemoved = true;
					break;
				}
			}
			if (meteoriteRemoved) {
				continue;
			}

			// Sortie du canvas
			if (meteorite.estHorsCanvas(game.canvas.height)) {
				meteorites.splice(i, 1);
			}
		}
	}

	/**
	 * Nettoie les zones de nuage expirées et met à jour le système
	 * de particules global.
	 */
	updateCloudZonesAndParticles() {
		const game = this.game;
		const now = Date.now();
		game.cloudZones = game.cloudZones.filter(z => z.expiresAt > now);
		game.particles.update();
	}

	/**
	 * Gère les collisions balles / météorites, les effets associés
	 * (split, nuage, éclats, particules, gold) et les compteurs de kills.
	 * @param {Object|Object[]} vaisseauxOrVaisseau - Un ou plusieurs vaisseaux.
	 */
	handleBulletMeteoriteCollisions(vaisseauxOrVaisseau) {
		const game = this.game;
		const meteorites = game.meteorites;
		const vaisseaux = Array.isArray(vaisseauxOrVaisseau)
			? vaisseauxOrVaisseau.filter(v => !!v)
			: [vaisseauxOrVaisseau];

		for (const vaisseau of vaisseaux) {
			for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
				const bullet = vaisseau.bullets[b];
				for (let m = meteorites.length - 1; m >= 0; m--) {
					const meteorite = meteorites[m];
					const collision = game.collisionUtils.rectCircleFromCenter(
						bullet.x, bullet.y, 10, 2,
						meteorite.x, meteorite.y,
						meteorite.largeur / 2
					);
					if (!collision) continue;

					// Météorite NUAGE : transforme en nuage sans dégâts directs
					if (meteorite.type === TYPE_METEORITE.NUAGE) {
						this.spawnCloudZone(meteorite);
						spawnImpactParticles(game.particles, meteorite);
						meteorites.splice(m, 1);
						if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
							vaisseau.bullets.splice(b, 1);
						}
						break;
					}

					// Vaisseau SPLIT : duplique la balle en deux
					if (vaisseau.type === TYPE_VAISSEAU.SPLIT && !bullet.hasSplit) {
						const baseAngle = bullet.angle;
						const splitAngle = Math.PI / 6;
						const spawnOffset = 8;
						const dirX = Math.cos(baseAngle);
						const dirY = Math.sin(baseAngle);
						bullet.hasSplit = true;
						// On génère deux nouvelles balles légèrement décalées en angle
						const bullet1 = new Bullet({ x: bullet.x + dirX * spawnOffset, y: bullet.y + dirY * spawnOffset, angle: baseAngle + splitAngle });
						const bullet2 = new Bullet({ x: bullet.x + dirX * spawnOffset, y: bullet.y + dirY * spawnOffset, angle: baseAngle - splitAngle });
						bullet1.hasSplit = true;
						bullet2.hasSplit = true;
						vaisseau.bullets.push(bullet1, bullet2);
						vaisseau.bullets.splice(b, 1);
						break;
					}

					// Météorite ECLATS qui peut se diviser
					if (meteorite.type === TYPE_METEORITE.ECLATS && meteorite.canSplit) {
						spawnImpactParticles(game.particles, meteorite);
						meteorites.splice(m, 1);
						this.spawnEclatsPieces(meteorite);
						if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
							vaisseau.bullets.splice(b, 1);
						}
						break;
					}

					// Cas général : on enlève des PV à la météorite
					spawnImpactParticles(game.particles, meteorite);
					meteorite.pv -= 1;
					if (meteorite.pv <= 0) {
						if (game.assets && game.assets.explosion && typeof game.assets.explosion.play === 'function') {
							game.assets.explosion.play();
						}
						spawnExplosionParticles(game.particles, meteorite);
						meteorites.splice(m, 1);

						// ===== DUO =====
						if (game.player1DestroyedMeteorites !== undefined &&
							game.player2DestroyedMeteorites !== undefined) {

							const [vaisseau1, vaisseau2] = vaisseaux;

							if (vaisseau === vaisseau1) {
								game.player1DestroyedMeteorites++;
								console.log("DUO J1 kill :", game.player1DestroyedMeteorites);
							}

							if (vaisseau === vaisseau2) {
								game.player2DestroyedMeteorites++;
								console.log("DUO J2 kill :", game.player2DestroyedMeteorites);
							}

						}
						// ===== SOLO =====
						else if (game.playerDestroyedMeteorites !== undefined) {
							// Compteur unique utilisé pour les objectifs du mode solo
							game.playerDestroyedMeteorites++;
							console.log("SOLO kill :", game.playerDestroyedMeteorites);
						}


						if (game.onMeteoriteDestroyed) {
							game.onMeteoriteDestroyed(meteorite);
						}

						const goldEarned = this.getGoldForMeteorite(meteorite.type);
						game.player.addGold(goldEarned);
					}



					if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
						vaisseau.bullets.splice(b, 1);
					}
					break;
				}
			}
		}
	}

	/**
	 * Met à jour les gadgets (chute, ramassage) et les supprime
	 * quand ils sont consommés ou hors du canvas.
	 */
	updateGadgets(vaisseauxOrVaisseau) {
		const game = this.game;
		const vaisseaux = Array.isArray(vaisseauxOrVaisseau)
			? vaisseauxOrVaisseau.filter(v => !!v)
			: [vaisseauxOrVaisseau];
		for (let i = game.gadgets.length - 1; i >= 0; i--) {
			const g = game.gadgets[i];
			g.update();
			for (const v of vaisseaux) {
				if (g.canPickup(v)) {
					if (game.assets && game.assets.gadget && typeof game.assets.gadget.play === 'function') {
						game.assets.gadget.play();
					}
					g.pickup(v, { canvasWidth: game.canvas.width, canvasHeight: game.canvas.height });
					break;
				}
			}
			if (g.consumed || g.shouldDespawn(game.canvas.height)) {
				game.gadgets.splice(i, 1);
			}
		}
	}

	/**
	 * Fait apparaître une météorite d'un certain type
	 * à une position aléatoire en haut du canvas.
	 */
	spawnMeteorrite(type = TYPE_METEORITE.NORMAL) {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -50;

		let meteorite = null;

		const imageForType = getMeteoriteImageForType(game.assets, type);

		// Timer d'explosion aléatoire (>= 5s) pour DYNAMITE et NUAGE
		const options = { imagePath: imageForType };
		if (type === TYPE_METEORITE.DYNAMITE || type === TYPE_METEORITE.NUAGE) {
			const minDelay = 5000; // 5s minimum
			const maxDelay = 10000; // jusqu'à 10s
			options.explodeAfterMs = minDelay + Math.random() * (maxDelay - minDelay);
		}

		if (type === TYPE_METEORITE.LANCER && game.lastVaisseauX !== null && game.lastVaisseauY !== null) {
			const dx = game.lastVaisseauX - x;
			const dy = game.lastVaisseauY - y;
			const len = Math.sqrt(dx * dx + dy * dy);

			let vx = 0;
			let vy = 1;
			if (len > 0) {
				vx = dx / len;
				vy = dy / len;
			}

			// La vitesse vient de la config de Meteorite (vitesse = distance par frame)
			let speed = 0.7;
			const config = METEORITE_CONFIG[type];
			if (config && config.vitesse !== undefined) {
				speed = config.vitesse;
			}
			meteorite = new Meteorite(x, y, type, { ...options, vx: vx * speed, vy: vy * speed });
		} else {
			meteorite = new Meteorite(x, y, type, options);
		}

		game.meteorites.push(meteorite);
	}

	/**
	 * Fait apparaître un ennemi au-dessus du joueur, prêt à tirer.
	 */
	spawnEnnemi(options = {}) {
		const game = this.game;
		const {
			x = game.canvas.width / 2,
			y = 60
		} = options;

		const ennemi = new Ennemi(
			x,
			y,
			game.assets.enemy || game.assets.ennemi || './assets/img/vaisseaux/ENEMY.png',
			50,
			50,
			2,
			3
		);

		game.ennemis.push(ennemi);
	}

	/**
	 * Met à jour tous les ennemis : déplacement, tirs, collisions
	 * avec les balles des joueurs et les balles ennemies.
	 */
	updateEnnemis(vaisseauxOrVaisseau) {
		const game = this.game;
		const now = Date.now();
		const vaisseaux = Array.isArray(vaisseauxOrVaisseau)
			? vaisseauxOrVaisseau.filter(v => !!v)
			: [vaisseauxOrVaisseau];

 		for (let i = game.ennemis.length - 1; i >= 0; i--) {
			const ennemi = game.ennemis[i];
			if (!vaisseaux.length) {
				continue;
			}
			// Ciblage : en solo, il n'y a qu'un vaisseau.
			// En duo, on fait viser le joueur 1 par le premier ennemi,
			// et le joueur 2 par le second (par index).
			const targetIndex = Math.min(i, vaisseaux.length - 1);
			const target = vaisseaux[targetIndex];

			ennemi.update(game.canvas.width, target.x, target.y);
			ennemi.shoot(now, target.x, target.y);
			ennemi.updateBullets(game.canvas.width, game.canvas.height);

			// Collision bullets joueur ennemi
			for (const vaisseau of vaisseaux) {
				for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
					const bullet = vaisseau.bullets[b];

					const collision = game.collisionUtils.rectCircleFromCenter(
						bullet.x,
						bullet.y,
						10,
						2,
						ennemi.x,
						ennemi.y,
						ennemi.largeur / 2
					);

					if (collision) {
						ennemi.perdreVie(1);
						ennemi.startShake();
						setTimeout(() => ennemi.stopShake(), 200);

						vaisseau.bullets.splice(b, 1);

						if (ennemi.estMort()) {
							game.ennemis.splice(i, 1);
						}
						break;
					}
				}
			}

			// Collision bullets ennemi joueurs
			if (i < game.ennemis.length) {
				for (let b = ennemi.bullets.length - 1; b >= 0; b--) {
					const bullet = ennemi.bullets[b];
					let hit = false;
					for (const v of vaisseaux) {
						const collision = game.collisionUtils.rectCircleFromCenter(
							bullet.x,
							bullet.y,
							10,
							2,
							v.x,
							v.y,
							v.largeur / 2
						);

						if (collision && game.gameState === "playing") {
							ennemi.bullets.splice(b, 1);
							game.gestionDegats.appliquerCoup(v, game);
							hit = true;
							break;
						}
					}
					if (hit) break;
				}
			}
		}
	}

	/**
	 * Dessine toutes les entités gérées par l'EntityManager :
	 * météorites, ennemis, gadgets, zones de nuage et particules.
	 */
	draw(ctx) {
		ctx.save();
		const game = this.game;

		// Dessiner les météorites
		game.meteorites.forEach((meteorite) => {
			meteorite.draw(ctx);
		});

		// Dessiner les ennemis et leurs bullets
		game.ennemis.forEach((ennemi) => {
			ennemi.draw(ctx);
			ennemi.bullets.forEach((bullet) => {
				bullet.draw(ctx);
			});
		});

		// Dessiner les gadgets
		game.gadgets.forEach((gadget) => {
			gadget.draw(ctx);
		});

		// Dessiner les zones de nuage (flou/masque) au-dessus des météorites
		this.drawCloudZones(ctx);

		// Dessiner les particules (au-dessus pour bien voir)
		game.particles.draw(ctx);
		ctx.restore();
	}

	// Fonctions utilitaires de spawn de gadgets
	/**
	 * Fait apparaître un gadget Éclair qui augmente temporairement
	 * la vitesse du vaisseau qui le ramasse.
	 */
	spawnGadgetEclair() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.ECLAIR, { imagePath: game.assets.eclair });
		game.gadgets.push(gadget);
	}

	/**
	 * Fait apparaître un gadget Bouclier qui ajoute une protection
	 * autour du vaisseau qui le ramasse.
	 */
	spawnGadgetBouclier() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.BOUCLIER, { imagePath: game.assets.bouclier });
		game.gadgets.push(gadget);
	}

	/**
	 * Fait apparaître un gadget Mirroire qui permet de se téléporter
	 * aléatoirement sur le terrain.
	 */
	spawnGadgetMirroire() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.MIRROIRE, { imagePath: game.assets.mirroire });
		game.gadgets.push(gadget);
	}

	/**
	 * Fait apparaître un gadget Rafale qui augmente la cadence de tir
	 * du vaisseau pendant un court instant.
	 */
	spawnGadgetRafale() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.RAFALE, { imagePath: game.assets.rafale });
		game.gadgets.push(gadget);
	}

	/**
	 * Fait apparaître un Coeur qui rend une vie au joueur
	 * lorsqu'il le ramasse.
	 */
	spawnGadgetCoeur() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(
			x,
			y,
			TYPE_GADGET.COEUR,
			{
				imagePath: game.assets.vie,
				largeur: 48,
				hauteur: 48
			}
		);
		game.gadgets.push(gadget);
	}

	/**
	 * Dessine les zones de nuage (brouillard) au-dessus du champ de jeu.
	 */
	drawCloudZones(ctx) {
		ctx.save();
		const game = this.game;
		if (!game.cloudZones.length) return;
		game.cloudZones.forEach(zone => {
			const grd = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius);
			grd.addColorStop(0, 'rgba(200, 200, 200, 0.85)');
			grd.addColorStop(0.6, 'rgba(200, 200, 200, 0.6)');
			grd.addColorStop(1, 'rgba(200, 200, 200, 0.0)');
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();
	}

	/**
	 * Renvoie la quantité d'or gagnée en fonction du type de météorite détruite.
	 */
	getGoldForMeteorite(type) {
		switch (type) {
			case TYPE_METEORITE.NUAGE: return 5;
			case TYPE_METEORITE.ECLATS: return 10;
			case TYPE_METEORITE.NORMAL: return 15;
			case TYPE_METEORITE.COSTAUD: return 30;
			default: return 0;
		}
	}
}
