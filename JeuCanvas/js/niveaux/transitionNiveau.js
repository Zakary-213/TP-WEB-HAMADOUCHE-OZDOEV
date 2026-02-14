/**
 * @module TransitionNiveau
 * @description Gère l'affichage visuel et logique entre deux niveaux.
 * Inclut un système de compte à rebours, des messages personnalisés et un mode "Fin de jeu" avec célébration.
 */

/**
 * @class TransitionNiveau
 * @description Contrôle l'overlay de transition, les timers et les interactions liées au passage de niveau.
 */
export default class TransitionNiveau {
    /**
     * @param {HTMLCanvasElement} canvas - Le canvas de jeu (pour référence).
     * @param {Object} [options] - Options de configuration.
     * @param {number} [options.autoDelayMs=10000] - Temps avant le passage automatique (en ms).
     */
    constructor(canvas, { autoDelayMs = 10000 } = {}) {
        this.canvas = canvas;
        this.autoDelayMs = autoDelayMs;

        // Récupération des éléments DOM de l'overlay
        this.overlay = document.querySelector('.level-transition-overlay');
        this.titleEl = this.overlay?.querySelector('.level-transition-title');
        this.subtitleEl = this.overlay?.querySelector('.level-transition-subtitle');
        this.hintEl = this.overlay?.querySelector('.level-transition-hint');
        this.fireworksEl = this.overlay?.querySelector('.level-transition-fireworks');

        this.startTime = 0;
        this.messagePrefix = '';

        // État interne
        this.isActive = false;
        this.onComplete = null; // Callback de fin de transition

        
    }

    /**
     * Affiche l'écran de transition standard entre deux niveaux.
     * @param {number} levelNumber - Le numéro du niveau venant d'être réussi.
     * @param {Function} onComplete - Fonction à exécuter une fois la transition terminée.
     */
    showForLevel(levelNumber, onComplete) {
        if (!this.overlay) {
            onComplete?.();
            return;
        }

        this.overlay.classList.remove('final');

        if (this.titleEl) this.titleEl.textContent = `NIVEAU ${levelNumber} RÉUSSI`;
        if (this.subtitleEl) this.subtitleEl.textContent = 'Clique sur le canvas pour passer au niveau suivant';
        
        this._prepareOverlay(onComplete, 'Passage automatique dans');
    }

    /**
     * Affiche l'écran spécial de fin de jeu (Victoire totale).
     * @param {Function} onComplete - Callback de retour au menu.
     * @param {Object} [options] - Options de mode.
     * @param {string} [options.mode='solo'] - 'solo' ou 'duo'.
     */
    showFinalEndGame(onComplete, { mode = 'solo' } = {}) {
        if (!this.overlay) {
            onComplete?.();
            return;
        }

        this.overlay.classList.add('final'); // Active les styles de célébration (ex: or/fireworks)

        if (this.titleEl) this.titleEl.textContent = 'BRAVO !';
        if (this.subtitleEl) {
            this.subtitleEl.textContent = mode === 'duo' 
                ? 'Vous avez terminé le mode duo !' 
                : 'Vous avez terminé le mode solo !';
        }

        this._prepareOverlay(onComplete, 'Retour automatique au menu dans');
    }

    /**
     * Initialisation commune de l'overlay avant affichage.
     * @private
     */
    _prepareOverlay(onComplete, messagePrefix) {
        this.onComplete = onComplete;
        this.isActive = true;
        this.startTime = performance.now();
        this.messagePrefix = messagePrefix;

        this.overlay.classList.add('active');
        this.overlay.setAttribute('aria-hidden', 'false');
    }




    /**
     * Termine la transition, cache l'interface et déclenche le callback.
     */
    complete() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.overlay) {
            this.overlay.classList.remove('active');
            this.overlay.classList.remove('final');
            this.overlay.setAttribute('aria-hidden', 'true');
        }

        const cb = this.onComplete;
        this.onComplete = null;
        cb?.();
    }

    /** Alias pour terminer la transition par un clic utilisateur. */
    completeManually() {
        this.complete();
    }

    update() {
        if (!this.isActive) return;

        const now = performance.now();
        const elapsed = now - this.startTime;

        const remaining = Math.max(0, this.autoDelayMs - elapsed);
        const seconds = Math.ceil(remaining / 1000);

        if (this.hintEl) {
            this.hintEl.textContent = `${this.messagePrefix} ${seconds}s`;
        }

        if (elapsed >= this.autoDelayMs) {
            this.complete();
        }
    }

}

// --- Fonctions utilitaires d'exportation ---

/**
 * Logique de transition pour le mode Solo.
 */
export const transitionSoloLevel = ({ levelIndex, doneCallback, levelTransition, LEVELS, ETAT, setEtat }) => {
    if (!levelTransition) return doneCallback();

    const isLastLevel = levelIndex === LEVELS.length - 1;
    setEtat(ETAT.TRANSITION);

    if (isLastLevel) {
        levelTransition.showFinalEndGame(() => {
            setEtat(ETAT.MENU);
            doneCallback();
        });
    } else {
        levelTransition.showForLevel(levelIndex + 1, () => {
            setEtat(ETAT.JEU);
            doneCallback();
        });
    }
};

/**
 * Logique de transition pour le mode Duo.
 */
export const transitionDuoLevel = ({ levelIndex, doneCallback, levelTransition, LEVELS_DUO, ETAT, setEtat }) => {
    if (!levelTransition) return doneCallback();

    const isLastLevelDuo = levelIndex === LEVELS_DUO.length - 1;
    setEtat(ETAT.TRANSITION);

    if (isLastLevelDuo) {
        levelTransition.showFinalEndGame(() => {
            setEtat(ETAT.MENU);
            doneCallback();
        }, { mode: 'duo' });
    } else {
        levelTransition.showForLevel(levelIndex + 1, () => {
            setEtat(ETAT.JEU);
            doneCallback();
        });
    }
};

