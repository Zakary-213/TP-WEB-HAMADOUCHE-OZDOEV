import Meteorite from './meteorite.js';
import CollisionUtils from './collisionUtils.js';
import { TYPE_VAISSEAU } from './typeVaisseau.js';
import Bullet from './bullet.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from './typeMeteorite.js';
import ParticleManager from './particles.js';

export default class GameManager {
    constructor(canvas, player, assets = {}) {
        this.canvas = canvas;
        this.player = player;
        this.assets = assets;
        this.meteorites = [];
        this.cloudZones = [];
        this.particles = new ParticleManager();
        this.gameState = "playing";
        this.collisionUtils = new CollisionUtils();
        this.HIT_DURATION = 600;
        this.nextMeteoriteSpawn = 0;
        this.lastVaisseauX = null;
        this.lastVaisseauY = null;
    }

    applyHitToVaisseau(vaisseau) {
        if (this.gameState !== "playing") return;

        this.gameState = "hit";
        vaisseau.startShake();
        vaisseau.perdreVie(1);

        if (vaisseau.estMort()) {
            this.setGameOver();
            return;
        }

        setTimeout(() => {
            vaisseau.stopShake();
            if (!this.isGameOver()) {
                this.gameState = "playing";
            }
        }, this.HIT_DURATION);
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

        // Si le vaisseau est déjà mort, on stoppe tout
        if (vaisseau.estMort()) {
            this.setGameOver();
            return;
        }

        // S'assurer que le vaisseau reste dans le canvas
        this.clampVaisseauToCanvas(vaisseau);

        // Garder la dernière position du vaisseau (utile pour LANCER)
        this.lastVaisseauX = vaisseau.x;
        this.lastVaisseauY = vaisseau.y;

        // Mettre à jour les météorites
        for (let i = this.meteorites.length - 1; i >= 0; i--) {
            const meteorite = this.meteorites[i];
            meteorite.descendre();

            // DYNAMITE : déclencher un tremblement juste avant explosion
            if (meteorite.type === TYPE_METEORITE.DYNAMITE && meteorite.explodeAfterMs !== null) {
                const elapsed = Date.now() - meteorite.spawnedAt;
                const remaining = meteorite.explodeAfterMs - elapsed;
                if (remaining > 0 && remaining <= this.HIT_DURATION) {
                    meteorite.startShake();
                }
            }

            // Explosion (DYNAMITE) après X ms
            if (meteorite.shouldExplode()) {
                // Particules d'explosion (palette arcade selon type)
                this.spawnExplosionParticles(meteorite);
                this.meteorites.splice(i, 1);

                // Dégâts en zone si le vaisseau est proche
                if (!(vaisseau.type === TYPE_VAISSEAU.PHASE && vaisseau.isDashing)) {
                    const explosionRadius = meteorite.explosionRadius ?? (meteorite.largeur * 2);
                    const dx = vaisseau.x - meteorite.x;
                    const dy = vaisseau.y - meteorite.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq <= explosionRadius * explosionRadius) {
                        this.applyHitToVaisseau(vaisseau);
                    }
                }

                continue;
            }

            // Collision avec le vaisseau
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
                    // On ignore la collision
                    continue;
                }

                this.meteorites.splice(i, 1);
                this.applyHitToVaisseau(vaisseau);
                continue;
            }

            // Supprimer si sortie du canvas
            if (meteorite.estHorsCanvas(this.canvas.height)) {
                this.meteorites.splice(i, 1);
            }
        }

        // Purger les zones de nuage expirées
        const now = Date.now();
        this.cloudZones = this.cloudZones.filter(z => z.expiresAt > now);

        // Mettre à jour les particules
        this.particles.update();

        // Collision bullets/meteorites
        for(let b = vaisseau.bullets.length - 1; b >= 0; b--) {
            const bullet = vaisseau.bullets[b];
            
            for(let m = this.meteorites.length - 1; m >= 0; m--) {
                const meteorite = this.meteorites[m];
                
                const collision = this.collisionUtils.rectCircleFromCenter(
                    bullet.x,
                    bullet.y,
                    10,
                    2,
                    meteorite.x,
                    meteorite.y,
                    meteorite.largeur / 2
                );
                
                if (collision) {

                    
                    if (vaisseau.type === TYPE_VAISSEAU.PHASE) {
                        // Impact visuel même si phase (optionnel)
                        this.spawnImpactParticles(meteorite);
                        this.meteorites.splice(m, 1);
                        vaisseau.bullets.splice(b, 1);
                        break;
                    }

                    // NUAGE : crée une zone de flou puis disparaît
                    if (meteorite.type === TYPE_METEORITE.NUAGE) {
                        this.spawnCloudZone(meteorite);
                        // Un léger impact visuel pour l'effet
                        this.spawnImpactParticles(meteorite);
                        this.meteorites.splice(m, 1);
                        if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                            vaisseau.bullets.splice(b, 1);
                        }
                        break;
                    }

                    if (vaisseau.type === TYPE_VAISSEAU.SPLIT && !bullet.hasSplit) {
                        

                        const baseAngle = bullet.angle;
                        const splitAngle = Math.PI / 6; // 30°
                        const spawnOffset = 8;
                        const dirX = Math.cos(baseAngle);
                        const dirY = Math.sin(baseAngle);

                        bullet.hasSplit = true;

                        const bullet1 = new Bullet({
                            x: bullet.x + dirX * spawnOffset,
                            y: bullet.y + dirY * spawnOffset,
                            angle: baseAngle + splitAngle
                        });

                        const bullet2 = new Bullet({
                            x: bullet.x + dirX * spawnOffset,
                            y: bullet.y + dirY * spawnOffset,
                            angle: baseAngle - splitAngle
                        });

                        bullet1.hasSplit = true;
                        bullet2.hasSplit = true;


                        vaisseau.bullets.push(bullet1, bullet2);
                        
                        // Supprimer la bullet d'origine
                        vaisseau.bullets.splice(b, 1);
                        
                        break;
                    }

                    // ECLATS : se découpe en 2 morceaux au premier tir
                    if (meteorite.type === TYPE_METEORITE.ECLATS && meteorite.canSplit) {
                        this.spawnImpactParticles(meteorite);
                        this.meteorites.splice(m, 1);
                        this.spawnEclatsPieces(meteorite);

                        if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                            vaisseau.bullets.splice(b, 1);
                        }

                        break;
                    }

                    // Particules d'impact par défaut
                    this.spawnImpactParticles(meteorite);
                    // Dégâts sur la météorite (ex: COSTAUD a pv=5)
                    meteorite.pv -= 1;

                    if (meteorite.pv <= 0) {
                        // Petit burst d'explosion à la destruction (arcade)
                        this.spawnExplosionParticles(meteorite);
                        this.meteorites.splice(m, 1);
                        const goldEarned = this.getGoldForMeteorite(meteorite.type);
                        this.player.addGold(goldEarned);
                        console.log(`💥 ${meteorite.type} détruite → +${goldEarned} gold`);
                    }

                    if(vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                        vaisseau.bullets.splice(b, 1);
                    }
                    
                    break;
                }
            }
        }

        // Mettre à jour les bullets
        this.updateBullets(vaisseau);

        // Vérifier Game Over après tous les dégâts possibles
        if (vaisseau.estMort()) {
            this.setGameOver();
            return;
        }

        // Spawner des météorites
        if (Date.now() > this.nextMeteoriteSpawn) {
            this.spawnMeteorrite();
            this.nextMeteoriteSpawn = Date.now() + 1000; // Spawn tous les 1000ms
        }
    }

    spawnMeteorrite() {
        const type = TYPE_METEORITE.DYNAMITE; // Exemple: dynamite

        const x = Math.random() * this.canvas.width;
        const y = -50;

        let meteorite = null;

        const imageForType = this.getMeteoriteImageForType(type);


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

    draw(ctx) {
        this.meteorites.forEach((meteorite) => {
            meteorite.draw(ctx);
        });

        // Dessiner les zones de nuage (flou/masque) au-dessus des météorites
        this.drawCloudZones(ctx);

        // Dessiner les particules (au-dessus pour bien voir)
        this.particles.draw(ctx);
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

// Image asset mapping per meteorite type
GameManager.prototype.getMeteoriteImageForType = function(type) {
    // Prefer specific assets; fallback to generic meteorite
    switch (type) {
        case TYPE_METEORITE.DYNAMITE:
            return this.assets.dyna || this.assets.meteorite;
        case TYPE_METEORITE.NUAGE:
            return this.assets.nuage || this.assets.meteorite;
        case TYPE_METEORITE.LANCER:
            return this.assets.lancer || this.assets.meteorite;
        default:
            return this.assets.meteorite;
    }
};
// --- Particles helpers ---
GameManager.prototype.getPaletteForMeteorite = function(type, kind = 'impact') {
    // Violet neon palettes per meteor type (arcade theme)
    const baseImpact = ['#9D4EDD', '#C77DFF', '#7B2CBF', '#B5179E'];
    const baseExplosion = ['#E0AAFF', '#C77DFF', '#9D4EDD', '#F72585', '#7209B7'];
    const palettes = {
        [TYPE_METEORITE.DYNAMITE]: {
            impact: baseImpact,
            explosion: [...baseExplosion, '#FF1493'] // add hot pink pop for dynamite
        },
        [TYPE_METEORITE.NORMAL]: {
            impact: baseImpact,
            explosion: baseExplosion
        },
        [TYPE_METEORITE.ECLATS]: {
            impact: ['#C77DFF', '#A06CD5', '#E0AAFF'],
            explosion: ['#E0AAFF', '#C77DFF', '#9D4EDD']
        },
        [TYPE_METEORITE.COSTAUD]: {
            impact: ['#7B2CBF', '#7209B7', '#9D4EDD'],
            explosion: ['#B5179E', '#9D4EDD', '#7209B7']
        },
        [TYPE_METEORITE.NUAGE]: {
            impact: ['#8A2BE2', '#7B2CBF', '#6C63FF'],
            explosion: ['#957FEF', '#B197FC', '#6C63FF']
        }
    };
    const entry = palettes[type] || palettes[TYPE_METEORITE.NORMAL];
    return (entry && entry[kind]) ? entry[kind] : ['#FFFFFF'];
};

GameManager.prototype.spawnImpactParticles = function(meteorite) {
    const palette = this.getPaletteForMeteorite(meteorite.type, 'impact');
    this.particles.spawnImpact({ x: meteorite.x, y: meteorite.y, palette });
};

GameManager.prototype.spawnExplosionParticles = function(meteorite) {
    const palette = this.getPaletteForMeteorite(meteorite.type, 'explosion');
    this.particles.spawnExplosion({ x: meteorite.x, y: meteorite.y, palette });
};
