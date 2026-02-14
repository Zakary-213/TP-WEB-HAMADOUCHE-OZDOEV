/**
 * @module scoreManager
 * @description Gère la logique métier du classement.
 * Responsable du tri des scores, du filtrage par mode et de la limitation du nombre d'entrées.
 */

import { getAllScores, saveAllScores } from './scoreStorage.js';
import { createSoloScore, createDuoScore} from './scoreModels.js';

/** @const {number} Nombre maximum de scores conservés par classement */
const MAX_SCORES = 10;

/**
 * Trie une liste de scores par ordre croissant de temps total (le plus rapide en premier).
 * @param {string} mode - Le mode de jeu ('solo' ou 'duo').
 * @param {Array} scores - La liste des scores à trier.
 * @returns {Array} La liste triée.
 */
function sortScores(mode, scores) {
    if (mode === 'solo' || mode === 'duo') {
        return scores.sort((a, b) => a.totalTime - b.totalTime);
    }
    return scores;
}

/**
 * Limite la liste aux meilleures performances (Top 10).
 * @param {Array} scores - La liste complète des scores.
 * @returns {Array} La liste tronquée.
 */
function limitScores(scores) {
    return scores.slice(0, MAX_SCORES);
}

/**
 * Enregistre un nouveau score Solo.
 * Si le pseudo existe déjà, le score n'est mis à jour que s'il est meilleur que l'ancien.
 * @param {Object} data - Les données brutes du score (pseudo, niveaux, temps).
 */
export function addSoloScore(data) {
    const allScores = getAllScores();
    const newScore = createSoloScore(data);

    // Recherche d'une entrée existante pour ce joueur
    const existingIndex = allScores.solo.findIndex(
        score => score.pseudo === newScore.pseudo
    );

    if (existingIndex !== -1) {
        const existingScore = allScores.solo[existingIndex];

        // Remplacement uniquement en cas d'amélioration (temps plus faible)
        if (newScore.totalTime < existingScore.totalTime) {
            allScores.solo[existingIndex] = newScore;
        } else {
            return;
        }
    } else {
        // Ajout simple si c'est un nouveau joueur
        allScores.solo.push(newScore);
    }

    // Réorganisation et limitation du classement
    const sorted = sortScores('solo', allScores.solo);
    allScores.solo = limitScores(sorted);

    saveAllScores(allScores);
}

/**
 * Enregistre un nouveau score Duo.
 * @param {Object} data - Les données brutes (joueurs, niveauxTime).
 */
export function addDuoScore(data) {
    const allScores = getAllScores();
    const newScore = createDuoScore(data);

    allScores.duo.push(newScore);

    // Réorganisation et limitation
    const sorted = sortScores('duo', allScores.duo);
    allScores.duo = limitScores(sorted);

    saveAllScores(allScores);
}

/**
 * Récupère le classement pour un mode spécifique.
 * @param {string} mode - 'solo' ou 'duo'.
 * @returns {Array} La liste des scores filtrée.
 */
export function getScores(mode) {
    const allScores = getAllScores();
    return allScores[mode] || [];
}

/**
 * Récupère l'intégralité du stockage (tous les modes).
 * @returns {Object}
 */
export function getAll() {
    return getAllScores();
}

/**
 * Réinitialise les scores pour un mode de jeu spécifique.
 * @param {string} mode - Le mode à vider.
 */
export function clearMode(mode) {
    const allScores = getAllScores();
    if (allScores[mode]) {
        allScores[mode] = [];
        saveAllScores(allScores);
    }
}

/**
 * Supprime l'intégralité des données du classement.
 */
export function clearAll() {
    saveAllScores({
        solo: [],
        duo: []
    });
}