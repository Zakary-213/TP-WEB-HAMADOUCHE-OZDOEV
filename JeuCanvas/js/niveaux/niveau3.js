import Niveau from './niveau.js';

export default class Niveau3 extends Niveau {
    constructor(gameManager) {
        super(gameManager);

        this.enemySpawnDelay = 15000; // 15 secondes
        this.enemySpawned = false;
    }

    start() {
        super.start();
        console.log('=== NIVEAU 3 : START ===');

        // Sécurité : vider les ennemis
        this.gameManager.ennemis.length = 0;
        this.enemySpawned = false;
    }

    update() {
        if (this.finished) return;
        super.update();

        // 👾 Spawn ennemi après 15s
        if (!this.enemySpawned && this.elapsedTime >= this.enemySpawnDelay) {
            this.gameManager.spawnEnnemi();
            this.enemySpawned = true;
            console.log('👾 ENNEMI SPAWN');
        }

        // 🎯 Victoire : ennemi détruit
        if (this.enemySpawned && this.gameManager.ennemis.length === 0) {
            this.finished = true;
            console.log('=== NIVEAU 3 GAGNÉ : ENNEMI DÉTRUIT ===');
        }
    }
}
