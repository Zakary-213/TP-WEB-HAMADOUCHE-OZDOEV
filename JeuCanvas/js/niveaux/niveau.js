import { TYPE_GADGET } from '../entities/typeGadget.js';

export default class Niveau {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.started = false;
        this.finished = false;
        this.startTime = null;
        this.elapsedTime = 0;
    }

    start() {
        this.started = true;
        this.finished = false;
        this.startTime = performance.now();
    }

    update() {
        if (!this.started || this.finished) return;
        this.elapsedTime = performance.now() - this.startTime;
    }

    getElapsedTime() {
        return this.elapsedTime;
    }

    isFinished() {
        return this.finished;
    }

    spawnGadgetByType(type) {
        switch (type) {
            case TYPE_GADGET.COEUR:
                this.gameManager.spawnGadgetCoeur();
                break;
            case TYPE_GADGET.BOUCLIER:
                this.gameManager.spawnGadgetBouclier();
                break;
            case TYPE_GADGET.ECLAIR:
                this.gameManager.spawnGadgetEclair();
                break;
            case TYPE_GADGET.RAFALE:
                this.gameManager.spawnGadgetRafale();
                break;
            case TYPE_GADGET.MIRROIRE:
                this.gameManager.spawnGadgetMirroire();
                break;
        }
    }
}
