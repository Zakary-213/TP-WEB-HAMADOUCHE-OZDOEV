import Niveau from './niveau.js';
import { TYPE_METEORITE } from '../entities/typeMeteorite.js';
import { pickByWeight } from '../systems/random.js';

export default class Niveau1 extends Niveau {
    constructor(gameManager) {
        super(gameManager);
        this.lastSpawn = 0;
        this.spawnDelay = 1500;       
        this.minSpawnDelay = 400;    
        this.spawnStep = 150;        
        this.spawnDecreaseEvery = 15000; 
        this.lastDifficultyUpdate = 0;
        this.duration = 90000;

        this.spawnTable = [
            { type: TYPE_METEORITE.NORMAL,   weight:  40},
            { type: TYPE_METEORITE.COSTAUD,  weight:  5},
            { type: TYPE_METEORITE.NUAGE,    weight:  15},
            { type: TYPE_METEORITE.DYNAMITE, weight:  10},
            { type: TYPE_METEORITE.LANCER, weight:  15},
            { type: TYPE_METEORITE.ECLATS, weight:  15}
        ];
    }

    start() {
        super.start();
        this.lastSpawn = performance.now() - this.spawnDelay;
    }

    update() {
        if (this.finished) return;
        super.update();

        const now = performance.now();

        if (this.elapsedTime - this.lastDifficultyUpdate >= this.spawnDecreaseEvery) {
            this.spawnDelay = Math.max(
                this.minSpawnDelay,
                this.spawnDelay - this.spawnStep
            );
            this.lastDifficultyUpdate = this.elapsedTime;

            console.log('Nouveau spawnDelay:', this.spawnDelay);
        }

        if (now - this.lastSpawn > this.spawnDelay) {
            const type = pickByWeight(this.spawnTable);
            this.gameManager.spawnMeteorrite(type);
            this.lastSpawn = now;
        }

        if (this.elapsedTime >= this.duration) {
            this.finished = true;
        }
    }
}
