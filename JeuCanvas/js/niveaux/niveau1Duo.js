import Niveau from './niveau.js';
import { TYPE_METEORITE } from '../entities/typeMeteorite.js';
import { pickByWeight } from '../systems/random.js';
import { TYPE_GADGET } from '../entities/typeGadget.js';

// Niveau 1 pour le mode Duo :
// même logique que le Niveau1 solo, mais on double
// le rythme de spawn des météorites et des gadgets.
export default class Niveau1Duo extends Niveau {
    constructor(gameManagerDuo) {
        super(gameManagerDuo);
        this.lastSpawn = 0;
        // On part de la même valeur que le solo, mais on va faire
        // apparaître 2 météorites par "tick" de spawn.
        this.spawnDelay = 1500;
        this.minSpawnDelay = 400;
        this.spawnStep = 150;
        this.spawnDecreaseEvery = 15000;
        this.lastDifficultyUpdate = 0;
        this.duration = 50000;

        // Gadgets : même timer mais 2 gadgets à chaque fois.
        this.gadgetSpawnDelay = 20000;
        this.lastGadgetSpawn = 0;

        this.meteoriteSpawnTable = [
            { type: TYPE_METEORITE.NORMAL,   weight: 40 },
            { type: TYPE_METEORITE.COSTAUD,  weight: 5 },
            { type: TYPE_METEORITE.NUAGE,    weight: 15 },
            { type: TYPE_METEORITE.DYNAMITE, weight: 10 },
            { type: TYPE_METEORITE.LANCER,   weight: 15 },
            { type: TYPE_METEORITE.ECLATS,   weight: 15 }
        ];

        this.gadgetSpawnTable = [
            { type: TYPE_GADGET.COEUR,     weight: 15 },
            { type: TYPE_GADGET.BOUCLIER,  weight: 20 },
            { type: TYPE_GADGET.ECLAIR,    weight: 20 },
            { type: TYPE_GADGET.RAFALE,    weight: 20 },
            { type: TYPE_GADGET.MIRROIRE,  weight: 25 }
        ];
    }

    start() {
        super.start();
        console.log('=== NIVEAU 1 DUO : START ===');
        this.lastSpawn = performance.now() - this.spawnDelay;
    }

    update() {
        if (this.finished) return;
        super.update();

        const now = performance.now();

        // Même logique de difficulté que le solo
        if (this.elapsedTime - this.lastDifficultyUpdate >= this.spawnDecreaseEvery) {
            this.spawnDelay = Math.max(
                this.minSpawnDelay,
                this.spawnDelay - this.spawnStep
            );
            this.lastDifficultyUpdate = this.elapsedTime;

            console.log('[DUO] Nouveau spawnDelay:', this.spawnDelay);
        }

        // Spawns de météorites : on en fait apparaître 2 à chaque fois
        if (now - this.lastSpawn > this.spawnDelay) {
            const type1 = pickByWeight(this.meteoriteSpawnTable);
            const type2 = pickByWeight(this.meteoriteSpawnTable);
            this.gameManager.spawnMeteorrite(type1);
            this.gameManager.spawnMeteorrite(type2);
            this.lastSpawn = now;
        }

        // Spawns de gadgets : 2 gadgets à chaque "tick"
        if (now - this.lastGadgetSpawn >= this.gadgetSpawnDelay) {
            const gadgetType1 = pickByWeight(this.gadgetSpawnTable);
            const gadgetType2 = pickByWeight(this.gadgetSpawnTable);
            this.spawnGadgetByType(gadgetType1);
            this.spawnGadgetByType(gadgetType2);
            this.lastGadgetSpawn = now;
        }

        if (this.elapsedTime >= this.duration) {
            this.finished = true;
            console.log('=== NIVEAU 1 DUO : FINISHED ===');
        }
    }
}