import Niveau from '../niveau.js';
import { TYPE_METEORITE } from '../../entities/types/typeMeteorite.js';
import { TYPE_GADGET } from '../../entities/types/typeGadget.js';
import { pickByWeight } from '../../systems/random.js';

export default class Niveau3Duo extends Niveau {
    constructor(gameManagerDuo) {
        super(gameManagerDuo);

        this.enemySpawnDelay = 5000; // 5s avant l'apparition de l'ennemi
        this.enemySpawned = false;

        this.lancerDelay = 1500; // tirs de LANCER réguliers
        this.lastLancerSpawn = 0;

        //this.nuageWaveDelay = 50000000000000000000; // vagues de NUAGE régulières
        this.nuageWaveDelay = 5000; // vagues de NUAGE régulières
        this.lastNuageWave = 0;
        // Duo : on double le nombre de nuages par vague
        this.nuagePerWave = 4;
        
        this.gadgetSpawnDelay = 10000;
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
        console.log('=== NIVEAU 3 DUO : START ===');

        this.enemySpawned = false;
        this.lastLancerSpawn = performance.now();
        this.lastNuageWave = performance.now();
        this.lastGadgetSpawn = performance.now();
    }

    update() {
        if (this.finished) return;
        super.update();

        const now = performance.now();

        // Apparition des ennemis (doublé par rapport au solo)
        if (!this.enemySpawned && this.elapsedTime >= this.enemySpawnDelay) {
            // Duo : on fait apparaître deux ennemis en même temps, séparés à l'écran
            const canvasWidth = this.gameManager.canvas.width;
            this.gameManager.spawnEnnemi({ x: canvasWidth / 3, y: 60 });
            this.gameManager.spawnEnnemi({ x: (canvasWidth * 2) / 3, y: 60 });
            this.enemySpawned = true;
            console.log('[DUO] 2 ENNEMIS SPAWN');
        }

        // Météorites LANCER régulières (même rythme que solo)
        if (now - this.lastLancerSpawn >= this.lancerDelay) {
            // Duo : on envoie 2 LANCER pour augmenter la pression
            this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
            this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
            this.lastLancerSpawn = now;
        }

        // Vagues de météorites NUAGE
        if (now - this.lastNuageWave >= this.nuageWaveDelay) {
            for (let i = 0; i < this.nuagePerWave; i++) {
                this.gameManager.spawnMeteorrite(TYPE_METEORITE.NUAGE);
            }
            this.lastNuageWave = now;
        }

        // Spawns de gadgets réguliers (on peut en laisser 1 à chaque tick,
        // la difficulté venant déjà des nuages et des LANCER doublés)
        if (now - this.lastGadgetSpawn >= this.gadgetSpawnDelay) {
            // Duo : on fait pop deux gadgets pour 2 joueurs
            const gadgetType1 = pickByWeight(this.gadgetSpawnTable);
            const gadgetType2 = pickByWeight(this.gadgetSpawnTable);
            this.spawnGadgetByType(gadgetType1);
            this.spawnGadgetByType(gadgetType2);
            this.lastGadgetSpawn = now;
        }

        // Condition de fin : comme en solo, lorsque l'ennemi a été détruit
        if (this.enemySpawned && this.gameManager.ennemis.length === 0) {
            this.finished = true;
            console.log('=== NIVEAU 3 DUO GAGNÉ : ENNEMI DÉTRUIT ===');
        }
    }
}
