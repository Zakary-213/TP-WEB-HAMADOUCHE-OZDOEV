/**
 * worker-client.js – Interface entre main.js et le Web Worker de génération.
 * Le chemin vers worker.js est relatif à index.html (pas à ce module).
 */

/**
 * @param {(result: {solutionPath: number[], numbers: {index:number,value:number}[]}) => void} onPuzzleReady
 * @param {(msg: string) => void} onError
 */
export function createPuzzleWorker(onPuzzleReady, onError) {
    // Le Worker est chargé depuis le contexte de la page (Dom/) – pas du module.
    const worker = new Worker('worker.js');
    const pendingValidations = new Map();
    let requestId = 0;

    worker.onmessage = (e) => {
        if (e.data.type === 'PUZZLE_RESULT') {
            const result = e.data.payload;
            if (!result || !result.solutionPath || result.solutionPath.length === 0) {
                onError('Impossible de générer un puzzle. Veuillez réessayer.');
                return;
            }
            onPuzzleReady(result);
            return;
        }

        if (e.data.type === 'CUSTOM_LEVEL_VALIDATION_RESULT') {
            const payload = e.data.payload || {};
            const pending = pendingValidations.get(payload.requestId);
            if (pending) {
                pendingValidations.delete(payload.requestId);
                pending(payload);
            }
        }
    };

    worker.onerror = (err) => {
        console.error('[Worker Error]', err);
        onError('Erreur dans le Worker. Vérifiez la console.');
    };

    /**
     * Demande la génération d'un nouveau puzzle.
     * @param {'easy'|'medium'|'hard'} difficulty
     * @param {number} gridSize
     */
    function loadPuzzle(difficulty = 'medium', gridSize = 6) {
        worker.postMessage({ type: 'GENERATE_PUZZLE', difficulty, gridSize });
    }

    function validateCustomLevel(numbers = [], gridSize = 6) {
        return new Promise((resolve) => {
            requestId += 1;
            const id = requestId;
            pendingValidations.set(id, resolve);

            worker.postMessage({
                type: 'VALIDATE_CUSTOM_LEVEL',
                requestId: id,
                numbers,
                gridSize,
            });
        });
    }

    return { loadPuzzle, validateCustomLevel };
}
