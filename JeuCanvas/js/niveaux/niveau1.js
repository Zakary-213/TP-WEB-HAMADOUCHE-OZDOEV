import Niveau from './niveau.js';
import { TYPE_METEORITE } from '../entities/typeMeteorite.js';

export default class Niveau1 extends Niveau {
    constructor(gameManager) {
        super(gameManager);
        this.lastSpawn = 0;
        this.spawnDelay = 1000; // 1 seconde
        this.duration = 10000;
    }

    start() {
        super.start();
        this.lastSpawn = performance.now() - this.spawnDelay;
    }

    update() {
        super.update();
        const now = performance.now();

        if (now - this.lastSpawn > this.spawnDelay) {
            this.gameManager.spawnMeteorrite(TYPE_METEORITE.NORMAL);
            this.lastSpawn = now;
        }

        if (this.elapsedTime >= this.duration) {
            this.finished = true;
        }
    }
}
