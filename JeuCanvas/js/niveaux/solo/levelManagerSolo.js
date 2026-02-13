import {addSoloScore, addDuoScore} from '../../score/scoreManager.js'

export default class LevelManager {
    constructor(gameManager, levels, onLevelStart = null, onLevelEnd = null) {
        this.gameManager = gameManager;
        this.levels = levels;
        this.onLevelStart = onLevelStart;
        this.onLevelEnd = onLevelEnd;

        this.currentIndex = 0;
        this.currentLevel = null;
        this.isWaitingForTransition = false;

        this.completedLevelsData = [];

    }

    start() {
        this.currentIndex = 0;
        this.completedLevelsData = [];
        this.startLevel();
    }

    startLevel() {
        const LevelClass = this.levels[this.currentIndex];
        this.currentLevel = new LevelClass(this.gameManager);
        this.currentLevel.start();

        if (this.onLevelStart) {
            this.onLevelStart(this.currentIndex);
        }
        this.gameManager.playerDestroyedMeteorites = 0;
        console.log(`Début du niveau ${this.currentIndex + 1}`);
    }

    update() {
        if (!this.currentLevel) return;

        // Si on attend une transition (par ex. après fin de niveau), ne plus mettre à jour le niveau
        if (this.isWaitingForTransition) return;

        this.currentLevel.update();

        if (this.currentLevel.isFinished() && !this.currentLevel.hasEnded) {
            this.currentLevel.hasEnded = true;

            if (this.gameManager.assets && this.gameManager.assets.win && typeof this.gameManager.assets.win.play === 'function') {
                this.gameManager.assets.win.play();
            }

            /* Recupération des données */ 
            const levelTime = this.currentLevel.getElapsedTime();

            // ===== DUO =====
            if (this.gameManager.player1DestroyedMeteorites !== undefined &&
                this.gameManager.player2DestroyedMeteorites !== undefined) {

                this.completedLevelsData.push({
                    niveau: this.currentIndex + 1,
                    time: levelTime,
                    meteoritesJ1: this.gameManager.player1DestroyedMeteorites,
                    meteoritesJ2: this.gameManager.player2DestroyedMeteorites
                });
                console.log("DATA DUO NIVEAU :", this.completedLevelsData);

                // Reset duo counters
                this.gameManager.player1DestroyedMeteorites = 0;
                this.gameManager.player2DestroyedMeteorites = 0;

            }
            // ===== SOLO =====
            else {

                const meteoritesDestroyed =
                    this.gameManager.playerDestroyedMeteorites || 0;

                this.completedLevelsData.push({
                    niveau: this.currentIndex + 1,
                    time: levelTime,
                    meteorites: meteoritesDestroyed
                });

                this.gameManager.playerDestroyedMeteorites = 0;
            }


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
        } 
        else 
        {
            console.log("Tous les niveaux terminés !");
            //console.log("DATA FINALE SOLO :", this.completedLevelsData);
            if (this.gameManager.player1DestroyedMeteorites !== undefined) {
            // MODE DUO

            const pseudo1 = prompt("Bravo ! Pseudo Joueur 1 :");
            const pseudo2 = prompt("Pseudo Joueur 2 :");

            if (
                pseudo1 && pseudo1.trim() !== "" &&
                pseudo2 && pseudo2.trim() !== ""
            ) {
                addDuoScore({
                    joueur1: {
                        pseudo: pseudo1.trim(),
                        niveaux: this.completedLevelsData.map(lvl => ({
                            niveau: lvl.niveau,
                            meteorites: lvl.meteoritesJ1
                        }))
                    },
                    joueur2: {
                        pseudo: pseudo2.trim(),
                        niveaux: this.completedLevelsData.map(lvl => ({
                            niveau: lvl.niveau,
                            meteorites: lvl.meteoritesJ2
                        }))
                    },
                    niveauxTime: this.completedLevelsData.map(lvl => ({
                        niveau: lvl.niveau,
                        time: lvl.time
                    }))
                });

                console.log("Score DUO enregistré !");
            }

        } else {
            // MODE SOLO

            const pseudo = prompt("Bravo ! Entrez votre pseudo :");

            if (pseudo && pseudo.trim() !== "") {
                addSoloScore({
                    pseudo: pseudo.trim(),
                    niveaux: this.completedLevelsData
                });

                console.log("Score SOLO enregistré !");
            }
        }


            console.log("Score sauvegardé !");
        }
    }

    goToNextLevel() {
        this.currentIndex++;

        this.gameManager.meteorites.length = 0;
        this.gameManager.gadgets.length = 0;
        this.gameManager.ennemis.length = 0;

        /*
        if (this.currentIndex >= this.levels.length) {
            console.log("Tous les niveaux terminés !");
            return;
        }
        */
        this.startLevel();
    }

    getCurrentLevel() {
        return this.currentLevel;
    }
}
