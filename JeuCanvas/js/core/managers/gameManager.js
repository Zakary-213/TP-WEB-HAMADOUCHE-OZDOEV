// GameManager gère la logique principale du mode solo :
// - mise à jour du vaisseau joueur
// - météorites (spawn, déplacement, collisions, explosions)
// - ennemis
// - gadgets
// - particules et zones de nuage
// Il ne gère qu'un seul joueur ; pour le duo, voir GameManagerDuo.

import Meteorite from '../../entities/meteorite.js';
import CollisionUtils from '../../systems/collisionUtils.js';
import { TYPE_VAISSEAU } from '../../entities/types/typeVaisseau.js';
import Bullet from '../../entities/bullet.js';
import Ennemi from '../../entities/ennemi.js';
import { METEORITE_CONFIG, TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import ParticleManager from '../../systems/particles.js';
import Gadget from '../../entities/gadget.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';
import GestionDegats from '../../systems/gestionDegats.js';
import { getMeteoriteImageForType, spawnImpactParticles, spawnExplosionParticles } from '../../systems/meteoriteEffects.js';

/**
 * Gestionnaire principal du jeu en solo.
 * Coordonne les entités (météorites, ennemis, gadgets) et
 * applique les règles de dégâts / game over.
 */
export default class GameManager {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas de rendu principal.
     * @param {Object} player - Modèle de joueur (or, vaisseau équipé, etc.).
     * @param {Object} assets - Assets chargés (images, sons...).
     */
    constructor(canvas, player, assets = {}) {
        this.canvas = canvas;
        this.player = player;
        this.assets = assets;

        // Listes d'entités actuellement actives dans la scène
        this.meteorites = [];
        this.ennemis = [];
        this.gadgets = [];
        this.cloudZones = [];
        this.particles = new ParticleManager();

        // Etat logique interne du GameManager (indépendant d'ETAT global)
        this.gameState = "playing";

        // Utilitaires de logique
        this.collisionUtils = new CollisionUtils();
        this.HIT_DURATION = 600;
        this.gestionDegats = new GestionDegats(this.HIT_DURATION);

        // Timers de spawn automatiques (utilisés surtout pour les tests)
        this.nextMeteoriteSpawn = 0;
        this.nextEnnemiSpawn = Date.now() + 5000; // Premier ennemi après 5 secondes
        this.nextGadgetSpawn = Date.now() + 500; // premier gadget rapidement

        // Dernière position connue du vaisseau, utilisée par certaines météorites
        this.lastVaisseauX = null;
        this.lastVaisseauY = null;

        // Score: Nombre de météorites détruites par le joueur (pour le résumé de fin)
        this.playerDestroyedMeteorites = 0;
    }

    /**
     * Fait apparaître deux petites météorites d'éclats à partir
     * d'une météorite parente (utilisé pour le type ECLATS).
     */
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

    /**
     * Ajoute une zone de nuage persistante à l'endroit d'explosion
     * d'une météorite de type NUAGE.
     */
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

    /** Indique si le joueur est en train de subir un coup (animation hit). */
    isHit() {
        return this.gameState === "hit";
    }

    /** Indique si le GameManager est passé en état game over. */
    isGameOver() {
        return this.gameState === "gameover";
    }

    /** Force l'état interne en game over. */
    setGameOver() {
        this.gameState = "gameover";
    }

    /** Empêche le vaisseau de sortir du canvas en le clampant. */
    clampVaisseauToCanvas(vaisseau) {
        const marginX = vaisseau.largeur / 2;
        const marginY = vaisseau.hauteur / 2;
        vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
        vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
    }

    /** Met à jour toutes les balles du vaisseau et supprime celles hors canvas. */
    updateBullets(vaisseau) {
        for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
            const bullet = vaisseau.bullets[i];
            bullet.move(this.canvas.width, this.canvas.height);

            // Si la balle sort de l'écran et ne rebondit pas, on la supprime
            if (bullet.estHorsCanvas(this.canvas.width, this.canvas.height) && bullet.bounces === 0) {
                vaisseau.bullets.splice(i, 1);
            }

        }
    }

    /**
     * Point d'entrée appelé depuis script.js pour mettre à jour
     * l'état du jeu solo à chaque frame.
     */
    updateGameState({ vaisseau, levelManager, keys, customKeys, setEtat, ETAT, updateBarreDeVie, chronometre, formatTime }) {
        // Gestion du game over : si le vaisseau est mort ou inexistant,
        // on déclenche l'état GAME_OVER (une seule fois).
        if (!vaisseau || vaisseau.estMort()) {
            if (!this.isGameOver()) {
                if (typeof setEtat === 'function' && ETAT) {
                    setEtat(ETAT.GAME_OVER);
                }
                this.setGameOver();
            }
            return;
        }

        // Déplacement du vaisseau selon les touches de direction
        let dx = 0, dy = 0;
        if (keys[customKeys.up]) dy = -1;
        if (keys[customKeys.down]) dy = 1;
        if (keys[customKeys.left]) dx = -1;
        if (keys[customKeys.right]) dx = 1;
        // Appliquer le mouvement en tenant compte de la vitesse propre du vaisseau
        vaisseau.moveInDirection(dx, dy);

        // Met à jour la logique de niveau (conditions de victoire, timer, etc.)
        if (levelManager) levelManager.update();

        // Met à jour toutes les entités gérées par le GameManager
        this.update(vaisseau);

        // Rafraîchit l'affichage des vies et du temps dans le HUD
        if (typeof updateBarreDeVie === 'function') updateBarreDeVie();
        if (levelManager && chronometre && typeof formatTime === 'function') {
            const level = levelManager.getCurrentLevel();
            if (level) chronometre.textContent = formatTime(level.getElapsedTime());
        }
    }

    /**
     * Boucle interne de mise à jour du GameManager :
     * météorites, nuages, ennemis, gadgets, balles...
     */
    update(vaisseau) {
        if (this.isGameOver()) return;

        if (vaisseau.estMort()) {
            this.setGameOver();
            return;
        }

        // Met à jour la position du vaisseau + mémorise sa position
        this.clampVaisseauToCanvas(vaisseau);
        this.lastVaisseauX = vaisseau.x;
        this.lastVaisseauY = vaisseau.y;

        // Chaîne de mise à jour des différentes familles d'entités
        this.updateMeteorites(vaisseau);
        this.updateCloudZonesAndParticles();
        this.handleBulletMeteoriteCollisions(vaisseau);
        this.updateEnnemis(vaisseau);
        this.updateBullets(vaisseau);
        this.updateGadgets(vaisseau);
    }

    /**
     * Met à jour la position et le comportement de toutes les météorites,
     * gère les explosions temporisées, les collisions et la sortie du canvas.
     */
    updateMeteorites(vaisseau) {
        for (let i = this.meteorites.length - 1; i >= 0; i--) {
            const meteorite = this.meteorites[i];
            meteorite.descendre();

            // Météorites avec timer d'explosion (dynamite, nuage, ...)
            if (meteorite.explodeAfterMs !== null) {
                const elapsed = Date.now() - meteorite.spawnedAt;
                const remaining = meteorite.explodeAfterMs - elapsed;
                // Tremblement dans la dernière fenêtre avant explosion
                if (remaining > 0 && remaining <= this.HIT_DURATION) {
                    meteorite.startShake();
                }
            }

            // Explosion des météorites à timer
            if (meteorite.shouldExplode()) {
                if (this.assets && this.assets.explosion && typeof this.assets.explosion.play === 'function') {
                    this.assets.explosion.play();
                }

                // Comportement spécifique selon le type
                if (meteorite.type === TYPE_METEORITE.NUAGE) {
                    // Le nuage n'enlève pas de vie à l'explosion :
                    // il crée seulement une zone de nuage
                    this.spawnCloudZone(meteorite);
                    spawnExplosionParticles(this.particles, meteorite);
                    this.meteorites.splice(i, 1);
                    continue;
                }

                // Par défaut (ex : DYNAMITE) : explosion qui peut faire des dégâts
                spawnExplosionParticles(this.particles, meteorite);
                this.meteorites.splice(i, 1);

                // Rayon d'explosion : soit configuré, soit basé sur la taille
                const explosionRadius = meteorite.explosionRadius ?? (meteorite.largeur * 2);
                const dx = vaisseau.x - meteorite.x;
                const dy = vaisseau.y - meteorite.y;
                const distSq = dx * dx + dy * dy;
                if (distSq <= explosionRadius * explosionRadius) {
                    this.gestionDegats.appliquerCoup(vaisseau, this);
                }
                continue;
            }

            // Collision météorite / vaisseau (sans explosion spéciale)
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

    /** Nettoie les zones de nuage expirées et met à jour les particules. */
    updateCloudZonesAndParticles() {
        const now = Date.now();
        this.cloudZones = this.cloudZones.filter(z => z.expiresAt > now);
        this.particles.update();
    }

    /**
     * Gère les collisions balles / météorites pour le mode solo
     * et applique les effets (split, éclats, nuage, or...).
     */
    handleBulletMeteoriteCollisions(vaisseau) {
        for (let b = vaisseau.bullets.length - 1; b >= 0; b--) {
            const bullet = vaisseau.bullets[b];
            for (let m = this.meteorites.length - 1; m >= 0; m--) {
                const meteorite = this.meteorites[m];
                // Test de collision entre une balle (rectangle) et une météorite (cercle)
                const collision = this.collisionUtils.rectCircleFromCenter(
                    bullet.x, bullet.y, 10, 2,
                    meteorite.x, meteorite.y,
                    meteorite.largeur / 2
                );
                if (collision) {
                    // Météorite NUAGE : devient une zone de nuage
                    if (meteorite.type === TYPE_METEORITE.NUAGE && meteorite.canSplit) {
                        this.spawnCloudZone(meteorite);
                        spawnImpactParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        if (this.onMeteoriteDestroyed) this.onMeteoriteDestroyed(meteorite);
                        if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                            vaisseau.bullets.splice(b, 1);
                        }
                        break;
                    }

                    // Vaisseau SPLIT : la première collision du tir le divise en deux
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

                    // Météorite ECLATS : se divise en deux petites météorites
                    if (meteorite.type === TYPE_METEORITE.ECLATS && meteorite.canSplit) {
                        spawnImpactParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        if (this.onMeteoriteDestroyed) this.onMeteoriteDestroyed(meteorite);
                        this.spawnEclatsPieces(meteorite);
                        if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                            vaisseau.bullets.splice(b, 1);
                        }
                        break;
                    }

                    // Cas général : impact qui enlève 1 PV à la météorite
                    spawnImpactParticles(this.particles, meteorite);
                    meteorite.pv -= 1;
                    if (meteorite.pv <= 0) {
                        if (this.assets && this.assets.explosion && typeof this.assets.explosion.play === 'function') {
                            this.assets.explosion.play();
                        }
                        spawnExplosionParticles(this.particles, meteorite);
                        this.meteorites.splice(m, 1);
                        if (this.onMeteoriteDestroyed) this.onMeteoriteDestroyed(meteorite);
                        // Récompense en or selon le type de météorite détruite
                        const goldEarned = this.getGoldForMeteorite(meteorite.type);
                        this.player.addGold(goldEarned);

                        // Incrémenter le score (statistique de fin de niveau)
                        this.playerDestroyedMeteorites++;
                    }
                    if (vaisseau.type !== TYPE_VAISSEAU.PIERCE) {
                        vaisseau.bullets.splice(b, 1);
                    }
                    break;
                }
            }
        }
    }

    /** Met à jour les gadgets et applique leurs effets au joueur. */
    updateGadgets(vaisseau) {
        for (let i = this.gadgets.length - 1; i >= 0; i--) {
            const g = this.gadgets[i];
            g.update();
            if (g.canPickup(vaisseau)) {
                // Jouer un son de ramassage si l'asset existe
                if (this.assets && this.assets.gadget && typeof this.assets.gadget.play === 'function') {
                    this.assets.gadget.play();
                }
                // Appliquer l'effet du gadget au vaisseau (bouclier, éclair, etc.)
                g.pickup(vaisseau, { canvasWidth: this.canvas.width, canvasHeight: this.canvas.height });
            }
            if (g.consumed || g.shouldDespawn(this.canvas.height)) {
                this.gadgets.splice(i, 1);
            }
        }
    }

    /** Spawns automatiques de météorites et de gadgets (utilisé pour les tests). */
    handleSpawns() {
        const now = Date.now();

        // Spawns météorites
        if (now > this.nextMeteoriteSpawn) {
            this.spawnMeteorrite();
            this.nextMeteoriteSpawn = now + 1000;
        }

        // Spawner uniquement le gadget Coeur périodiquement pour test
        if (now > this.nextGadgetSpawn) {
            this.spawnGadgetCoeur();
            this.nextGadgetSpawn = now + 5000; // toutes 5s
        }
    }

    /** Fait apparaître une météorite en haut de l'écran, avec comportement selon son type. */
    spawnMeteorrite(type = TYPE_METEORITE.NORMAL) {
        const x = Math.random() * this.canvas.width;
        const y = -50;

        let meteorite = null;

        const imageForType = getMeteoriteImageForType(this.assets, type);

        // Timer d'explosion aléatoire (>= 5s) pour DYNAMITE et NUAGE
        const options = { imagePath: imageForType };
        if (type === TYPE_METEORITE.DYNAMITE || type === TYPE_METEORITE.NUAGE) {
            const minDelay = 5000; // 5s minimum
            const maxDelay = 10000; // jusqu'à 10s
            options.explodeAfterMs = minDelay + Math.random() * (maxDelay - minDelay);
        }

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
            meteorite = new Meteorite(x, y, type, { ...options, vx: vx * speed, vy: vy * speed });
        } else {
            meteorite = new Meteorite(x, y, type, options);
        }

        this.meteorites.push(meteorite);
    }

    /** Fait apparaître un ennemi simple centré en haut du canvas. */
    spawnEnnemi() {
        const x = this.canvas.width / 2;
        const y = 60;

        const ennemi = new Ennemi(
            x,
            y,
            this.assets.enemy || this.assets.ennemi || './assets/img/enemy.png',
            50,
            50,
            2,
            3
        );

        this.ennemis.push(ennemi);
    }

    /** Met à jour tous les ennemis : déplacement, tirs et collisions. */
    updateEnnemis(vaisseau) {
        const now = Date.now();

        for (let i = this.ennemis.length - 1; i >= 0; i--) {
            const ennemi = this.ennemis[i];

            // L'ennemi se déplace et vise la position actuelle du joueur
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

            // Collision bullets ennemi / joueur
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

    /** Dessine toutes les entités gérées par le GameManager. */
    draw(ctx) {
        ctx.save();
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
        ctx.restore();
    }

    /** Fait apparaître un gadget Éclair (boost de vitesse). */
    spawnGadgetEclair() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.ECLAIR, { imagePath: this.assets.eclair });
        this.gadgets.push(gadget);
    }

    /** Fait apparaître un gadget Bouclier (protection). */
    spawnGadgetBouclier() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.BOUCLIER, { imagePath: this.assets.bouclier });
        this.gadgets.push(gadget);
    }

    /** Fait apparaître un gadget Mirroire (téléportation). */
    spawnGadgetMirroire() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.MIRROIRE, { imagePath: this.assets.mirroire });
        this.gadgets.push(gadget);
    }

    /** Fait apparaître un gadget Rafale (augmentation cadence de tir). */
    spawnGadgetRafale() {
        const x = Math.random() * this.canvas.width;
        const y = -30;
        const gadget = new Gadget(x, y, TYPE_GADGET.RAFALE, { imagePath: this.assets.rafale });
        this.gadgets.push(gadget);
    }

    /** Fait apparaître un gadget Coeur (rend une vie). */
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

    /** Dessine les zones de nuage (brouillard). */
    drawCloudZones(ctx) {
        ctx.save();
        if (!this.cloudZones.length) return;
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

    /**
     * Renvoie la quantité d'or gagnée selon le type de météorite détruite.
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
