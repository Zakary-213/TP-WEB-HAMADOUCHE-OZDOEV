export class Obstacle {
    constructor(type, index) {
        this.type = type;
        this.index = index;
    }

    appliesToCell(index) {
        return this.index === index;
    }

    applyToCell(_cellEl) {}

    blocksCell(_index) {
        return false;
    }

    blocksTurn(_prevIdx, _cellIdx, _nextIdx, _gridSize) {
        return false;
    }

    blocksEdge(_fromIdx, _toIdx, _gridSize) {
        return false;
    }
}
