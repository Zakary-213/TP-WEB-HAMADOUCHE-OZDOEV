/**
 * state.js – État global du jeu.
 * On utilise des objets mutables pour que les modules partagent la même référence.
 */

/** État de la partie (données logiques). */
export const gameState = {
    /** Chemin tracé par le joueur : liste d'indices de cellules (0-based). */
    path: [],
    /** Indices du puzzle : [{ index, value }] – seulement les hints visibles. */
    numbers: [],
    /** Chemin solution (fourni par le worker, non montré au joueur). */
    solutionPath: [],
    /** Obstacles instanciés via héritage (classe mère Obstacle + classes filles). */
    obstacles: [],
    /** Secondes écoulées depuis le début. */
    elapsedSeconds: 0,
    /** Difficulté courante. */
    difficulty: 'medium',
};

/** État de l'UI (interaction souris / tactile). */
export const uiState = {
    /** Vrai si le joueur est en train de tracer (bouton maintenu). */
    isDrawing: false,
    /** Cellule recommandée par le bouton indice (surbrillance visuelle). */
    hintTargetIndex: null,
};
