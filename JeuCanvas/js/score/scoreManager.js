/**
 * @module scoreManager
 * @description Gère la logique métier du classement en communiquant avec l'API.
 */

import { saveScoreToDB, getTopScoresFromDB } from './scoreStorage.js';
import { createSoloScore, createDuoScore} from './scoreModels.js';

/** Caches locaux pour les scores récupérés de l'API */
let cachedScores = {
    solo: [],
    duo: []
};

/**
 * Enregistre un nouveau score Solo via l'API.
 * @param {Object} data - Les données brutes du score (pseudo, niveaux, temps).
 */
export async function addSoloScore(data) {
    const newScore = createSoloScore(data);
    newScore.mode = 'solo';
    
    const result = await saveScoreToDB(newScore);
    if (result.success) {
        // Optionnel : on pourrait re-fetcher ici pour mettre à jour le cache immédiatement
        fetchScores('solo');
    }
}

/**
 * Enregistre un nouveau score Duo via l'API.
 * @param {Object} data - Les données brutes (joueurs, niveauxTime).
 */
export async function addDuoScore(data) {
    const newScore = createDuoScore(data);
    newScore.mode = 'duo';
    
    const result = await saveScoreToDB(newScore);
    if (result.success) {
        fetchScores('duo');
    }
}

/**
 * Déclenche la récupération des scores depuis le serveur et met à jour le cache.
 * @param {string} mode - 'solo' ou 'duo'.
 */
export async function fetchScores(mode) {
    const scores = await getTopScoresFromDB(mode);
    cachedScores[mode] = scores;
}

/**
 * Récupère le classement actuel (depuis le cache).
 * @param {string} mode - 'solo' ou 'duo'.
 * @returns {Array} La liste des scores filtrée.
 */
export function getScores(mode) {
    return cachedScores[mode] || [];
}

/**
 * Version asynchrone pour forcer une mise à jour avant lecture si nécessaire.
 */
export async function getScoresAsync(mode) {
    await fetchScores(mode);
    return getScores(mode);
}

// Les fonctions de suppression ne sont plus gérées en local par l'utilisateur
export function clearMode(mode) {}
export function clearAll() {}
export function getAll() { return cachedScores; }