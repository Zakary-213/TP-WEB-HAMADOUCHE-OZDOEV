/**
 * grid.js – Création et rendu de la grille dans le DOM.
 */

import { GRID_SIZE, TOTAL_CELLS } from './config.js';

/* ---------- Initialisation ---------- */
/**
 * Crée les éléments DOM pour chaque cellule et les retourne.
 * @param {HTMLElement} gridEl
 * @returns {HTMLElement[]}
 */
export function initGrid(gridEl) {
    gridEl.innerHTML = '';

    // Mettre à jour les variables CSS pour la grille
    gridEl.style.setProperty('--cols', GRID_SIZE);
    gridEl.style.setProperty('--rows', GRID_SIZE);

    const cellsElements = [];

    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;

        // Point central (visible quand la case est dans le chemin)
        const dot = document.createElement('div');
        dot.className = 'path-dot';

        // Connecteurs directionnels (lignes entre les cases adjacentes)
        const ct = document.createElement('div'); ct.className = 'connector connector-top';
        const cb = document.createElement('div'); cb.className = 'connector connector-bottom';
        const cl = document.createElement('div'); cl.className = 'connector connector-left';
        const cr = document.createElement('div'); cr.className = 'connector connector-right';

        // Valeur affichée (indice du puzzle)
        const valSpan = document.createElement('span');
        valSpan.className = 'val-span';
        valSpan.style.pointerEvents = 'none';

        cell.append(dot, ct, cb, cl, cr, valSpan);
        gridEl.appendChild(cell);
        cellsElements.push(cell);
    }

    return cellsElements;
}

/* ---------- Rendu ---------- */
/**
 * Met à jour l'affichage de toutes les cellules selon l'état courant.
 *
 * @param {HTMLElement[]} cellsElements
 * @param {object} gameState
 * @param {(a:number, b:number) => boolean} isAdjacent
 */
export function renderGrid(cellsElements, gameState, uiState, isAdjacent) {
    const { path, numbers, obstacles = [] } = gameState;
    const { hintTargetIndex } = uiState;
    const pathLen = path.length;
    const headIdx = pathLen > 0 ? path[pathLen - 1] : -1;

    cellsElements.forEach((cellEl, index) => {
        const pathIdx = path.indexOf(index);
        const isInPath = pathIdx !== -1;

        // ── Classe active ──
        cellEl.classList.toggle('active', isInPath);
        // Tête du chemin (dernière cellule posée) – pour l'animation de point
        cellEl.classList.toggle('path-head', index === headIdx);
        // Case conseillée par le bouton indice
        cellEl.classList.toggle('hint-target', index === hintTargetIndex);

        // Nettoyage puis application des styles obstacle.
        cellEl.classList.remove(
            'obstacle-blocked-cell',
            'obstacle-side-top',
            'obstacle-side-right',
            'obstacle-side-bottom',
            'obstacle-side-left'
        );
        obstacles.forEach((obstacle) => {
            if (obstacle.appliesToCell(index)) {
                obstacle.applyToCell(cellEl);
            }
        });

        // ── Valeur / badge hint ──
        const puzzleNum = numbers.find((n) => n.index === index);
        const valSpan = cellEl.querySelector('.val-span');
        if (puzzleNum) {
            valSpan.textContent = String(puzzleNum.value);
            cellEl.classList.add('is-hint');
        } else {
            valSpan.textContent = '';
            cellEl.classList.remove('is-hint');
        }

        // ── Réinitialiser les connecteurs ──
        cellEl.querySelectorAll('.connector').forEach((c) => c.classList.remove('visible'));

        if (!isInPath) return;

        // ── Activer les connecteurs vers les voisins dans le chemin ──
        const prevCellIdx = pathIdx > 0 ? path[pathIdx - 1] : null;
        const nextCellIdx = pathIdx < pathLen - 1 ? path[pathIdx + 1] : null;

        [prevCellIdx, nextCellIdx].forEach((neighborIdx) => {
            if (neighborIdx === null || !isAdjacent(index, neighborIdx)) return;

            const diff = neighborIdx - index;
            if (diff === -GRID_SIZE) cellEl.querySelector('.connector-top').classList.add('visible');
            if (diff ===  GRID_SIZE) cellEl.querySelector('.connector-bottom').classList.add('visible');
            if (diff === -1)         cellEl.querySelector('.connector-left').classList.add('visible');
            if (diff ===  1)         cellEl.querySelector('.connector-right').classList.add('visible');
        });
    });
}

/* ---------- Événements pointeur ---------- */
/**
 * Branche les événements souris (+ future extension tactile) sur la grille.
 *
 * @param {HTMLElement} gridEl
 * @param {{ onCellInteraction: (i:number)=>void, onPointerStop: ()=>void, canDraw: ()=>boolean }} handlers
 */
export function bindGridPointerEvents(gridEl, handlers) {
    const { onCellInteraction, onPointerStop, canDraw } = handlers;

    gridEl.addEventListener('mousedown', (e) => {
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        e.preventDefault(); // Évite la sélection de texte
        onCellInteraction(Number(cellEl.dataset.index));
    });

    gridEl.addEventListener('mouseover', (e) => {
        if (!canDraw()) return;
        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;
        onCellInteraction(Number(cellEl.dataset.index));
    });

    // Support tactile basique
    gridEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const cellEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
        if (cellEl) onCellInteraction(Number(cellEl.dataset.index));
    }, { passive: false });

    gridEl.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!canDraw()) return;
        const touch = e.touches[0];
        const cellEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
        if (cellEl) onCellInteraction(Number(cellEl.dataset.index));
    }, { passive: false });

    window.addEventListener('mouseup', onPointerStop);
    window.addEventListener('touchend', onPointerStop);
}
