/**
 * worker.js – Génération de puzzle ZIP
 * Tourne dans un Web Worker pour ne pas bloquer l'UI.
 *
 * Algorithme :
 * 1. Générer un chemin hamiltonien aléatoire (backtracking + shuffle).
 * 2. Sélectionner N indices fixes selon la difficulté.
 * 3. Vérifier que le puzzle est valide (chemin unique possible).
 */

let GRID_SIZE = 6;
let TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

function setGridSize(size) {
    const numeric = Number(size);
    if (!Number.isFinite(numeric)) return;
    GRID_SIZE = Math.max(4, Math.min(10, Math.floor(numeric)));
    TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
}

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

function obstacleBlocksCell(obstacle, index) {
    return obstacle && obstacle.type === 'blocked-cell' && obstacle.index === index;
}

function obstacleBlocksEdge(obstacle, fromIdx, toIdx) {
    if (!obstacle || obstacle.type !== 'blocked-side') return false;
    if (obstacle.index !== fromIdx && obstacle.index !== toIdx) return false;

    const fromRow = Math.floor(fromIdx / GRID_SIZE);
    const fromCol = fromIdx % GRID_SIZE;
    const toRow = Math.floor(toIdx / GRID_SIZE);
    const toCol = toIdx % GRID_SIZE;

    const sideFrom =
        toRow < fromRow ? 'top' :
        toRow > fromRow ? 'bottom' :
        toCol < fromCol ? 'left' :
        toCol > fromCol ? 'right' : null;

    if (!sideFrom) return false;

    const opposite = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
    };

    if (obstacle.index === fromIdx) {
        return obstacle.side === sideFrom;
    }

    return obstacle.side === opposite[sideFrom];
}

function isBlockedCellByObstacles(obstacles, index) {
    return obstacles.some((obstacle) => obstacleBlocksCell(obstacle, index));
}

function isBlockedEdgeByObstacles(obstacles, fromIdx, toIdx) {
    return obstacles.some((obstacle) => obstacleBlocksEdge(obstacle, fromIdx, toIdx));
}

function shortestDistanceWithObstacles(fromIdx, toIdx, obstacles = []) {
    if (fromIdx === toIdx) return 0;

    if (isBlockedCellByObstacles(obstacles, fromIdx) || isBlockedCellByObstacles(obstacles, toIdx)) {
        return Infinity;
    }

    const visited = new Uint8Array(TOTAL_CELLS);
    const distances = new Int16Array(TOTAL_CELLS);
    const queue = [fromIdx];

    visited[fromIdx] = 1;

    while (queue.length > 0) {
        const current = queue.shift();
        const baseDistance = distances[current];

        for (const neighbor of getNeighbors(current)) {
            if (visited[neighbor]) continue;
            if (isBlockedCellByObstacles(obstacles, neighbor)) continue;
            if (isBlockedEdgeByObstacles(obstacles, current, neighbor)) continue;

            visited[neighbor] = 1;
            distances[neighbor] = baseDistance + 1;

            if (neighbor === toIdx) {
                return distances[neighbor];
            }

            queue.push(neighbor);
        }
    }

    return Infinity;
}

function isFarEnough(candidatePos, selectedPositions, path, minDistance, obstacles = []) {
    const candidateCell = path[candidatePos];
    return selectedPositions.every((selectedPos) => {
        const selectedCell = path[selectedPos];
        const distance = obstacles.length
            ? shortestDistanceWithObstacles(candidateCell, selectedCell, obstacles)
            : manhattanDistance(candidateCell, selectedCell);
        return distance >= minDistance;
    });
}

function selectHints(path, difficulty, obstacles = []) {
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
            if (isFarEnough(pos, selectedPositions, path, config.minManhattan, obstacles)) {
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

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function toRowCol(index) {
    return {
        row: Math.floor(index / GRID_SIZE),
        col: index % GRID_SIZE,
    };
}

function getDirection(fromIdx, toIdx) {
    const from = toRowCol(fromIdx);
    const to = toRowCol(toIdx);

    if (to.row === from.row - 1 && to.col === from.col) return 'up';
    if (to.row === from.row + 1 && to.col === from.col) return 'down';
    if (to.col === from.col - 1 && to.row === from.row) return 'left';
    if (to.col === from.col + 1 && to.row === from.row) return 'right';
    return null;
}

function createBlockedSideObstacle(solutionPath) {
    if (solutionPath.length < 2) return null;

    const sideNames = ['top', 'right', 'bottom', 'left'];
    const candidates = [];

    for (let pos = 0; pos < solutionPath.length; pos++) {
        const cell = solutionPath[pos];
        const prev = pos > 0 ? solutionPath[pos - 1] : null;
        const next = pos < solutionPath.length - 1 ? solutionPath[pos + 1] : null;

        const usedSides = new Set();

        if (prev !== null) {
            const enterSide = getDirection(cell, prev);
            if (enterSide) usedSides.add(enterSide);
        }

        if (next !== null) {
            const exitSide = getDirection(cell, next);
            if (exitSide) usedSides.add(exitSide);
        }

        const allowedSides = sideNames.filter((side) => !usedSides.has(side));
        if (allowedSides.length === 0) continue;

        candidates.push({
            index: cell,
            side: randomChoice(allowedSides),
        });
    }

    if (candidates.length === 0) return null;
    return randomChoice(candidates);
}

function applyHardObstacles(rawPath) {
    let solutionPath = [...rawPath];
    const obstacles = [];

    let includeBlockedCell = Math.random() < 0.65;
    let includeBlockedSide = Math.random() < 0.65;

    // En difficile il doit y avoir au moins un obstacle.
    if (!includeBlockedCell && !includeBlockedSide) {
        if (Math.random() < 0.5) includeBlockedCell = true;
        else includeBlockedSide = true;
    }

    if (includeBlockedCell && solutionPath.length > 2) {
        const cutStart = Math.random() < 0.5;
        const blockedIndex = cutStart ? solutionPath[0] : solutionPath[solutionPath.length - 1];

        obstacles.push({
            type: 'blocked-cell',
            index: blockedIndex,
        });

        solutionPath = cutStart ? solutionPath.slice(1) : solutionPath.slice(0, -1);
    }

    if (includeBlockedSide) {
        const blockedSide = createBlockedSideObstacle(solutionPath);
        if (blockedSide) {
            obstacles.push({
                type: 'blocked-side',
                index: blockedSide.index,
                side: blockedSide.side,
            });
        }
    }

    if (obstacles.length === 0 && solutionPath.length > 2) {
        const blockedSide = createBlockedSideObstacle(solutionPath);
        if (blockedSide) {
            obstacles.push({
                type: 'blocked-side',
                index: blockedSide.index,
                side: blockedSide.side,
            });
        }
    }

    return { solutionPath, obstacles };
}

/* ---------- Génération complète ---------- */
function generatePuzzle(difficulty = 'medium') {
    const rawPath = generateHamiltonianPath();

    let solutionPath = rawPath;
    let obstacles = [];

    if (difficulty === 'hard') {
        const hardSetup = applyHardObstacles(rawPath);
        solutionPath = hardSetup.solutionPath;
        obstacles = hardSetup.obstacles;
    }

    const numbers = selectHints(solutionPath, difficulty, obstacles);

    return { solutionPath, numbers, obstacles };
}

function sanitizeCustomNumbers(rawNumbers) {
    const source = Array.isArray(rawNumbers) ? rawNumbers : [];
    const byValue = new Map();
    const byIndex = new Map();

    for (const item of source) {
        const value = Number(item && item.value);
        const index = Number(item && item.index);

        if (!Number.isFinite(value) || !Number.isFinite(index)) continue;
        if (value < 1 || value > 10) continue;
        if (index < 0 || index >= TOTAL_CELLS) continue;
        if (byValue.has(value) || byIndex.has(index)) continue;

        const entry = { value: Math.floor(value), index: Math.floor(index) };
        byValue.set(entry.value, entry);
        byIndex.set(entry.index, entry);
    }

    const numbers = Array.from(byValue.values()).sort((a, b) => a.value - b.value);

    if (!numbers.length) {
        return { valid: false, reason: 'Place au moins 2 chiffres.' };
    }

    if (numbers.length < 2) {
        return { valid: false, reason: 'Place au moins 2 chiffres.' };
    }

    if (numbers[0].value !== 1) {
        return { valid: false, reason: 'Le chiffre 1 est obligatoire.' };
    }

    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i].value !== i + 1) {
            return { valid: false, reason: 'Les chiffres doivent se suivre: 1, 2, 3...' };
        }
    }

    return { valid: true, numbers };
}

function findConstrainedHamiltonianPath(numbers, timeLimitMs = 1200) {
    const constraintByIndex = new Map(numbers.map((n) => [n.index, n.value]));
    const expectedValues = numbers.map((n) => n.value);
    const startIndex = numbers[0].index;
    const deadline = Date.now() + timeLimitMs;

    const visited = new Uint8Array(TOTAL_CELLS);
    const path = [];

    function sortCandidates(candidates) {
        return candidates.sort((a, b) => {
            const degreeA = getNeighbors(a).filter((n) => !visited[n]).length;
            const degreeB = getNeighbors(b).filter((n) => !visited[n]).length;
            if (degreeA !== degreeB) return degreeA - degreeB;
            return Math.random() - 0.5;
        });
    }

    function backtrack(current, nextConstraintPos) {
        if (Date.now() > deadline) return false;

        const currentConstraintValue = constraintByIndex.get(current);
        let nextPos = nextConstraintPos;

        if (typeof currentConstraintValue === 'number') {
            const expected = expectedValues[nextPos];
            if (currentConstraintValue !== expected) return false;
            nextPos += 1;
        }

        if (path.length === TOTAL_CELLS) {
            return nextPos === expectedValues.length;
        }

        const candidates = sortCandidates(
            getNeighbors(current).filter((n) => !visited[n])
        );

        for (const next of candidates) {
            const nextConstraintValue = constraintByIndex.get(next);
            if (typeof nextConstraintValue === 'number') {
                const expected = expectedValues[nextPos];
                if (nextConstraintValue !== expected) {
                    continue;
                }
            }

            visited[next] = 1;
            path.push(next);

            if (backtrack(next, nextPos)) return true;

            path.pop();
            visited[next] = 0;
        }

        return false;
    }

    visited[startIndex] = 1;
    path.push(startIndex);

    const found = backtrack(startIndex, 0);
    if (!found) return null;

    return [...path];
}

function validateCustomLevel(rawNumbers) {
    const sanitized = sanitizeCustomNumbers(rawNumbers);
    if (!sanitized.valid) {
        return {
            feasible: false,
            reason: sanitized.reason,
        };
    }

    const solutionPath = findConstrainedHamiltonianPath(sanitized.numbers, 1400);
    if (!solutionPath) {
        return {
            feasible: false,
            reason: 'Reessayer: le niveau est pas faisable.',
        };
    }

    return {
        feasible: true,
        solutionPath,
        numbers: sanitized.numbers,
    };
}

/* ---------- Interface Web Worker ---------- */
self.onmessage = function (e) {
    if (e.data.type === 'GENERATE_PUZZLE') {
        const difficulty = e.data.difficulty ?? 'medium';
        setGridSize(e.data.gridSize ?? 6);
        const result = generatePuzzle(difficulty);
        self.postMessage({ type: 'PUZZLE_RESULT', payload: result });
        return;
    }

    if (e.data.type === 'VALIDATE_CUSTOM_LEVEL') {
        setGridSize(e.data.gridSize ?? 6);
        const validation = validateCustomLevel(e.data.numbers);
        self.postMessage({
            type: 'CUSTOM_LEVEL_VALIDATION_RESULT',
            payload: {
                requestId: e.data.requestId,
                ...validation,
            }
        });
    }
};