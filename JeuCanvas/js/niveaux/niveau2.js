import Niveau from './niveau.js';

export default class Niveau2 extends Niveau {
    constructor(gameManager) {
        super(gameManager);

        this.duration = 5000; // 5 secondes, juste pour test
    }

    start() {
        super.start();
        console.log('=== NIVEAU 2 : START ===');
    }

    update() {
        if (this.finished) return;
        super.update();

        // Fin automatique après X secondes
        if (this.elapsedTime >= this.duration) {
            this.finished = true;
            console.log('=== NIVEAU 2 : FINISHED ===');
        }
    }
}
