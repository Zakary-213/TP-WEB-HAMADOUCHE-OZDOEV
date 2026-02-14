import Niveau from '../niveau.js';
import { TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import { pickByWeight } from '../../systems/random.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';

export default class Niveau2 extends Niveau {
    constructor(gameManager) {
        super(gameManager);

        this.targetKills = 30;
        this.currentKills = 0;

        this.maxMeteoritesToSpawn = 100000;
        this.totalSpawned = 0;
        this.spawnFinished = false;

        this.burstSize = 10;
        this.burstDelay = 1000;
        this.burstSpacing = 300;
        this.lastBurstTime = 0;
        this.isBurstSpawning = false;

        this.lancerDelay = 2000;
        this.lastLancerSpawn = 0;

        this.gadgetSpawnDelay = 10000; 
        this.lastGadgetSpawn = 0;

        this.spawnTable = [
            { type: TYPE_METEORITE.NORMAL,   weight: 50 },
            { type: TYPE_METEORITE.COSTAUD,  weight: 5 },
            { type: TYPE_METEORITE.NUAGE,    weight: 10 },
            { type: TYPE_METEORITE.DYNAMITE, weight: 15 },
            { type: TYPE_METEORITE.ECLATS,   weight: 15 }
        ];

        this.gadgetSpawnTable = [
            { type: TYPE_GADGET.COEUR,     weight: 10 },
            { type: TYPE_GADGET.BOUCLIER,  weight: 30 },
            { type: TYPE_GADGET.ECLAIR,    weight: 20 },
            { type: TYPE_GADGET.RAFALE,    weight: 30 },
            { type: TYPE_GADGET.MIRROIRE,  weight: 10 }
        ];
    }

    start() {
        super.start();
        this.currentKills = 0;
        const previousCallback = this.gameManager.onMeteoriteDestroyed;
        this.totalSpawned = 0;
        this.spawnFinished = false;
        this.lastBurstTime = performance.now();
        this.lastLancerSpawn = performance.now();
        this.lastGadgetSpawn = performance.now();


        this.gameManager.onMeteoriteDestroyed = (meteorite) => {
            if (previousCallback) {
                previousCallback(meteorite);
            }
            this.currentKills++;

            if (this.currentKills >= this.targetKills) {
                this.finished = true;
                this.spawnFinished = true;
            }
        };
    }

    update() {
        if (this.finished) return;
        super.update();
        this.handleBurstSpawn();
        this.handleLancerSpawn();
        this.handleGadgetSpawn();
    }

    handleBurstSpawn() {
        if (this.finished || this.spawnFinished) return;

        const now = performance.now();

        // Si on n'est pas en burst et que le délai est passé, on démarre un burst
        if (!this.isBurstSpawning && now - this.lastBurstTime >= this.burstDelay) {
            this.isBurstSpawning = true;
            this.burstSpawnedCount = 0;
            this.lastBurstTime = now;
        }

        // Si burst actif
        if (this.isBurstSpawning) {

            if (now - this.lastBurstTime >= this.burstSpacing) {

                if (
                    this.burstSpawnedCount >= this.burstSize ||
                    this.totalSpawned >= this.maxMeteoritesToSpawn
                ) {
                    this.isBurstSpawning = false;
                    return;
                }

                const type = pickByWeight(this.spawnTable);
                this.gameManager.spawnMeteorrite(type);

                this.burstSpawnedCount++;
                this.totalSpawned++;
                this.lastBurstTime = now;
            }
        }
    }


    handleLancerSpawn() {
        if (this.finished || this.spawnFinished) return;

        const now = performance.now();
        if (now - this.lastLancerSpawn < this.lancerDelay) return;

        if (this.totalSpawned >= this.maxMeteoritesToSpawn) {
            this.spawnFinished = true;
            return;
        }

        this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
        this.lastLancerSpawn = now;
        this.totalSpawned++;
    }

    handleGadgetSpawn() {
        if (this.finished || this.spawnFinished) return;

        const now = performance.now();
        if (now - this.lastGadgetSpawn < this.gadgetSpawnDelay) return;

        const gadgetType = pickByWeight(this.gadgetSpawnTable);
        this.spawnGadgetByType(gadgetType);

        this.lastGadgetSpawn = now;
    }
}
