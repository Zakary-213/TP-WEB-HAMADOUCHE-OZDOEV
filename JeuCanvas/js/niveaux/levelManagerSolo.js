export default class LevelManager {
    constructor(gameManager, levels, onLevelStart = null) {
        this.gameManager = gameManager;
        this.levels = levels;
        this.onLevelStart = onLevelStart;

        this.currentIndex = 0;
        this.currentLevel = null;
    }

    start() {
        this.currentIndex = 0;
        this.startLevel();
    }

    startLevel() {
        const LevelClass = this.levels[this.currentIndex];
        this.currentLevel = new LevelClass(this.gameManager);
        this.currentLevel.start();

        if (this.onLevelStart) {
            this.onLevelStart(this.currentIndex);
        }

        console.log(`Début du niveau ${this.currentIndex + 1}`);
    }

    update() {
        if (!this.currentLevel) return;

        this.currentLevel.update();

        if (this.currentLevel.isFinished() && !this.currentLevel.hasEnded) {
            this.currentLevel.hasEnded = true;
            this.goToNextLevel();
        }
    }

    goToNextLevel() {
        this.currentIndex++;

        this.gameManager.meteorites.length = 0;
        this.gameManager.gadgets.length = 0;
        this.gameManager.ennemis.length = 0;

        if (this.currentIndex >= this.levels.length) {
            console.log("Tous les niveaux terminés !");
            return;
        }

        this.startLevel();
    }

    getCurrentLevel() {
        return this.currentLevel;
    }
}
