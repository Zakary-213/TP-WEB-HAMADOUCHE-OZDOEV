// Gestion centralisée des entrées clavier
// Inspiré du style de code de ton professeur, mais adapté
// à ton système de touches personnalisées + dash + tir.

let inputStates = {};
let lastKeyPress = {};
const DOUBLE_TAP_DELAY = 250; // ms

/**
 * Définit les écouteurs clavier globaux.
 *
 * @param {Object} deps
 * @param {() => string} deps.getEtat - fonction qui retourne l'état courant (par ex. 'JEU EN COURS').
 * @param {() => {up:string,left:string,down:string,right:string,shoot:string}} deps.getCustomKeys - renvoie les touches personnalisées déjà "normalisées" (ArrowUp, 'w', 'Enter', ...).
 * @param {() => {up:string,left:string,down:string,right:string,shoot:string}} [deps.getCustomKeys2] - renvoie les touches personnalisées du joueur 2 (si configurées).
 * @param {() => any} deps.getVaisseau - fonction qui renvoie le vaisseau du joueur 1.
 * @param {() => any} [deps.getVaisseau2] - fonction optionnelle qui renvoie le vaisseau du joueur 2 (mode duo).
 * @param {() => string} [deps.getMode] - fonction optionnelle qui renvoie le mode actuel ('solo' ou 'duo').
 */
function defineListeners({ getEtat, getCustomKeys, getCustomKeys2, getVaisseau, getVaisseau2, getMode }) {
	console.log("Définition des écouteurs clavier (ecouteur.js)");

	document.addEventListener('keydown', (event) => {
		if (event.repeat) return;

		const rawKey = event.key;
		const normalizedKey = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;

		// Mettre à jour l'état des touches
		inputStates[rawKey] = true;
		if (rawKey.length === 1) {
			inputStates[normalizedKey] = true;
		}

		// Pas d'action de gameplay si on n'est pas en jeu
		if (getEtat() !== 'JEU EN COURS') return;

		const customKeys = getCustomKeys();
		const customKeys2 = typeof getCustomKeys2 === 'function' ? getCustomKeys2() : null;
		const vaisseau1 = getVaisseau();
		const vaisseau2 = typeof getVaisseau2 === 'function' ? getVaisseau2() : null;
		const mode = typeof getMode === 'function' ? getMode() : 'solo';
		if (!vaisseau1 && !vaisseau2) return;

		const now = performance.now();

		// Double-tap pour le dash
		if (lastKeyPress[normalizedKey] && now - lastKeyPress[normalizedKey] < DOUBLE_TAP_DELAY) {
			// Dash joueur 1 (touches personnalisées)
			let dx1 = 0;
			let dy1 = 0;

			if (normalizedKey === customKeys.up) dy1 = -1;
			if (normalizedKey === customKeys.down) dy1 = 1;
			if (normalizedKey === customKeys.left) dx1 = -1;
			if (normalizedKey === customKeys.right) dx1 = 1;

			if ((dx1 !== 0 || dy1 !== 0) && vaisseau1 && typeof vaisseau1.startDash === 'function') {
				vaisseau1.startDash(dx1, dy1);
			}

			// Dash joueur 2 (mode duo, touches configurables, fallback ZQSD)
			if (mode === 'duo' && vaisseau2 && typeof vaisseau2.startDash === 'function') {
				let dx2 = 0;
				let dy2 = 0;

				if (customKeys2) {
					if (normalizedKey === customKeys2.up) dy2 = -1;
					if (normalizedKey === customKeys2.down) dy2 = 1;
					if (normalizedKey === customKeys2.left) dx2 = -1;
					if (normalizedKey === customKeys2.right) dx2 = 1;
				} else {
					if (normalizedKey === 'z') dy2 = -1;
					if (normalizedKey === 's') dy2 = 1;
					if (normalizedKey === 'q') dx2 = -1;
					if (normalizedKey === 'd') dx2 = 1;
				}
				if (dx2 !== 0 || dy2 !== 0) {
					vaisseau2.startDash(dx2, dy2);
				}
			}
		}

		lastKeyPress[normalizedKey] = now;

		// Tir : touche du joueur 1, et éventuellement touche dédiée pour le joueur 2
		const shootKey1 = customKeys.shoot;
		const shootKey2 = customKeys2 && customKeys2.shoot ? customKeys2.shoot : shootKey1;

		if (normalizedKey === shootKey1) {
			if (vaisseau1 && typeof vaisseau1.addBullet === 'function') {
				vaisseau1.addBullet(performance.now());
			}
			if (mode === 'duo' && vaisseau2 && typeof vaisseau2.addBullet === 'function' && normalizedKey === shootKey2) {
				vaisseau2.addBullet(performance.now());
			}
		} else if (mode === 'duo' && normalizedKey === shootKey2) {
			if (vaisseau2 && typeof vaisseau2.addBullet === 'function') {
				vaisseau2.addBullet(performance.now());
			}
		}
	});

	document.addEventListener('keyup', (event) => {
		const rawKey = event.key;
		const normalizedKey = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
		inputStates[rawKey] = false;
		if (rawKey.length === 1) {
			inputStates[normalizedKey] = false;
		}
	});
}

export { defineListeners, inputStates };

