/**
 * main.js – Point d'entrée du jeu ZIP.
 * Orchestre l'UI, le timer, la logique et le worker.
 */

import { GRID_SIZE } from './config.js';
import { gameState, uiState } from './state.js';
import { createTimer } from './timer.js';
import { isAdjacent, handleCellInteraction, hasWon } from './logic.js';
import { initGrid, renderGrid, bindGridPointerEvents } from './grid.js';
import { createPuzzleWorker } from './worker-client.js';

/* ---------- Éléments DOM ---------- */
const gridEl         = document.getElementById('grid');
const timerTextEl    = document.getElementById('timer-text');
const loadingEl      = document.getElementById('loading');
const winOverlayEl   = document.getElementById('win-overlay');
const winTimeEl      = document.getElementById('win-time');
const winDiffEl      = document.getElementById('win-difficulty');
const difficultyEl   = document.getElementById('difficulty');
const maxNumEl       = document.getElementById('max-num');
const hintBtnEl      = document.getElementById('hint-btn');
const hintTextEl     = document.getElementById('hint-text');

/* ---------- Initialisation de la grille ---------- */
const cellsElements = initGrid(gridEl);

/* ---------- Timer ---------- */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function onTimerTick(seconds) {
    timerTextEl.textContent = formatTime(seconds);
}

const timer = createTimer(onTimerTick);

/* ---------- Rendu ---------- */
function render() {
    renderGrid(cellsElements, gameState, uiState, isAdjacent);

    if (hasWon(gameState.path)) {
        timer.stop();
        // Afficher l'overlay de victoire avec les stats
        winTimeEl.textContent  = formatTime(gameState.elapsedSeconds);
        winDiffEl.textContent  = difficultyLabel(gameState.difficulty);
        setTimeout(() => winOverlayEl.classList.remove('hidden'), 250);
    }
}

function difficultyLabel(d) {
    return { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }[d] ?? d;
}

/* ---------- Reset / Nouveau puzzle ---------- */
function resetGame() {
    gameState.path = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    hintTextEl.textContent = 'Indice: clique pour voir le premier déplacement conseillé.';
    timer.reset((v) => { gameState.elapsedSeconds = v; });
    winOverlayEl.classList.add('hidden');
    render();
}

function startTimerIfNeeded() {
    if (timer.isRunning()) return;
    timer.start(
        () => gameState.elapsedSeconds,
        (v) => { gameState.elapsedSeconds = v; }
    );
}

/* ---------- Worker ---------- */
const puzzleWorker = createPuzzleWorker(
    (result) => {
        gameState.solutionPath = result.solutionPath;
        gameState.numbers      = result.numbers ?? [];
        gameState.difficulty   = difficultyEl.value;

        // Afficher la valeur maximale (= taille du chemin solution)
        maxNumEl.textContent = result.solutionPath.length;

        loadingEl.classList.add('hidden');
        resetGame();
    },
    (message) => {
        loadingEl.classList.add('hidden');
        alert(`Erreur : ${message}`);
    }
);

function loadNewPuzzle() {
    const difficulty = difficultyEl.value;
    gameState.difficulty = difficulty;
    loadingEl.classList.remove('hidden');
    winOverlayEl.classList.add('hidden');
    puzzleWorker.loadPuzzle(difficulty);
}

/* ---------- Interaction cellule ---------- */
function onCellInteraction(index) {
    uiState.hintTargetIndex = null;
    hintTextEl.textContent = 'Indice: clique pour voir le premier déplacement conseillé.';
    handleCellInteraction(index, gameState, uiState, startTimerIfNeeded);
    render();
}

function directionLabel(fromIdx, toIdx) {
    const diff = toIdx - fromIdx;
    if (diff === -GRID_SIZE) return 'haut';
    if (diff === GRID_SIZE) return 'bas';
    if (diff === -1) return 'gauche';
    if (diff === 1) return 'droite';
    return 'case voisine';
}

function showHint() {
    const solution = gameState.solutionPath;
    if (!Array.isArray(solution) || solution.length < 2) {
        hintTextEl.textContent = 'Indice indisponible: puzzle non chargé.';
        return;
    }

    let fromIdx = null;
    let toIdx = null;

    if (gameState.path.length === 0) {
        fromIdx = solution[0];
        toIdx = solution[1];
        hintTextEl.textContent = `Commence par la case 1 puis va vers ${directionLabel(fromIdx, toIdx)}.`;
    } else {
        const head = gameState.path[gameState.path.length - 1];
        const pos = solution.indexOf(head);
        if (pos < 0 || pos >= solution.length - 1) {
            hintTextEl.textContent = 'Indice indisponible depuis cette position.';
            uiState.hintTargetIndex = null;
            render();
            return;
        }

        fromIdx = head;
        toIdx = solution[pos + 1];
        hintTextEl.textContent = `Prochain déplacement conseillé: ${directionLabel(fromIdx, toIdx)}.`;
    }

    uiState.hintTargetIndex = toIdx;
    render();
}

/* ---------- Événements ---------- */
bindGridPointerEvents(gridEl, {
    onCellInteraction,
    onPointerStop: () => { uiState.isDrawing = false; },
    canDraw: () => uiState.isDrawing,
});

document.getElementById('reset').addEventListener('click', () => {
    timer.stop();
    resetGame();
});

document.getElementById('new-puzzle').addEventListener('click', loadNewPuzzle);
hintBtnEl.addEventListener('click', showHint);
document.getElementById('overlay-new-puzzle').addEventListener('click', loadNewPuzzle);
document.getElementById('overlay-reset').addEventListener('click', () => {
    winOverlayEl.classList.add('hidden');
    timer.stop();
    gameState.path = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    hintTextEl.textContent = 'Indice: clique pour voir le premier déplacement conseillé.';
    timer.reset((v) => { gameState.elapsedSeconds = v; });
    render();
});

difficultyEl.addEventListener('change', loadNewPuzzle);

/* ---------- Démarrage ---------- */
timerTextEl.textContent = '00:00';
loadNewPuzzle();
