import { Obstacle } from './Obstacle.js';

function toRowCol(index, gridSize) {
    return {
        row: Math.floor(index / gridSize),
        col: index % gridSize
    };
}

function getDirection(fromIdx, toIdx, gridSize) {
    const from = toRowCol(fromIdx, gridSize);
    const to = toRowCol(toIdx, gridSize);

    if (to.row === from.row - 1 && to.col === from.col) return 'up';
    if (to.row === from.row + 1 && to.col === from.col) return 'down';
    if (to.col === from.col - 1 && to.row === from.row) return 'left';
    if (to.col === from.col + 1 && to.row === from.row) return 'right';
    return null;
}

function resolveTurnCorner(enterDir, exitDir) {
    const dirs = new Set([enterDir, exitDir]);

    if (dirs.has('up') && dirs.has('left')) return 'top-left';
    if (dirs.has('up') && dirs.has('right')) return 'top-right';
    if (dirs.has('down') && dirs.has('left')) return 'bottom-left';
    if (dirs.has('down') && dirs.has('right')) return 'bottom-right';

    return null;
}

export class BlockedCornerObstacle extends Obstacle {
    constructor(index, corner) {
        super('blocked-corner', index);
        this.corner = corner;
    }

    applyToCell(cellEl) {
        cellEl.classList.add(`obstacle-corner-${this.corner}`);
    }

    blocksTurn(prevIdx, cellIdx, nextIdx, gridSize) {
        if (cellIdx !== this.index || prevIdx === null || nextIdx === null) {
            return false;
        }

        const enterDir = getDirection(cellIdx, prevIdx, gridSize);
        const exitDir = getDirection(cellIdx, nextIdx, gridSize);
        if (!enterDir || !exitDir) return false;

        const usedCorner = resolveTurnCorner(enterDir, exitDir);
        return usedCorner === this.corner;
    }
}
