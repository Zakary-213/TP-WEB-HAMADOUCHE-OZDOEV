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

    if (to.row === from.row - 1 && to.col === from.col) return 'top';
    if (to.row === from.row + 1 && to.col === from.col) return 'bottom';
    if (to.col === from.col - 1 && to.row === from.row) return 'left';
    if (to.col === from.col + 1 && to.row === from.row) return 'right';
    return null;
}

export class BlockedSideObstacle extends Obstacle {
    constructor(index, side) {
        super('blocked-side', index);
        this.side = side;
    }

    applyToCell(cellEl) {
        cellEl.classList.add(`obstacle-side-${this.side}`);
    }

    blocksEdge(fromIdx, toIdx, gridSize) {
        if (fromIdx === this.index) {
            const dir = getDirection(fromIdx, toIdx, gridSize);
            return dir === this.side;
        }

        if (toIdx === this.index) {
            const dir = getDirection(toIdx, fromIdx, gridSize);
            return dir === this.side;
        }

        return false;
    }
}
