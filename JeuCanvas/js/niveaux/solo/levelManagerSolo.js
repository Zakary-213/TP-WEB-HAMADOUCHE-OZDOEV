/**
 * @module LevelManager
 * @description Gère la progression logique du jeu, l'enchaînement des niveaux, 
 * les transitions et la sauvegarde des scores finaux
*/
import { addSoloScore, addDuoScore } from '../../score/scoreManager.js';

/**
 * @class LevelManager
 * @description Contrôleur de haut niveau qui manipule le cycle de vie des niveaux.
 */
export default class LevelManager {
    /**
     * @param {Object} gameManager - Instance du gestionnaire de jeu actuel.
     * @param {Array} levels - Liste des classes de niveaux à instancier.
     * @param {Function} [onLevelStart=null] - Callback appelé au début d'un niveau.
     * @param {Function} [onLevelEnd=null] - Callback appelé à la fin d'un niveau pour gérer la transition.
     */
    constructor(gameManager, levels, onLevelStart = null, onLevelEnd = null) {
        this.gameManager = gameManager;
        this.levels = levels;
        this.onLevelStart = onLevelStart;
        this.onLevelEnd = onLevelEnd;

        this.currentIndex = 0;
        this.currentLevel = null;
        this.isWaitingForTransition = false;

        /** @type {Array} Stocke les statistiques de chaque niveau terminé pour le score final */
        this.completedLevelsData = [];
    }

    /**
     * Initialise la progression et lance le premier niveau.
     */
    start() {
        this.currentIndex = 0;
        this.completedLevelsData = [];
        this.startLevel();
    }

    /**
     * Instancie et démarre le niveau actuel selon l'index.
     */
    startLevel() {
        const LevelClass = this.levels[this.currentIndex];
        this.currentLevel = new LevelClass(this.gameManager);
        this.currentLevel.start();

        if (this.onLevelStart) {
            this.onLevelStart(this.currentIndex);
        }

        // Réinitialisation du compteur de session pour le nouveau niveau
        this.gameManager.playerDestroyedMeteorites = 0;
    }

    /**
     * Met à jour la logique du niveau actuel et vérifie les conditions de victoire.
     */
    update() {
        if (!this.currentLevel || this.isWaitingForTransition) return;

        this.currentLevel.update();

        // Vérification de la fin du niveau
        if (this.currentLevel.isFinished() && !this.currentLevel.hasEnded) {
            this.currentLevel.hasEnded = true;

            // Audio : Feedback de victoire
            if (this.gameManager.assets?.win?.play) {
                this.gameManager.assets.win.play();
            }

            this.collectLevelStats();

            // Gestion de la transition vers le niveau suivant ou la fin du jeu
            if (this.onLevelEnd) {
                this.isWaitingForTransition = true;
                this.onLevelEnd(this.currentIndex, () => this.handleTransitionComplete());
            } else {
                this.goToNextLevel();
            }
        }
    }

    /**
     * Collecte et archive les statistiques du niveau venant de se terminer.
     * Gère les formats de données différents pour le mode Solo et Duo.
     */
    collectLevelStats() {
        const levelTime = this.currentLevel.getElapsedTime();

        // Cas : Mode DUO (Vérification de l'existence des compteurs J1/J2)
        if (this.gameManager.player1DestroyedMeteorites !== undefined &&
            this.gameManager.player2DestroyedMeteorites !== undefined) {

            this.completedLevelsData.push({
                niveau: this.currentIndex + 1,
                time: levelTime,
                meteoritesJ1: this.gameManager.player1DestroyedMeteorites,
                meteoritesJ2: this.gameManager.player2DestroyedMeteorites
            });

            this.gameManager.player1DestroyedMeteorites = 0;
            this.gameManager.player2DestroyedMeteorites = 0;
        } 
        // Cas : Mode SOLO
        else {
            const meteoritesDestroyed = this.gameManager.playerDestroyedMeteorites || 0;

            this.completedLevelsData.push({
                niveau: this.currentIndex + 1,
                time: levelTime,
                meteorites: meteoritesDestroyed
            });

            this.gameManager.playerDestroyedMeteorites = 0;
        }
    }

    /**
     * Appelé après la fin de l'animation de transition.
     * Déclenche soit le niveau suivant, soit l'enregistrement des scores.
     */
    handleTransitionComplete() {
        this.isWaitingForTransition = false;

        if (this.currentIndex < this.levels.length - 1) {
            this.goToNextLevel();
        } else {
            this.finalizeGame();
        }
    }

    /**
     * Gère la fin de la campagne : enregistre les scores via le ScoreManager.
     */
    async finalizeGame() {
        const defaultUsername = window.CANVAS_API.getUsername();
        const isAuthenticated = !!window.CANVAS_API.getUserId();

        // --- ENREGISTREMENT DUO ---
        if (this.gameManager.player1DestroyedMeteorites !== undefined || this.gameManager.constructor.name === 'GameManagerDuo') {
            let pseudo1 = defaultUsername;
            let pseudo2 = "Joueur 2";

            // Si non connecté, on demande quand même (fallback comportemental)
            if (!isAuthenticated) {
                pseudo1 = prompt("Bravo ! Pseudo Joueur 1 :", defaultUsername) || "Joueur 1";
                pseudo2 = prompt("Pseudo Joueur 2 :") || "Joueur 2";
            } else {
                // En duo sur le même PC, on peut éventuellement demander le nom du partenaire
                pseudo2 = prompt("Bravo ! Entrez le pseudo du Joueur 2 :") || "Joueur 2";
            }

            await addDuoScore({
                joueur1: {
                    pseudo: pseudo1,
                    niveaux: this.completedLevelsData.map(lvl => ({
                        niveau: lvl.niveau,
                        meteorites: lvl.meteoritesJ1 || 0
                    }))
                },
                joueur2: {
                    pseudo: pseudo2,
                    niveaux: this.completedLevelsData.map(lvl => ({
                        niveau: lvl.niveau,
                        meteorites: lvl.meteoritesJ2 || 0
                    }))
                },
                niveauxTime: this.completedLevelsData.map(lvl => ({
                    niveau: lvl.niveau,
                    time: lvl.time
                }))
            });
        } 
        // --- ENREGISTREMENT SOLO ---
        else {
            let pseudo = defaultUsername;
            if (!isAuthenticated) {
                const askedPseudo = prompt("Bravo ! Entrez votre pseudo :", defaultUsername);
                if (askedPseudo) pseudo = askedPseudo.trim();
            }

            await addSoloScore({
                pseudo: pseudo,
                niveaux: this.completedLevelsData
            });
        }
    }


    /**
     * Nettoie le plateau de jeu et passe à l'index de niveau suivant.
     */
    goToNextLevel() {
        this.currentIndex++;

        // Nettoyage complet des entités du niveau précédent
        this.gameManager.meteorites.length = 0;
        this.gameManager.gadgets.length = 0;
        this.gameManager.ennemis.length = 0;

        this.startLevel();
    }

    /** @returns {Object|null} L'instance du niveau en cours. */
    getCurrentLevel() {
        return this.currentLevel;
    }
}