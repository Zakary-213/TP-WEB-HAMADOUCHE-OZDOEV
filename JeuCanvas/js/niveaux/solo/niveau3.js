import Niveau from '../niveau.js';
import { TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';
import { pickByWeight } from '../../systems/random.js';

export default class Niveau3 extends Niveau {
    constructor(gameManager) {
        super(gameManager);

        this.enemySpawnDelay = 5000; // 15s
        this.enemySpawned = false;

        this.lancerDelay = 1500; // toutes les 1s
        this.lastLancerSpawn = 0;

        this.nuageWaveDelay = 5000; // toutes les 3s
        this.lastNuageWave = 0;
        this.nuagePerWave = 2;
        
        this.gadgetSpawnDelay = 10000; // toutes les 12s
        this.lastGadgetSpawn = 0;

        this.gadgetSpawnTable = [
            { type: TYPE_GADGET.COEUR,    weight: 15 },
            { type: TYPE_GADGET.BOUCLIER, weight: 25 },
            { type: TYPE_GADGET.ECLAIR,   weight: 20 },
            { type: TYPE_GADGET.RAFALE,   weight: 20 },
            { type: TYPE_GADGET.MIRROIRE, weight: 20 }
        ];
    }

    start() {
        super.start();
        this.enemySpawned = false;
        this.lastLancerSpawn = performance.now();
        this.lastNuageWave = performance.now();
        this.lastGadgetSpawn = performance.now();    
    }

    update() {
        if (this.finished) return;
        super.update();

        const now = performance.now();

        if (!this.enemySpawned && this.elapsedTime >= this.enemySpawnDelay) {
            this.gameManager.spawnEnnemi();
            this.enemySpawned = true;
        }

        if (now - this.lastLancerSpawn >= this.lancerDelay) {
            this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
            this.lastLancerSpawn = now;
        }


        if (now - this.lastNuageWave >= this.nuageWaveDelay) {
            for (let i = 0; i < this.nuagePerWave; i++) {
                this.gameManager.spawnMeteorrite(TYPE_METEORITE.NUAGE);
            }
            this.lastNuageWave = now;
        }

        if (now - this.lastGadgetSpawn >= this.gadgetSpawnDelay) {
            const gadgetType = pickByWeight(this.gadgetSpawnTable);
            this.spawnGadgetByType(gadgetType);
            this.lastGadgetSpawn = now;
        }

        if (this.enemySpawned && this.gameManager.ennemis.length === 0) {
            this.finished = true;
        }
    }
}
