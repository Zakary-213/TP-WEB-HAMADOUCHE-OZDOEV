import Meteorite from './meteorite.js';
import CollisionUtils from './collisionUtils.js';
import { TYPE_VAISSEAU } from './typeVaisseau.js';
import Bullet from './bullet.js';

export default class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.meteorites = [];
        this.gameState = "playing";
        this.collisionUtils = new CollisionUtils();
        this.HIT_DURATION = 600;
        this.nextMeteoriteSpawn = 0;
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

        // Mettre à jour les météorites
        this.meteorites.forEach((meteorite, index) => {
            meteorite.descendre();

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
                    return;
                }
                this.gameState = "hit";
                vaisseau.startShake();
                this.meteorites.splice(index, 1);
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

            // Supprimer si sortie du canvas
            if (meteorite.estHorsCanvas(this.canvas.height)) {
                this.meteorites.splice(index, 1);
            }
        });

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
                        this.meteorites.splice(m, 1);
                        vaisseau.bullets.splice(b, 1);
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

                    this.meteorites.splice(m, 1);

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
        let meteorite = new Meteorite(
            Math.random() * this.canvas.width,
            -50,
            './assets/img/meteorite.png',
            40,
            40,
            0.2
        );
        this.meteorites.push(meteorite);
    }

    draw(ctx) {
        this.meteorites.forEach((meteorite) => {
            meteorite.draw(ctx);
        });
    }

}
