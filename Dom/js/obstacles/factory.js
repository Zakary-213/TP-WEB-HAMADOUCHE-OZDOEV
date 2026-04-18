import { BlockedCellObstacle } from './BlockedCellObstacle.js';
import { BlockedSideObstacle } from './BlockedSideObstacle.js';

export function createObstacles(definitions) {
    if (!Array.isArray(definitions)) return [];

    return definitions
        .map((def) => {
            if (!def || typeof def !== 'object') return null;
            if (def.type === 'blocked-cell') {
                return new BlockedCellObstacle(def.index);
            }
            if (def.type === 'blocked-side') {
                return new BlockedSideObstacle(def.index, def.side);
            }
            if (def.type === 'blocked-corner' && def.corner) {
                const cornerToSide = {
                    'top-left': 'top',
                    'top-right': 'top',
                    'bottom-left': 'bottom',
                    'bottom-right': 'bottom'
                };
                return new BlockedSideObstacle(def.index, cornerToSide[def.corner] || 'top');
            }
            return null;
        })
        .filter(Boolean);
}
