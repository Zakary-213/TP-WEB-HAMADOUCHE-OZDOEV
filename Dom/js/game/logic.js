/**
 * logic.js – Logique pure du jeu ZIP (sans effets de bord DOM).
 */

import { getGridSize, getTotalCells } from '../core/config.js';

/* ---------- Adjacence ---------- */
export function isAdjacent(idx1, idx2) {
    const gridSize = getGridSize();
    const r1 = Math.floor(idx1 / gridSize);
    const c1 = idx1 % gridSize;
    const r2 = Math.floor(idx2 / gridSize);
    const c2 = idx2 % gridSize;
    return (Math.abs(r1 - r2) === 1 && c1 === c2) ||
           (Math.abs(c1 - c2) === 1 && r1 === r2);
}

/* ---------- Helpers ---------- */
function findNumberAtIndex(numbers, index) {
    const item = numbers.find((n) => n.index === index);
    return item ? item.value : null;
}

/**
 * Calcule la prochaine valeur attendue dans le chemin.
 * Le joueur doit passer par les indices dans l'ordre croissant.
 */
function getExpectedNextNumber(path, numbers) {
    let next = 1;
    for (const idx of path) {
        const v = findNumberAtIndex(numbers, idx);
        if (v === next) next++;
    }
    return next;
}

function isBlockedCell(obstacles, index) {
    return obstacles.some((obstacle) => obstacle.blocksCell(index));
}

function isBlockedEdge(obstacles, fromIdx, toIdx) {
    return obstacles.some((obstacle) => obstacle.blocksEdge(fromIdx, toIdx, getGridSize()));
}

/* ---------- Interaction utilisateur ---------- */
/**
 * Gère le clic / survol sur une cellule et met à jour gameState.path.
 *
 * @param {number} index – Indice de la cellule (0-based).
 * @param {object} gameState
 * @param {object} uiState
 * @param {() => void} startTimerIfNeeded
 */
export function handleCellInteraction(index, gameState, uiState, startTimerIfNeeded) {
    const { path, numbers, obstacles = [] } = gameState;
    const cellNumber = findNumberAtIndex(numbers, index);

    // ── Clic sur la case numérotée "1" : (re)démarre le tracé ──
    if (cellNumber === 1) {
        if (isBlockedCell(obstacles, index)) return;
        gameState.path = [index];
        uiState.isDrawing = true;
        startTimerIfNeeded();
        return;
    }

    // ── Reprise après relâchement : cliquer sur la tête ou une case adjacente ──
    if (!uiState.isDrawing && path.length > 0) {
        const headIdx = path[path.length - 1];

        if (index === headIdx) {
            uiState.isDrawing = true;
            startTimerIfNeeded();
            return;
        }

        if (isAdjacent(headIdx, index)) {
            if (isBlockedCell(obstacles, index)) return;
            if (isBlockedEdge(obstacles, headIdx, index)) return;
            uiState.isDrawing = true;
            startTimerIfNeeded();
        }
    }

    // ── Pas en train de dessiner ou chemin vide ──
    if (!uiState.isDrawing || path.length === 0) return;

    const lastIdx    = path[path.length - 1];
    const prevIdx    = path.length > 1 ? path[path.length - 2] : null;

    // ── Retour en arrière (survol de l'avant-dernière cellule) ──
    if (index === prevIdx) {
        gameState.path.pop();
        return;
    }

    // ── Raccourcissement du chemin (clic sur une cellule déjà visitée) ──
    const alreadyAt = path.indexOf(index);
    if (alreadyAt >= 0 && alreadyAt < path.length - 1) {
        // Évite de couper sur la case 1 (début obligatoire)
        if (alreadyAt > 0) {
            gameState.path = path.slice(0, alreadyAt + 1);
        }
        return;
    }

    // ── Déjà la dernière case ──
    if (index === lastIdx) return;

    // ── Doit être adjacent ──
    if (!isAdjacent(lastIdx, index)) return;

    // ── Cellule totalement bloquée ──
    if (isBlockedCell(obstacles, index)) return;

    // ── Côté bloqué (barrière sur un bord de case) ──
    if (isBlockedEdge(obstacles, lastIdx, index)) return;

    // ── Respect de l'ordre des numéros fixes ──
    const expected = getExpectedNextNumber(path, numbers);
    if (cellNumber !== null && cellNumber !== expected) return;

    // ── Ajout au chemin ──
    gameState.path.push(index);
}

/* ---------- Condition de victoire ---------- */
export function hasWon(path) {
    return path.length === getTotalCells();
}

export function hasWonAgainstTarget(path, targetLength) {
    return path.length === targetLength;
}
