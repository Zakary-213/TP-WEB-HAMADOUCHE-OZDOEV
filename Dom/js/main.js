/**
 * main.js – Point d'entrée du jeu ZIP.
 * Orchestre l'UI, le timer, la logique et le worker.
 */

import { getGridSize, setGridSize } from './config.js';
import { gameState, uiState } from './state.js';
import { createTimer } from './timer.js';
import { isAdjacent, handleCellInteraction, hasWonAgainstTarget } from './logic.js';
import { initGrid, renderGrid, bindGridPointerEvents } from './grid.js';
import { createPuzzleWorker } from './worker-client.js';
import { createObstacles } from './obstacles/factory.js';

/* ---------- Éléments DOM ---------- */
const gridEl         = document.getElementById('grid');
const timerTextEl    = document.getElementById('timer-text');
const loadingEl      = document.getElementById('loading');
const winOverlayEl   = document.getElementById('win-overlay');
const winTimeEl      = document.getElementById('win-time');
const winDiffEl      = document.getElementById('win-difficulty');
const winSecondaryLabelEl = document.getElementById('win-secondary-label');
const overlayNewPuzzleBtnEl = document.getElementById('overlay-new-puzzle');
const overlayResetBtnEl = document.getElementById('overlay-reset');
const overlayQuitBtnEl = document.getElementById('overlay-quit');
const difficultyEl   = document.getElementById('difficulty');
const maxNumEl       = document.getElementById('max-num');
const hintBtnEl      = document.getElementById('hint-btn');
const hintTextEl     = document.getElementById('hint-text');
const modeMenuOverlayEl = document.getElementById('mode-menu-overlay');
const menuPlayBtnEl = document.getElementById('menu-play-btn');
const menuScoresBtnEl = document.getElementById('menu-scores-btn');
const menuDesignerBtnEl = document.getElementById('menu-designer-btn');
const scoresOverlayEl = document.getElementById('scores-overlay');
const scoresListEl = document.getElementById('scores-list');
const scoresFilterBtns = Array.from(document.querySelectorAll('.scores-filter-btn[data-filter]'));
const scoresSortBtnEl = document.getElementById('scores-sort-btn');
const scoresBackBtnEl = document.getElementById('scores-back-btn');
const designerOverlayEl = document.getElementById('designer-overlay');
const designerBackBtnEl = document.getElementById('designer-back-btn');
const designerPlayBtnEl = document.getElementById('designer-play-btn');
const designerSubtitleEl = document.getElementById('designer-subtitle');
const designerGridBtns = Array.from(document.querySelectorAll('.designer-grid-btn[data-grid-size]'));
const instructionsEl = document.querySelector('.instructions');
const designerWorkspaceEl = document.getElementById('designer-workspace');
const designerExitBtnEl = document.getElementById('designer-exit-btn');
const designerNumberPaletteEl = document.getElementById('designer-number-palette');
const designerValidateBtnEl = document.getElementById('designer-validate-btn');
const designerValidateStatusEl = document.getElementById('designer-validate-status');
const defaultInstructionsHtml = instructionsEl ? instructionsEl.innerHTML : '';

let selectedDesignerGrid = localStorage.getItem('neonzip_designer_grid') || '4x4';
let currentMode = 'menu';
let draggedDesignerValue = null;
let draggedDesignerSourceIndex = null;
let isDesignerValidating = false;
let isCustomValidatedSession = false;
let designerPickedValue = null;
let designerPickedFromIndex = null;
const CLASSIC_GRID_SIZE = 6;
let activeScoresFilter = 'all';
let scoresSortDirection = 'asc';
let userScores = [];
let scoresError = '';
let isLoadingScores = false;
let hasLoadedScores = false;
let hasSavedWinScore = false;
let isSavingWinScore = false;

/* ---------- Initialisation de la grille ---------- */
let cellsElements = initGrid(gridEl);

function parseGridSizeLabel(label) {
    const raw = String(label || '').toLowerCase();
    const match = raw.match(/^(\d+)x\1$/);
    if (!match) return 6;
    const size = Number(match[1]);
    if (!Number.isFinite(size)) return 6;
    return Math.max(4, Math.min(10, Math.floor(size)));
}

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

function difficultyLabel(d) {
    return { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }[d] ?? d;
}

function syncDifficultyControlState() {
    if (!difficultyEl) return;
    const isLocked = currentMode === 'designer' || isCustomValidatedSession;
    difficultyEl.disabled = isLocked;
}

function getCurrentUserId() {
    if (window.CANVAS_API && typeof window.CANVAS_API.getUserId === 'function') {
        return window.CANVAS_API.getUserId();
    }
    return localStorage.getItem('tpweb_user_id');
}

function toApiUrl(path) {
    if (window.CANVAS_API && typeof window.CANVAS_API.toUrl === 'function') {
        return window.CANVAS_API.toUrl(path);
    }
    return path;
}

function scoresModeLabel(mode) {
    return mode === 'designer' ? 'Concepteur' : 'Solo';
}

function mapScoreRecordToUi(record) {
    const rawMode = String((record && record.mode) || 'solo').toLowerCase();
    const mode = rawMode === 'designer' ? 'designer' : 'solo';
    const data = record && record.data ? record.data : {};

    const rawGridSize = Number(data.gridSize || data.size || data.grid || 0);
    const gridSize = Number.isFinite(rawGridSize) && rawGridSize >= 4 && rawGridSize <= 10
        ? Math.floor(rawGridSize)
        : CLASSIC_GRID_SIZE;

    const totalTimeMs = Number(record && record.totalTime);
    const seconds = Number.isFinite(totalTimeMs) && totalTimeMs >= 0
        ? Math.round(totalTimeMs / 1000)
        : 0;

    return {
        mode,
        grid: mode === 'designer' ? 'Personnalisee' : 'Classique',
        size: `${gridSize}x${gridSize}`,
        time: seconds,
        difficulty: mode === 'solo' ? String(data.difficulty || 'medium') : null,
    };
}

async function loadUserScores() {
    if (isLoadingScores) return;

    const userId = getCurrentUserId();
    if (!userId) {
        userScores = [];
        hasLoadedScores = true;
        scoresError = 'Connecte-toi pour voir tes scores.';
        renderScoresList();
        return;
    }

    isLoadingScores = true;
    scoresError = '';
    renderScoresList();

    try {
        const [soloRes, designerRes] = await Promise.all([
            fetch(toApiUrl(`/api/scores/top?game=dom&mode=solo&userId=${encodeURIComponent(userId)}&limit=100`)),
            fetch(toApiUrl(`/api/scores/top?game=dom&mode=designer&userId=${encodeURIComponent(userId)}&limit=100`)),
        ]);

        if (!soloRes.ok || !designerRes.ok) {
            throw new Error('Impossible de charger les scores.');
        }

        const [soloBody, designerBody] = await Promise.all([soloRes.json(), designerRes.json()]);
        userScores = [...(soloBody?.data || []), ...(designerBody?.data || [])]
            .map(mapScoreRecordToUi)
            .filter((entry) => Number.isFinite(entry.time));
        hasLoadedScores = true;
        scoresError = '';
    } catch (error) {
        userScores = [];
        hasLoadedScores = true;
        scoresError = error && error.message ? error.message : 'Erreur de chargement des scores.';
    } finally {
        isLoadingScores = false;
        renderScoresList();
    }
}

async function persistWinScoreIfNeeded() {
    if (hasSavedWinScore || isSavingWinScore) return;

    const userId = getCurrentUserId();
    hasSavedWinScore = true;
    if (!userId) return;

    const mode = isCustomValidatedSession ? 'designer' : 'solo';
    const payload = {
        userId,
        game: 'dom',
        mode,
        totalTime: Math.max(0, Math.round(gameState.elapsedSeconds * 1000)),
        totalMeteorites: Number(gameState.solutionPath.length || 0),
        data: {
            gridSize: getGridSize(),
            difficulty: mode === 'solo' ? gameState.difficulty : null,
            mode,
        },
    };

    isSavingWinScore = true;
    try {
        await fetch(toApiUrl('/api/scores/scorecanvas'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        hasLoadedScores = false;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du score Dom:', error);
    } finally {
        isSavingWinScore = false;
    }
}

/* ---------- Rendu ---------- */
function render() {
    renderGrid(cellsElements, gameState, uiState, isAdjacent);

    if (currentMode === 'designer') {
        syncDesignerPaletteState();
    }

    if (currentMode === 'play' && gameState.solutionPath.length > 0 && hasWonAgainstTarget(gameState.path, gameState.solutionPath.length)) {
        if (overlayNewPuzzleBtnEl) {
            overlayNewPuzzleBtnEl.textContent = isCustomValidatedSession ? 'Retour au menu' : 'Nouveau Puzzle';
        }
        if (overlayResetBtnEl) {
            overlayResetBtnEl.textContent = 'Rejouer';
        }

        timer.stop();
        persistWinScoreIfNeeded();
        winTimeEl.textContent  = formatTime(gameState.elapsedSeconds);
        if (isCustomValidatedSession) {
            if (winSecondaryLabelEl) winSecondaryLabelEl.textContent = 'Grille';
            const size = getGridSize();
            winDiffEl.textContent = `${size}x${size}`;
        } else {
            if (winSecondaryLabelEl) winSecondaryLabelEl.textContent = 'Difficulté';
            winDiffEl.textContent = difficultyLabel(gameState.difficulty);
        }
        setTimeout(() => winOverlayEl.classList.remove('hidden'), 250);
    }
}

function renderScoresList() {
    if (!scoresListEl) return;

    if (scoresError) {
        scoresListEl.innerHTML = `<div class="scores-empty">${scoresError}</div>`;
        return;
    }

    if (isLoadingScores && !hasLoadedScores) {
        scoresListEl.innerHTML = '<div class="scores-empty">Chargement des scores...</div>';
        return;
    }

    const entries = userScores.filter((entry) => {
        if (activeScoresFilter === 'all') return true;
        return entry.mode === activeScoresFilter;
    }).sort((a, b) => {
        return scoresSortDirection === 'asc' ? a.time - b.time : b.time - a.time;
    });

    if (!entries.length) {
        scoresListEl.innerHTML = '<div class="scores-empty">Aucune partie pour ce filtre.</div>';
        return;
    }

    const html = entries.map((entry) => {
        const difficulty = entry.mode === 'solo'
            ? difficultyLabel(entry.difficulty)
            : '<span class="score-difficulty-muted">-</span>';
        return `
            <div class="score-line ${entry.mode}">
                <span>${scoresModeLabel(entry.mode)}</span>
                <span>${entry.grid}</span>
                <span>${entry.size}</span>
                <span class="score-time">${formatTime(entry.time)}</span>
                <span>${difficulty}</span>
            </div>
        `;
    }).join('');

    scoresListEl.innerHTML = html;
}

function updateScoresSortButton() {
    if (!scoresSortBtnEl) return;
    scoresSortBtnEl.textContent = scoresSortDirection === 'asc' ? 'Chrono ↑' : 'Chrono ↓';
}

function toggleScoresSortDirection() {
    scoresSortDirection = scoresSortDirection === 'asc' ? 'desc' : 'asc';
    updateScoresSortButton();
    renderScoresList();
}

function setScoresFilter(nextFilter) {
    activeScoresFilter = nextFilter;
    scoresFilterBtns.forEach((btn) => {
        const isActive = btn.dataset.filter === nextFilter;
        btn.classList.toggle('is-active', isActive);
    });
    renderScoresList();
}

/* ---------- Reset / Nouveau puzzle ---------- */
function resetGame() {
    gameState.path = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    hasSavedWinScore = false;
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
        gameState.obstacles    = createObstacles(result.obstacles ?? []);
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

function loadNewPuzzle(gridSizeOverride = CLASSIC_GRID_SIZE) {
    const difficulty = difficultyEl.value;
    gameState.difficulty = difficulty;

    const targetSize = Number(gridSizeOverride) || CLASSIC_GRID_SIZE;
    if (targetSize !== getGridSize()) {
        setGridSize(targetSize);
        cellsElements = initGrid(gridEl);
    }

    loadingEl.classList.remove('hidden');
    winOverlayEl.classList.add('hidden');
    puzzleWorker.loadPuzzle(difficulty, getGridSize());
}

function openModeMenu() {
    currentMode = 'menu';
    isCustomValidatedSession = false;
    document.body.classList.remove('designer-mode');

    if (modeMenuOverlayEl) modeMenuOverlayEl.classList.remove('hidden');
    if (scoresOverlayEl) {
        scoresOverlayEl.classList.add('hidden');
        scoresOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (designerOverlayEl) {
        designerOverlayEl.classList.add('hidden');
        designerOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (designerWorkspaceEl) {
        designerWorkspaceEl.classList.add('hidden');
        designerWorkspaceEl.setAttribute('aria-hidden', 'true');
    }
    if (instructionsEl) {
        instructionsEl.innerHTML = defaultInstructionsHtml;
    }
    syncDifficultyControlState();
}

function startGameFromMenu() {
    currentMode = 'play';
    document.body.classList.remove('designer-mode');
    isCustomValidatedSession = false;

    if (modeMenuOverlayEl) modeMenuOverlayEl.classList.add('hidden');
    if (scoresOverlayEl) {
        scoresOverlayEl.classList.add('hidden');
        scoresOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (designerOverlayEl) {
        designerOverlayEl.classList.add('hidden');
        designerOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (designerWorkspaceEl) {
        designerWorkspaceEl.classList.add('hidden');
        designerWorkspaceEl.setAttribute('aria-hidden', 'true');
    }
    if (instructionsEl) {
        instructionsEl.innerHTML = defaultInstructionsHtml;
    }
    hasSavedWinScore = false;
    syncDifficultyControlState();
    loadNewPuzzle(CLASSIC_GRID_SIZE);
}

function openDesignerPlaceholder() {
    if (designerOverlayEl) {
        designerOverlayEl.classList.remove('hidden');
        designerOverlayEl.setAttribute('aria-hidden', 'false');
    }
    if (scoresOverlayEl) {
        scoresOverlayEl.classList.add('hidden');
        scoresOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (modeMenuOverlayEl) modeMenuOverlayEl.classList.add('hidden');
}

function openScoresOverlay() {
    currentMode = 'menu';
    setScoresFilter('all');
    updateScoresSortButton();
    if (!hasLoadedScores) {
        loadUserScores();
    }

    if (scoresOverlayEl) {
        scoresOverlayEl.classList.remove('hidden');
        scoresOverlayEl.setAttribute('aria-hidden', 'false');
    }
    if (designerOverlayEl) {
        designerOverlayEl.classList.add('hidden');
        designerOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (modeMenuOverlayEl) modeMenuOverlayEl.classList.add('hidden');
}

function updateDesignerGridSelection(nextGrid) {
    selectedDesignerGrid = nextGrid || '4x4';
    localStorage.setItem('neonzip_designer_grid', selectedDesignerGrid);

    designerGridBtns.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.gridSize === selectedDesignerGrid);
    });

    if (designerSubtitleEl) {
        designerSubtitleEl.textContent = `Choisis ta grille pour commencer la creation du niveau. Taille selectionnee: ${selectedDesignerGrid}.`;
    }
}

function updateDesignerValidateControls() {
    if (!designerValidateBtnEl || !designerValidateStatusEl) return;

    const canValidate = gameState.numbers.length >= 2;
    designerValidateBtnEl.disabled = !canValidate || isDesignerValidating;

    if (isDesignerValidating) {
        designerValidateStatusEl.classList.remove('is-error', 'is-success');
        designerValidateStatusEl.textContent = 'Validation en cours...';
        return;
    }

    if (!canValidate) {
        designerValidateStatusEl.classList.remove('is-error', 'is-success');
        designerValidateStatusEl.textContent = 'Place au moins 2 chiffres pour valider.';
    }
}

function setDesignerStatus(message, kind = 'neutral') {
    if (!designerValidateStatusEl) return;
    designerValidateStatusEl.classList.remove('is-error', 'is-success');
    if (kind === 'error') designerValidateStatusEl.classList.add('is-error');
    if (kind === 'success') designerValidateStatusEl.classList.add('is-success');
    designerValidateStatusEl.textContent = message;
}

function placeDesignerNumber(value, cellIndex) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 10) return;

    gameState.numbers = gameState.numbers.filter((entry) => {
        return entry.value !== numeric && entry.index !== cellIndex;
    });

    gameState.numbers.push({ index: cellIndex, value: numeric });
    gameState.numbers.sort((a, b) => a.value - b.value);
    render();
}

function removeDesignerNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    gameState.numbers = gameState.numbers.filter((entry) => entry.value !== numeric);
    render();
}

function getDesignerNumberAtCell(cellIndex) {
    return gameState.numbers.find((entry) => entry.index === cellIndex) || null;
}

function syncDesignerPaletteState() {
    if (!designerNumberPaletteEl) return;

    const chips = Array.from(designerNumberPaletteEl.querySelectorAll('.designer-number-chip[data-value]'));
    chips.forEach((chip) => {
        const numeric = Number(chip.dataset.value);
        const isUsed = gameState.numbers.some((entry) => entry.value === numeric);
        chip.classList.toggle('is-used', isUsed);
        chip.draggable = !isUsed;
        chip.setAttribute('aria-hidden', isUsed ? 'true' : 'false');
    });

    cellsElements.forEach((cellEl) => {
        const idx = Number(cellEl.dataset.index);
        const entry = getDesignerNumberAtCell(idx);
        cellEl.draggable = !!entry;
    });

    updateDesignerValidateControls();
}

function clearDesignerDropTarget() {
    gridEl.querySelectorAll('.cell.designer-drop-target').forEach((cell) => {
        cell.classList.remove('designer-drop-target');
    });
}

function startDesignerMode() {
    currentMode = 'designer';
    document.body.classList.add('designer-mode');

    if (modeMenuOverlayEl) modeMenuOverlayEl.classList.add('hidden');
    if (designerOverlayEl) {
        designerOverlayEl.classList.add('hidden');
        designerOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (designerWorkspaceEl) {
        designerWorkspaceEl.classList.remove('hidden');
        designerWorkspaceEl.setAttribute('aria-hidden', 'false');
    }

    const targetSize = parseGridSizeLabel(selectedDesignerGrid);
    setGridSize(targetSize);
    cellsElements = initGrid(gridEl);

    gameState.path = [];
    gameState.numbers = [];
    gameState.solutionPath = [];
    gameState.obstacles = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    gameState.elapsedSeconds = 0;
    draggedDesignerValue = null;
    draggedDesignerSourceIndex = null;
    isDesignerValidating = false;
    isCustomValidatedSession = false;
    hasSavedWinScore = false;
    designerPickedValue = null;
    designerPickedFromIndex = null;

    timer.stop();
    timer.reset((v) => { gameState.elapsedSeconds = v; });
    timerTextEl.textContent = '00:00';

    if (loadingEl) loadingEl.classList.add('hidden');
    if (winOverlayEl) winOverlayEl.classList.add('hidden');

    if (maxNumEl) maxNumEl.textContent = String(Math.min(10, targetSize * targetSize));
    if (instructionsEl) {
        instructionsEl.innerHTML = `Mode concepteur: grille vide <strong>${targetSize}x${targetSize}</strong>. Glisse les chiffres de <strong>1</strong> a <strong>10</strong> dans les cases.`;
    }

    syncDifficultyControlState();
    render();
}

function launchValidatedCustomLevel(solutionPath) {
    currentMode = 'play';
    document.body.classList.remove('designer-mode');
    isCustomValidatedSession = true;
    hasSavedWinScore = false;

    if (designerWorkspaceEl) {
        designerWorkspaceEl.classList.add('hidden');
        designerWorkspaceEl.setAttribute('aria-hidden', 'true');
    }

    if (instructionsEl) {
        instructionsEl.innerHTML = defaultInstructionsHtml;
    }

    gameState.path = [];
    gameState.solutionPath = Array.isArray(solutionPath) ? [...solutionPath] : [];
    gameState.obstacles = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    gameState.elapsedSeconds = 0;

    timer.stop();
    timer.reset((v) => { gameState.elapsedSeconds = v; });
    timerTextEl.textContent = '00:00';
    winOverlayEl.classList.add('hidden');
    loadingEl.classList.add('hidden');

    if (maxNumEl) {
        maxNumEl.textContent = String(gameState.solutionPath.length || Math.min(10, getGridSize() * getGridSize()));
    }

    syncDifficultyControlState();
    render();
}

async function validateDesignerLevel() {
    if (currentMode !== 'designer' || !puzzleWorker || typeof puzzleWorker.validateCustomLevel !== 'function') return;
    if (gameState.numbers.length < 2) return;

    isDesignerValidating = true;
    updateDesignerValidateControls();

    const response = await puzzleWorker.validateCustomLevel(gameState.numbers, getGridSize());

    isDesignerValidating = false;
    updateDesignerValidateControls();

    if (!designerValidateStatusEl) return;

    if (!response || !response.feasible) {
        designerValidateStatusEl.classList.add('is-error');
        designerValidateStatusEl.classList.remove('is-success');
        designerValidateStatusEl.textContent = (response && response.reason) ? response.reason : 'Reessayer: le niveau est pas faisable.';
        return;
    }

    designerValidateStatusEl.classList.remove('is-error');
    designerValidateStatusEl.classList.add('is-success');
    designerValidateStatusEl.textContent = 'Niveau jouable ! Lancement de la partie...';

    launchValidatedCustomLevel(response.solutionPath || []);
}

/* ---------- Interaction cellule ---------- */
function onCellInteraction(index) {
    if (currentMode === 'designer') {
        const existing = getDesignerNumberAtCell(index);

        if (existing) {
            if (designerPickedValue === existing.value && designerPickedFromIndex === index) {
                removeDesignerNumber(existing.value);
                setDesignerStatus(`Chiffre ${existing.value} retire de la grille.`);
                designerPickedValue = null;
                designerPickedFromIndex = null;
                updateDesignerValidateControls();
                return;
            }

            designerPickedValue = existing.value;
            designerPickedFromIndex = index;
            setDesignerStatus(`Chiffre ${existing.value} selectionne. Clique sur une case pour le deplacer.`);
            return;
        }

        if (designerPickedValue !== null) {
            placeDesignerNumber(designerPickedValue, index);
            setDesignerStatus(`Chiffre ${designerPickedValue} deplace.`);
            designerPickedValue = null;
            designerPickedFromIndex = null;
        }

        return;
    }

    uiState.hintTargetIndex = null;
    hintTextEl.textContent = 'Indice: clique pour voir le premier déplacement conseillé.';
    handleCellInteraction(index, gameState, uiState, startTimerIfNeeded);
    render();
}

function directionLabel(fromIdx, toIdx) {
    const gridSize = getGridSize();
    const diff = toIdx - fromIdx;
    if (diff === -gridSize) return 'haut';
    if (diff === gridSize) return 'bas';
    if (diff === -1) return 'gauche';
    if (diff === 1) return 'droite';
    return 'case voisine';
}

function showHint() {
    if (currentMode === 'designer') {
        return;
    }

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

if (designerNumberPaletteEl) {
    designerNumberPaletteEl.addEventListener('dragstart', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const chip = target ? target.closest('.designer-number-chip[data-value]') : null;
        if (!chip) return;
        draggedDesignerValue = chip.dataset.value;
        draggedDesignerSourceIndex = null;
        designerPickedValue = null;
        designerPickedFromIndex = null;
        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', chip.dataset.value);
            event.dataTransfer.effectAllowed = 'copy';
        }
    });

    designerNumberPaletteEl.addEventListener('dragover', (event) => {
        if (currentMode !== 'designer') return;
        event.preventDefault();
        designerNumberPaletteEl.classList.add('is-drop-target');
    });

    designerNumberPaletteEl.addEventListener('dragleave', () => {
        designerNumberPaletteEl.classList.remove('is-drop-target');
    });

    designerNumberPaletteEl.addEventListener('drop', (event) => {
        if (currentMode !== 'designer') return;
        event.preventDefault();

        const transferValue = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        const value = transferValue || draggedDesignerValue;
        if (value) {
            removeDesignerNumber(value);
        }

        designerNumberPaletteEl.classList.remove('is-drop-target');
        draggedDesignerValue = null;
        draggedDesignerSourceIndex = null;
    });

    designerNumberPaletteEl.addEventListener('dragend', () => {
        draggedDesignerValue = null;
        draggedDesignerSourceIndex = null;
        clearDesignerDropTarget();
        designerNumberPaletteEl.classList.remove('is-drop-target');
    });
}

gridEl.addEventListener('dragstart', (event) => {
    if (currentMode !== 'designer') return;
    const target = event.target instanceof Element ? event.target : null;
    const cell = target ? target.closest('.cell[data-index]') : null;
    if (!cell) return;

    const index = Number(cell.dataset.index);
    const numberEntry = getDesignerNumberAtCell(index);
    if (!numberEntry) {
        event.preventDefault();
        return;
    }

    draggedDesignerValue = String(numberEntry.value);
    draggedDesignerSourceIndex = index;
    designerPickedValue = null;
    designerPickedFromIndex = null;

    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', draggedDesignerValue);
        event.dataTransfer.effectAllowed = 'move';
    }
});

gridEl.addEventListener('dragover', (event) => {
    if (currentMode !== 'designer') return;
    const target = event.target instanceof Element ? event.target : null;
    const cell = target ? target.closest('.cell[data-index]') : null;
    if (!cell) return;
    event.preventDefault();
    clearDesignerDropTarget();
    cell.classList.add('designer-drop-target');
});

gridEl.addEventListener('dragleave', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const cell = target ? target.closest('.cell[data-index]') : null;
    if (!cell) return;
    cell.classList.remove('designer-drop-target');
});

gridEl.addEventListener('drop', (event) => {
    if (currentMode !== 'designer') return;
    const target = event.target instanceof Element ? event.target : null;
    const cell = target ? target.closest('.cell[data-index]') : null;
    if (!cell) return;

    event.preventDefault();

    const transferValue = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    const value = transferValue || draggedDesignerValue;
    const index = Number(cell.dataset.index);

    placeDesignerNumber(value, index);
    cell.classList.remove('designer-drop-target');
    setDesignerStatus(`Chiffre ${value} place.`);
    draggedDesignerValue = null;
    draggedDesignerSourceIndex = null;
});

document.getElementById('reset').addEventListener('click', () => {
    timer.stop();
    resetGame();
});

document.getElementById('new-puzzle').addEventListener('click', loadNewPuzzle);
hintBtnEl.addEventListener('click', showHint);
if (overlayNewPuzzleBtnEl) {
    overlayNewPuzzleBtnEl.addEventListener('click', () => {
        if (isCustomValidatedSession) {
            winOverlayEl.classList.add('hidden');
            openModeMenu();
            return;
        }
        loadNewPuzzle();
    });
}

if (overlayResetBtnEl) {
    overlayResetBtnEl.addEventListener('click', () => {
    winOverlayEl.classList.add('hidden');
    timer.stop();
    gameState.path = [];
    uiState.isDrawing = false;
    uiState.hintTargetIndex = null;
    hintTextEl.textContent = 'Indice: clique pour voir le premier déplacement conseillé.';
    timer.reset((v) => { gameState.elapsedSeconds = v; });
    render();
});
}

if (overlayQuitBtnEl) {
    overlayQuitBtnEl.addEventListener('click', () => {
        winOverlayEl.classList.add('hidden');
        timer.stop();
        openModeMenu();
    });
}

difficultyEl.addEventListener('change', () => {
    if (currentMode === 'designer' || isCustomValidatedSession) {
        difficultyEl.value = gameState.difficulty || 'medium';
        return;
    }
    loadNewPuzzle();
});

if (menuPlayBtnEl) {
    menuPlayBtnEl.addEventListener('click', startGameFromMenu);
}

if (menuScoresBtnEl) {
    menuScoresBtnEl.addEventListener('click', openScoresOverlay);
}

if (menuDesignerBtnEl) {
    menuDesignerBtnEl.addEventListener('click', openDesignerPlaceholder);
}

if (scoresBackBtnEl) {
    scoresBackBtnEl.addEventListener('click', openModeMenu);
}

scoresFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        setScoresFilter(btn.dataset.filter || 'all');
    });
});

if (scoresSortBtnEl) {
    scoresSortBtnEl.addEventListener('click', toggleScoresSortDirection);
}

if (designerBackBtnEl) {
    designerBackBtnEl.addEventListener('click', openModeMenu);
}

if (designerPlayBtnEl) {
    designerPlayBtnEl.addEventListener('click', startDesignerMode);
}

if (designerExitBtnEl) {
    designerExitBtnEl.addEventListener('click', openModeMenu);
}

if (designerValidateBtnEl) {
    designerValidateBtnEl.addEventListener('click', validateDesignerLevel);
}

designerGridBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        updateDesignerGridSelection(btn.dataset.gridSize || '4x4');
    });
});

/* ---------- Démarrage ---------- */
timerTextEl.textContent = '00:00';
updateDesignerGridSelection(selectedDesignerGrid);
updateDesignerValidateControls();
syncDifficultyControlState();
openModeMenu();
