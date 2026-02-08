import Meteorite from '../entities/meteorite.js';
import Bullet from '../entities/bullet.js';
import Ennemi from '../entities/ennemi.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from '../entities/typeMeteorite.js';
import Gadget from '../entities/gadget.js';
import { TYPE_GADGET } from '../entities/typeGadget.js';
import { TYPE_VAISSEAU } from '../entities/typeVaisseau.js';
import { getMeteoriteImageForType, spawnImpactParticles, spawnExplosionParticles } from '../systems/meteoriteEffects.js';

// Responsable de la gestion et des interactions des entités du monde
export default class EntityManager {
	constructor(game) {
		// Référence vers le GameManager pour réutiliser son état et ses services
		this.game = game;
	}

	updateAll(vaisseau) {
		const game = this.game;

		// Garder en mémoire la dernière position du vaisseau pour certains spawns
		game.lastVaisseauX = vaisseau.x;
		game.lastVaisseauY = vaisseau.y;

		this.updateMeteorites(vaisseau);
		this.updateCloudZonesAndParticles();
		this.handleBulletMeteoriteCollisions(vaisseau);
		this.updateGadgets(vaisseau);
		this.updateEnnemis(vaisseau);
	}

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

	updateMeteorites(vaisseau) {
		const game = this.game;
		const meteorites = game.meteorites;

		for (let i = meteorites.length - 1; i >= 0; i--) {
			const meteorite = meteorites[i];
			meteorite.descendre();

			// Météorites avec timer d'explosion (dynamite, nuage, ...)
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

				if (!(vaisseau.type === TYPE_VAISSEAU.PHASE && vaisseau.isDashing)) {
					const explosionRadius = meteorite.explosionRadius ?? (meteorite.largeur * 2);
					const dx = vaisseau.x - meteorite.x;
					const dy = vaisseau.y - meteorite.y;
					const distSq = dx * dx + dy * dy;
					if (distSq <= explosionRadius * explosionRadius) {
						game.gestionDegats.appliquerCoup(vaisseau, game);
					}
				}
				continue;
			}

			// Collision météorite ↔ vaisseau
			const collision = game.collisionUtils.rectCircleFromCenter(
				vaisseau.x,
				vaisseau.y,
				vaisseau.largeur,
				vaisseau.hauteur,
				meteorite.x,
				meteorite.y,
				meteorite.largeur / 2
			);

			if (collision && game.gameState === "playing") {
				if (vaisseau.type === TYPE_VAISSEAU.PHASE && vaisseau.isDashing) {
					continue;
				}
				meteorites.splice(i, 1);
				game.gestionDegats.appliquerCoup(vaisseau, game);
				continue;
			}

			// Sortie du canvas
			if (meteorite.estHorsCanvas(game.canvas.height)) {
				meteorites.splice(i, 1);
			}
		}
	}

	updateCloudZonesAndParticles() {
		const game = this.game;
		const now = Date.now();
		game.cloudZones = game.cloudZones.filter(z => z.expiresAt > now);
		game.particles.update();
	}

	handleBulletMeteoriteCollisions(vaisseau) {
		const game = this.game;
		const meteorites = game.meteorites;

		for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
			const bullet = vaisseau.bullets[b];
			for (let m = meteorites.length - 1; m >= 0; m--) {
				const meteorite = meteorites[m];
				const collision = game.collisionUtils.rectCircleFromCenter(
					bullet.x, bullet.y, 10, 2,
					meteorite.x, meteorite.y,
					meteorite.largeur / 2
				);
				if (collision) {
					if (vaisseau.type === TYPE_VAISSEAU.PHASE) {
						spawnImpactParticles(game.particles, meteorite);
						meteorites.splice(m, 1);

						if (game.onMeteoriteDestroyed) {
							game.onMeteoriteDestroyed(meteorite);
						}

						const goldEarned = this.getGoldForMeteorite(meteorite.type);
						game.player.addGold(goldEarned);

						vaisseau.bullets.splice(b, 1);
						break;
					}


					if (meteorite.type === TYPE_METEORITE.NUAGE) {
						this.spawnCloudZone(meteorite);
						spawnImpactParticles(game.particles, meteorite);
						meteorites.splice(m, 1);
						if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
							vaisseau.bullets.splice(b, 1);
						}
						break;
					}

					if (vaisseau.type === TYPE_VAISSEAU.SPLIT && !bullet.hasSplit) {
						const baseAngle = bullet.angle;
						const splitAngle = Math.PI / 6;
						const spawnOffset = 8;
						const dirX = Math.cos(baseAngle);
						const dirY = Math.sin(baseAngle);
						bullet.hasSplit = true;
						const bullet1 = new Bullet({ x: bullet.x + dirX * spawnOffset, y: bullet.y + dirY * spawnOffset, angle: baseAngle + splitAngle });
						const bullet2 = new Bullet({ x: bullet.x + dirX * spawnOffset, y: bullet.y + dirY * spawnOffset, angle: baseAngle - splitAngle });
						bullet1.hasSplit = true;
						bullet2.hasSplit = true;
						vaisseau.bullets.push(bullet1, bullet2);
						vaisseau.bullets.splice(b, 1);
						break;
					}

					if (meteorite.type === TYPE_METEORITE.ECLATS && meteorite.canSplit) {
						spawnImpactParticles(game.particles, meteorite);
						meteorites.splice(m, 1);
						this.spawnEclatsPieces(meteorite);
						if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
							vaisseau.bullets.splice(b, 1);
						}
						break;
					}

					spawnImpactParticles(game.particles, meteorite);
					meteorite.pv -= 1;
					if (meteorite.pv <= 0) {
						spawnExplosionParticles(game.particles, meteorite);
						meteorites.splice(m, 1);
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

	updateGadgets(vaisseau) {
		const game = this.game;
		for (let i = game.gadgets.length - 1; i >= 0; i--) {
			const g = game.gadgets[i];
			g.update();
			if (g.canPickup(vaisseau)) {
				g.pickup(vaisseau, { canvasWidth: game.canvas.width, canvasHeight: game.canvas.height });
			}
			if (g.consumed || g.shouldDespawn(game.canvas.height)) {
				game.gadgets.splice(i, 1);
			}
		}
	}

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

	spawnEnnemi() {
		const game = this.game;
		const x = game.canvas.width / 2;
		const y = 60;

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

	updateEnnemis(vaisseau) {
		const game = this.game;
		const now = Date.now();

		for (let i = game.ennemis.length - 1; i >= 0; i--) {
			const ennemi = game.ennemis[i];

			ennemi.update(game.canvas.width, vaisseau.x, vaisseau.y);
			ennemi.shoot(now, vaisseau.x, vaisseau.y);
			ennemi.updateBullets(game.canvas.width, game.canvas.height);

			// Collision bullets joueur -> ennemi
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

			// Collision bullets ennemi -> joueur
			if (i < game.ennemis.length) {
				for (let b = ennemi.bullets.length - 1; b >= 0; b--) {
					const bullet = ennemi.bullets[b];

					const collision = game.collisionUtils.rectCircleFromCenter(
						bullet.x,
						bullet.y,
						10,
						2,
						vaisseau.x,
						vaisseau.y,
						vaisseau.largeur / 2
					);

					if (collision && game.gameState === "playing") {
						ennemi.bullets.splice(b, 1);
						game.gestionDegats.appliquerCoup(vaisseau, game);
						break;
					}
				}
			}
		}
	}

	draw(ctx) {
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
	}

	spawnGadgetEclair() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.ECLAIR, { imagePath: game.assets.eclair });
		game.gadgets.push(gadget);
	}

	spawnGadgetBouclier() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.BOUCLIER, { imagePath: game.assets.bouclier });
		game.gadgets.push(gadget);
	}

	spawnGadgetMirroire() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.MIRROIRE, { imagePath: game.assets.mirroire });
		game.gadgets.push(gadget);
	}

	spawnGadgetRafale() {
		const game = this.game;
		const x = Math.random() * game.canvas.width;
		const y = -30;
		const gadget = new Gadget(x, y, TYPE_GADGET.RAFALE, { imagePath: game.assets.rafale });
		game.gadgets.push(gadget);
	}

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

	drawCloudZones(ctx) {
		const game = this.game;
		if (!game.cloudZones.length) return;
		ctx.save();
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

