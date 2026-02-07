export default class Niveau {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.started = false;
        this.finished = false;
        this.startTime = null;
        this.elapsedTime = 0; // en ms
    }

    start() {
        this.started = true;
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
}
