/**
 * @module scoreStorage
 * @description Couche d'accès aux données pour le stockage local.
 * Gère la sérialisation/désérialisation JSON et la récupération après corruption des données.
 */

/** @const {string} Clé utilisée pour le stockage dans le localStorage */
const STORAGE_KEY = 'meteorite_scores';

/**
 * Retourne la structure de données initiale pour les scores.
 * @returns {Object} Un objet contenant des tableaux vides pour chaque mode.
 */
function getDefaultStructure() {
    return {
        solo: [],
        duo: [],
        duel: []
    };
}

/**
 * Récupère l'intégralité des scores stockés.
 * Inclut une validation de structure pour éviter les erreurs lors de la lecture.
 * @returns {Object} Les scores formatés ou la structure par défaut en cas d'absence/erreur.
 */
export function getAllScores() {
    const raw = localStorage.getItem(STORAGE_KEY);

    // Si aucune donnée n'existe encore
    if (!raw) {
        return getDefaultStructure();
    }

    try {
        const parsed = JSON.parse(raw);

        /**
         * Sécurisation de la structure :
         * On s'assure que chaque propriété est bien un tableau pour éviter les crashs
         * lors de l'utilisation de méthodes comme .sort() ou .push() plus tard.
         */
        return {
            solo: Array.isArray(parsed.solo) ? parsed.solo : [],
            duo: Array.isArray(parsed.duo) ? parsed.duo : [],
            duel: Array.isArray(parsed.duel) ? parsed.duel : []
        };
    } catch (error) {
        // En cas de JSON malformé (édition manuelle du localStorage par exemple)
        console.warn('Données de scores corrompues ou illisibles, réinitialisation du stockage.');
        return getDefaultStructure();
    }
}

/**
 * Enregistre l'objet de scores complet dans le localStorage.
 * @param {Object} data - L'objet contenant les tableaux de scores solo, duo et duel.
 */
export function saveAllScores(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde des scores (quota plein ?)", e);
    }
}

/**
 * Supprime définitivement la clé des scores du stockage local.
 */
export function clearAllScores() {
    localStorage.removeItem(STORAGE_KEY);
}