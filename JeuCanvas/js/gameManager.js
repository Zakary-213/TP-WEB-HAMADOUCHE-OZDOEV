import Meteorite from './meteorite.js';
import CollisionUtils from './collisionUtils.js';

export default class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.meteorites = [];
        this.gameState = "playing";
        this.collisionUtils = new CollisionUtils();
        this.HIT_DURATION = 600;
        this.nextMeteoriteSpawn = 0;
    }

    update(vaisseau) {
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
                this.gameState = "hit";
                vaisseau.startShake();
                this.meteorites.splice(index, 1);
                vaisseau.perdreVie(1);
                
                setTimeout(() => {
                    vaisseau.stopShake();
                    this.gameState = "playing";
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
                    vaisseau.bullets.splice(b, 1);
                    this.meteorites.splice(m, 1);
                    break;
                }
            }
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

    isGameOver() {
        return this.gameState === "gameover";
    }

    setGameOver() {
        this.gameState = "gameover";
    }
}
