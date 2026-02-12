import { getAllScores, saveAllScores } from './scoreStorage.js';
import { createSoloScore, createDuoScore} from './scoreModels.js';

const MAX_SCORES = 10;

function sortScores(mode, scores) {
    if (mode === 'solo' || mode === 'duo') {
        return scores.sort((a, b) => a.totalTime - b.totalTime);
    }
    return scores;
}

function limitScores(scores) {
    return scores.slice(0, MAX_SCORES);
}

export function addSoloScore(data) {
    const allScores = getAllScores();
    const newScore = createSoloScore(data);

    // Chercher si le pseudo existe déjà
    const existingIndex = allScores.solo.findIndex(
        score => score.pseudo === newScore.pseudo
    );

    if (existingIndex !== -1) {
        const existingScore = allScores.solo[existingIndex];

        // On remplace seulement si le nouveau est meilleur (temps plus petit)
        if (newScore.totalTime < existingScore.totalTime) {
            allScores.solo[existingIndex] = newScore;
        } else {
            console.log("Score non amélioré, pas remplacé.");
            return;
        }
    } else {
        // Nouveau pseudo
        allScores.solo.push(newScore);
    }

    const sorted = sortScores('solo', allScores.solo);
    allScores.solo = limitScores(sorted);

    saveAllScores(allScores);
}

export function addDuoScore(data) {
    const allScores = getAllScores();

    const newScore = createDuoScore(data);

    allScores.duo.push(newScore);

    const sorted = sortScores('duo', allScores.duo);
    allScores.duo = limitScores(sorted);

    saveAllScores(allScores);
}

export function getScores(mode) {
    const allScores = getAllScores();
    return allScores[mode] || [];
}

export function getAll(mode) {
    return getAllScores();
}

export function clearMode(mode) {
    const allScores = getAllScores();
    if (allScores[mode]) {
        allScores[mode] = [];
        saveAllScores(allScores);
    }
}

export function clearAll() {
    saveAllScores({
        solo: [],
        duo: []
    });
}
