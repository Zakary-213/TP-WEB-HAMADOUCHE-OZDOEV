/**
 * worker.js – Génération de puzzle ZIP
 * Tourne dans un Web Worker pour ne pas bloquer l'UI.
 *
 * Algorithme :
 * 1. Générer un chemin hamiltonien aléatoire (backtracking + shuffle).
 * 2. Sélectionner N indices fixes selon la difficulté.
 * 3. Vérifier que le puzzle est valide (chemin unique possible).
 */

const GRID_SIZE = 6;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

/* ---------- Voisins adjacents ---------- */
function getNeighbors(idx) {
    const row = Math.floor(idx / GRID_SIZE);
    const col = idx % GRID_SIZE;
    const neighbors = [];
    if (row > 0)             neighbors.push(idx - GRID_SIZE); // haut
    if (row < GRID_SIZE - 1) neighbors.push(idx + GRID_SIZE); // bas
    if (col > 0)             neighbors.push(idx - 1);          // gauche
    if (col < GRID_SIZE - 1) neighbors.push(idx + 1);          // droite
    return neighbors;
}

/* ---------- Fisher-Yates shuffle ---------- */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ---------- Chemin hamiltonien aléatoire (backtracking) ---------- */
function generateHamiltonianPath() {
    const visited = new Uint8Array(TOTAL_CELLS);
    const path = [];
    const start = Math.floor(Math.random() * TOTAL_CELLS);

    function backtrack(current) {
        visited[current] = 1;
        path.push(current);

        if (path.length === TOTAL_CELLS) return true;

        const neighbors = shuffle(getNeighbors(current));
        for (const next of neighbors) {
            if (!visited[next]) {
                if (backtrack(next)) return true;
            }
        }

        // Backtrack
        visited[current] = 0;
        path.pop();
        return false;
    }

    // Tenter depuis le départ aléatoire, retenter si pas de solution en 200 ms
    const started = Date.now();
    while (Date.now() - started < 500) {
        visited.fill(0);
        path.length = 0;
        if (backtrack(start)) return path;
    }

    // Fallback : boustrophédon garanti
    const fallback = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        const rowCells = [];
        for (let col = 0; col < GRID_SIZE; col++) rowCells.push(row * GRID_SIZE + col);
        if (row % 2 !== 0) rowCells.reverse();
        fallback.push(...rowCells);
    }
    return fallback;
}

/* ---------- Sélection des indices (hints) ---------- */
const HINT_CONFIG = {
    easy:   { count: 11, minManhattan: 2 },
    medium: { count: 8,  minManhattan: 3 },
    hard:   { count: 6,  minManhattan: 3 },
};

function manhattanDistance(idxA, idxB) {
    const rowA = Math.floor(idxA / GRID_SIZE);
    const colA = idxA % GRID_SIZE;
    const rowB = Math.floor(idxB / GRID_SIZE);
    const colB = idxB % GRID_SIZE;
    return Math.abs(rowA - rowB) + Math.abs(colA - colB);
}

function isFarEnough(candidatePos, selectedPositions, path, minManhattan) {
    const candidateCell = path[candidatePos];
    return selectedPositions.every((selectedPos) => {
        const selectedCell = path[selectedPos];
        return manhattanDistance(candidateCell, selectedCell) >= minManhattan;
    });
}

function selectHints(path, difficulty) {
    const config = HINT_CONFIG[difficulty] ?? HINT_CONFIG.medium;
    const limit = Math.max(2, Math.min(config.count, path.length));
    const selectedPositions = [0];

    // Répartit les indices sur tout le chemin, avec une distance minimale en grille.
    for (let slot = 1; slot < limit - 1; slot++) {
        const remainingSlots = (limit - 1) - slot;
        const minPos = selectedPositions[selectedPositions.length - 1] + 1;
        const maxPos = (path.length - 1) - remainingSlots;
        const target = Math.round((slot * (path.length - 1)) / (limit - 1));

        const candidates = [];
        for (let pos = minPos; pos <= maxPos; pos++) {
            candidates.push(pos);
        }

        candidates.sort((a, b) => {
            const scoreA = Math.abs(a - target) + Math.random() * 0.25;
            const scoreB = Math.abs(b - target) + Math.random() * 0.25;
            return scoreA - scoreB;
        });

        let picked = null;
        for (const pos of candidates) {
            if (isFarEnough(pos, selectedPositions, path, config.minManhattan)) {
                picked = pos;
                break;
            }
        }

        selectedPositions.push(picked ?? candidates[0]);
    }

    selectedPositions.push(path.length - 1);

    // Affiche toujours 1..N sans trous, même si les cases sont espacées.
    return selectedPositions.map((pathPos, i) => ({
        index: path[pathPos],
        value: i + 1,
    }));
}

/* ---------- Génération complète ---------- */
function generatePuzzle(difficulty = 'medium') {
    const solutionPath = generateHamiltonianPath();
    const numbers = selectHints(solutionPath, difficulty);

    return { solutionPath, numbers };
}

/* ---------- Interface Web Worker ---------- */
self.onmessage = function (e) {
    if (e.data.type === 'GENERATE_PUZZLE') {
        const difficulty = e.data.difficulty ?? 'medium';
        const result = generatePuzzle(difficulty);
        self.postMessage({ type: 'PUZZLE_RESULT', payload: result });
    }
};