export default class LevelManager {
    constructor(gameManager, levels, onLevelStart = null, onLevelEnd = null) {
        this.gameManager = gameManager;
        this.levels = levels;
        this.onLevelStart = onLevelStart;
        this.onLevelEnd = onLevelEnd;

        this.currentIndex = 0;
        this.currentLevel = null;
        this.isWaitingForTransition = false;
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

        // Si on attend une transition (par ex. après fin de niveau), ne plus mettre à jour le niveau
        if (this.isWaitingForTransition) return;

        this.currentLevel.update();

        if (this.currentLevel.isFinished() && !this.currentLevel.hasEnded) {
            this.currentLevel.hasEnded = true;

            // Transition de fin de niveau (y compris dernier niveau) gérée par onLevelEnd
            if (this.onLevelEnd) {
                this.isWaitingForTransition = true;
                this.onLevelEnd(this.currentIndex, () => this.handleTransitionComplete());
            } else {
                this.goToNextLevel();
            }
        }
    }

    handleTransitionComplete() {
        this.isWaitingForTransition = false;

        // Si ce n'est pas le dernier niveau, passer au suivant
        if (this.currentIndex < this.levels.length - 1) {
            this.goToNextLevel();
        } else {
            console.log("Tous les niveaux terminés !");
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