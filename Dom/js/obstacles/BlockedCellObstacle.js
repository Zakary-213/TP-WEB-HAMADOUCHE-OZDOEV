import { Obstacle } from './Obstacle.js';

export class BlockedCellObstacle extends Obstacle {
    constructor(index) {
        super('blocked-cell', index);
    }

    applyToCell(cellEl) {
        cellEl.classList.add('obstacle-blocked-cell');
    }

    blocksCell(index) {
        return this.index === index;
    }
}
