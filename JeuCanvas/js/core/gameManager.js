import Meteorite from '../entities/meteorite.js';
import CollisionUtils from '../systems/collisionUtils.js';
import { TYPE_VAISSEAU } from '../entities/typeVaisseau.js';
import Bullet from '../entities/bullet.js';
import Ennemi from '../entities/ennemi.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from '../entities/typeMeteorite.js';
import ParticleManager from '../systems/particles.js';
import Gadget from '../entities/gadget.js';
import { TYPE_GADGET } from '../entities/typeGadget.js';
import GestionDegats from '../systems/gestionDegats.js';
import { getMeteoriteImageForType, spawnImpactParticles, spawnExplosionParticles } from '../systems/meteoriteEffects.js';

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

        this.updateMeteorites(vaisseau);
        this.updateCloudZonesAndParticles();
        this.handleBulletMeteoriteCollisions(vaisseau);
        this.updateBullets(vaisseau);
        this.updateGadgets(vaisseau);
        this.handleSpawns();
    }

    updateMeteorites(vaisseau) {
        for (let i = this.meteorites.length - 1; i >= 0; i--) {
            const meteorite = this.meteorites[i];
            meteorite.descendre();

            // DYNAMITE : tremblement avant explosion
            if (meteorite.type === TYPE_METEORITE.DYNAMITE && meteorite.explodeAfterMs !== null) {
                const elapsed = Date.now() - meteorite.spawnedAt;
                const remaining = meteorite.explodeAfterMs - elapsed;
                if (remaining > 0 && remaining <= this.HIT_DURATION) {
                    meteorite.startShake();
                }
            }

            // Explosion (DYNAMITE)
            if (meteorite.shouldExplode()) {
                spawnExplosionParticles(this.particles, meteorite);
                this.meteorites.splice(i, 1);

                if (!(vaisseau.type === TYPE_VAISSEAU.PHASE && vaisseau.isDashing)) {
                    const explosionRadius = meteorite.explosionRadius ?? (meteorite.largeur * 2);
                    const dx = vaisseau.x - meteorite.x;
                    const dy = vaisseau.y - meteorite.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq <= explosionRadius * explosionRadius) {
                        this.gestionDegats.appliquerCoup(vaisseau, this);
                    }
                }
                continue;
            }

            // Collision météorite ↔ vaisseau
            const collision = this.collisionUtils.rectCircleFromCenter(
                vaisseau.x,
                vaisseau.y,
                vaisseau.largeur,
                vaisseau.hauteur,
                meteorite.x,
                meteorite.y,
                meteorite.largeur / 2
            );

            if (collision && this.gameState === "playing") {
                if (vaisseau.type === TYPE_VAISSEAU.PHASE && vaisseau.isDashing) {
                    continue;
                }
                this.meteorites.splice(i, 1);
                this.gestionDegats.appliquerCoup(vaisseau, this);
                continue;
            }

            // Sortie du canvas
            if (meteorite.estHorsCanvas(this.canvas.height)) {
                this.meteorites.splice(i, 1);
            }
        }
    }

    updateCloudZonesAndParticles() {
        const now = Date.now();
        this.cloudZones = this.cloudZones.filter(z => z.expiresAt > now);
        this.particles.update();
    }

    handleBulletMeteoriteCollisions(vaisseau) {
        for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
            const bullet = vaisseau.bullets[b];
            for (let m = this.meteorites.length - 1; m >= 0; m--) {
                const meteorite = this.meteorites[m];
                const collision = this.collisionUtils.rectCircleFromCenter(
                    bullet.x, bullet.y, 10, 2,
                    meteorite.x, meteorite.y,
                    meteorite.largeur / 2
                );
                if (collision) {
                    if (vaisseau.type === TYPE_VAISSEAU.PHASE) {
                        spawnImpactParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        vaisseau.bullets.splice(b, 1);
                        break;
                    }

                    if (meteorite.type === TYPE_METEORITE.NUAGE) {
                        this.spawnCloudZone(meteorite);
                        spawnImpactParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
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
                        spawnImpactParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        this.spawnEclatsPieces(meteorite);
                        if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                            vaisseau.bullets.splice(b, 1);
                        }
                        break;
                    }

                    spawnImpactParticles(this.particles, meteorite);
                    meteorite.pv -= 1;
                    if (meteorite.pv <= 0) {
                        spawnExplosionParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        const goldEarned = this.getGoldForMeteorite(meteorite.type);
                        this.player.addGold(goldEarned);
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
        for (let i = this.gadgets.length - 1; i >= 0; i--) {
            const g = this.gadgets[i];
            g.update();
            if (g.canPickup(vaisseau)) {
                g.pickup(vaisseau, { canvasWidth: this.canvas.width, canvasHeight: this.canvas.height });
            }
            if (g.consumed || g.shouldDespawn(this.canvas.height)) {
                this.gadgets.splice(i, 1);
            }
        }
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

    spawnMeteorrite() {
        const type = TYPE_METEORITE.NORMAL; // Exemple: dynamite

        const x = Math.random() * this.canvas.width;
        const y = -50;

        let meteorite = null;

        const imageForType = getMeteoriteImageForType(this.assets, type);


        if (type === TYPE_METEORITE.LANCER && this.lastVaisseauX !== null && this.lastVaisseauY !== null) {
            const dx = this.lastVaisseauX - x;
            const dy = this.lastVaisseauY - y;
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
            meteorite = new Meteorite(x, y, type, { imagePath: imageForType, vx: vx * speed, vy: vy * speed });
        } else {
            meteorite = new Meteorite(x, y, type, { imagePath: imageForType });
        }

        this.meteorites.push(meteorite);
    }

    spawnEnnemi() {
        const x = this.canvas.width / 2;
        const y = 60;

        const ennemi = new Ennemi(
            x,
            y,
            this.assets.enemy || this.assets.ennemi || './assets/img/vaisseaux/ENEMY.png',
            50,
            50,
            2,
            3
        );

        this.ennemis.push(ennemi);
    }

    updateEnnemis(vaisseau) {
        const now = Date.now();

        for (let i = this.ennemis.length - 1; i >= 0; i--) {
            const ennemi = this.ennemis[i];

            ennemi.update(this.canvas.width, vaisseau.x, vaisseau.y);
            ennemi.shoot(now, vaisseau.x, vaisseau.y);
            ennemi.updateBullets(this.canvas.width, this.canvas.height);

            // Collision bullets joueur -> ennemi
            for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
                const bullet = vaisseau.bullets[b];

                const collision = this.collisionUtils.rectCircleFromCenter(
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
                        this.ennemis.splice(i, 1);
                    }
                    break;
                }
            }

            // Collision bullets ennemi -> joueur
            if (i < this.ennemis.length) {
                for (let b = ennemi.bullets.length - 1; b >= 0; b--) {
                    const bullet = ennemi.bullets[b];

                    const collision = this.collisionUtils.rectCircleFromCenter(
                        bullet.x,
                        bullet.y,
                        10,
                        2,
                        vaisseau.x,
                        vaisseau.y,
                        vaisseau.largeur / 2
                    );

                    if (collision && this.gameState === "playing") {
                        ennemi.bullets.splice(b, 1);
                        this.gestionDegats.appliquerCoup(vaisseau, this);
                        break;
                    }
                }
            }
        }
    }

    draw(ctx) {
        // Dessiner les météorites
        this.meteorites.forEach((meteorite) => {
            meteorite.draw(ctx);
        });

        // Dessiner les ennemis et leurs bullets
        this.ennemis.forEach((ennemi) => {
            ennemi.draw(ctx);
            ennemi.bullets.forEach((bullet) => {
                bullet.draw(ctx);
            });
        });

        // Dessiner les gadgets
        this.gadgets.forEach((gadget) => {
            gadget.draw(ctx);
        });

        // Dessiner les zones de nuage (flou/masque) au-dessus des météorites
        this.drawCloudZones(ctx);

        // Dessiner les particules (au-dessus pour bien voir)
        this.particles.draw(ctx);
    }

    spawnGadgetEclair() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.ECLAIR, { imagePath: this.assets.eclair });
        this.gadgets.push(gadget);
    }

    spawnGadgetBouclier() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.BOUCLIER, { imagePath: this.assets.bouclier });
        this.gadgets.push(gadget);
    }

    spawnGadgetMirroire() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.MIRROIRE, { imagePath: this.assets.mirroire });
        this.gadgets.push(gadget);
    }

    spawnGadgetRafale() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.RAFALE, { imagePath: this.assets.rafale });
        this.gadgets.push(gadget);
    }

    spawnGadgetCoeur() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(
            x,
            y,
            TYPE_GADGET.COEUR,
            {
                imagePath: this.assets.vie,
                largeur: 48,
                hauteur: 48
            }
        );
        this.gadgets.push(gadget);
    }

    drawCloudZones(ctx) {
        if (!this.cloudZones.length) return;
        ctx.save();
        this.cloudZones.forEach(zone => {
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
