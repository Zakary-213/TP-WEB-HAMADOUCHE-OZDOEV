import Niveau from '../niveau.js';
import { TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import { pickByWeight } from '../../systems/random.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';

export default class Niveau1 extends Niveau {
    constructor(gameManager) {
        super(gameManager);
        this.lastSpawn = 0;
        this.spawnDelay = 1500;       
        this.minSpawnDelay = 400;    
        this.spawnStep = 150;        
        this.spawnDecreaseEvery = 15000; 
        this.lastDifficultyUpdate = 0;
        this.duration = 5000;
        this.gadgetSpawnDelay = 20000; // 20 secondes
        this.lastGadgetSpawn = 0;

        this.meteoriteSpawnTable = [
            { type: TYPE_METEORITE.NORMAL,   weight:  40},
            { type: TYPE_METEORITE.COSTAUD,  weight:  5},
            { type: TYPE_METEORITE.NUAGE,    weight:  15},
            { type: TYPE_METEORITE.DYNAMITE, weight:  10},
            { type: TYPE_METEORITE.LANCER, weight:  15},
            { type: TYPE_METEORITE.ECLATS, weight:  15}
        ];

        this.gadgetSpawnTable = [
            { type: TYPE_GADGET.COEUR,     weight: 15 },
            { type: TYPE_GADGET.BOUCLIER,  weight: 20 },
            { type: TYPE_GADGET.ECLAIR,    weight: 20 },
            { type: TYPE_GADGET.RAFALE,    weight: 20},
            { type: TYPE_GADGET.MIRROIRE,  weight: 25}
        ];
    }

    start() {
        super.start();
        console.log('=== NIVEAU 1 : START ===');
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
            const type = pickByWeight(this.meteoriteSpawnTable);
            this.gameManager.spawnMeteorrite(type);
            this.lastSpawn = now;
        }

        if (now - this.lastGadgetSpawn >= this.gadgetSpawnDelay) {
            const gadgetType = pickByWeight(this.gadgetSpawnTable);
            this.spawnGadgetByType(gadgetType);
            this.lastGadgetSpawn = now;
        }

        if (this.elapsedTime >= this.duration) {
            this.finished = true;
            console.log('=== NIVEAU 1 : FINISHED ===');

        }
    }
}
