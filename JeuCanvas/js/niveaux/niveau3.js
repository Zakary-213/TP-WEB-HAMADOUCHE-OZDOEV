import Niveau from './niveau.js';

export default class Niveau3 extends Niveau {
    constructor(gameManager) {
        super(gameManager);

        // Durée arbitraire juste pour test
        this.duration = 5000; // 5 secondes
    }

    start() {
        super.start();
        console.log('=== NIVEAU 3 : START ===');
    }

    update() {
        if (this.finished) return;
        super.update();

        // Fin automatique après X secondes
        if (this.elapsedTime >= this.duration) {
            this.finished = true;
            console.log('=== NIVEAU 3 : FINISHED ===');
        }
    }
}
