/** Taille de la grille (carrée), modifiable à l'exécution. */
let currentGridSize = 6;

export function getGridSize() {
	return currentGridSize;
}

export function setGridSize(nextSize) {
	const numeric = Number(nextSize);
	if (!Number.isFinite(numeric)) return;
	const clamped = Math.max(4, Math.min(10, Math.floor(numeric)));
	currentGridSize = clamped;
}

export function getTotalCells() {
	return currentGridSize * currentGridSize;
}
