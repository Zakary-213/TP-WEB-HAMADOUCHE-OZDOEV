export default class TransitionNiveau {
	constructor(canvas, { autoDelayMs = 10000 } = {}) {
		this.canvas = canvas;
		this.autoDelayMs = autoDelayMs;

		this.overlay = document.querySelector('.level-transition-overlay');
		this.titleEl = this.overlay ? this.overlay.querySelector('.level-transition-title') : null;
		this.subtitleEl = this.overlay ? this.overlay.querySelector('.level-transition-subtitle') : null;
		this.hintEl = this.overlay ? this.overlay.querySelector('.level-transition-hint') : null;
		this.fireworksEl = this.overlay ? this.overlay.querySelector('.level-transition-fireworks') : null;

		this.timeoutId = null;
		this.intervalId = null;
		this.isActive = false;
		this.onComplete = null;
	}

	showForLevel(levelNumber, onComplete) {
		if (!this.overlay) {
			if (onComplete) onComplete();
			return;
		}

		this.onComplete = onComplete;
		this.isActive = true;
		this.remainingSeconds = Math.floor(this.autoDelayMs / 1000);

		// Mode normal (transition entre niveaux) : retirer le mode final
		this.overlay.classList.remove('final');

		if (this.titleEl) {
			this.titleEl.textContent = `NIVEAU ${levelNumber} RÉUSSI`;
		}
		if (this.subtitleEl) {
			this.subtitleEl.textContent = 'Clique sur le canvas pour passer au niveau suivant';
		}
		if (this.hintEl) {
			this.hintEl.textContent = `Passage automatique dans ${this.remainingSeconds}s`;
		}

		this.overlay.classList.add('active');
		this.overlay.setAttribute('aria-hidden', 'false');

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		this.timeoutId = setTimeout(() => this.complete(), this.autoDelayMs);

		// Mettre à jour l'affichage du compte à rebours chaque seconde
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
		this.intervalId = setInterval(() => {
			if (!this.isActive) return;
			this.remainingSeconds -= 1;
			if (this.remainingSeconds < 0) {
				this.remainingSeconds = 0;
			}
			if (this.hintEl) {
				this.hintEl.textContent = `Passage automatique dans ${this.remainingSeconds}s`;
			}
		}, 1000);
	}

	// Affichage spécial pour la fin du jeu (mode solo ou duo terminé)
	showFinalEndGame(onComplete, { mode = 'solo' } = {}) {
		if (!this.overlay) {
			if (onComplete) onComplete();
			return;
		}

		this.onComplete = onComplete;
		this.isActive = true;
		this.remainingSeconds = Math.floor(this.autoDelayMs / 1000);

		// Activer le mode final (couleurs or + feux d'artifice)
		this.overlay.classList.add('final');

		if (this.titleEl) {
			this.titleEl.textContent = 'BRAVO !';
		}
		if (this.subtitleEl) {
			this.subtitleEl.textContent =
				mode === 'duo'
					? 'Vous avez terminé le mode duo !'
					: 'Vous avez terminé le mode solo !';
		}
		if (this.hintEl) {
			this.hintEl.textContent = `Retour automatique au menu dans ${this.remainingSeconds}s`;
		}

		this.overlay.classList.add('active');
		this.overlay.setAttribute('aria-hidden', 'false');

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		this.timeoutId = setTimeout(() => this.complete(), this.autoDelayMs);

		// Compte à rebours
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
		this.intervalId = setInterval(() => {
			if (!this.isActive) return;
			this.remainingSeconds -= 1;
			if (this.remainingSeconds < 0) {
				this.remainingSeconds = 0;
			}
			if (this.hintEl) {
				this.hintEl.textContent = `Retour automatique au menu dans ${this.remainingSeconds}s`;
			}
		}, 1000);
	}

	complete() {
		if (!this.isActive) return;
		this.isActive = false;

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (this.overlay) {
			this.overlay.classList.remove('active');
			this.overlay.classList.remove('final');
			this.overlay.setAttribute('aria-hidden', 'true');
		}

		const cb = this.onComplete;
		this.onComplete = null;
		if (cb) cb();
	}

	completeManually() {
		this.complete();
	}
}