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

    worker.onmessage = (e) => {
        if (e.data.type !== 'PUZZLE_RESULT') return;
        const result = e.data.payload;
        if (!result || !result.solutionPath || result.solutionPath.length === 0) {
            onError('Impossible de générer un puzzle. Veuillez réessayer.');
            return;
        }
        onPuzzleReady(result);
    };

    worker.onerror = (err) => {
        console.error('[Worker Error]', err);
        onError('Erreur dans le Worker. Vérifiez la console.');
    };

    /**
     * Demande la génération d'un nouveau puzzle.
     * @param {'easy'|'medium'|'hard'} difficulty
     */
    function loadPuzzle(difficulty = 'medium') {
        worker.postMessage({ type: 'GENERATE_PUZZLE', difficulty });
    }

    return { loadPuzzle };
}
