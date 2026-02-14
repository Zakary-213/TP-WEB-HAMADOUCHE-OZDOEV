/**
 * @module scoreModels
 * @description Définit les structures de données (modèles) pour les scores du jeu.
 * Effectue les calculs d'agrégation (sommes des temps et des météorites) lors de la création.
 */

/**
 * @typedef {Object} SoloScore
 * @property {string} pseudo - Nom du joueur.
 * @property {Array} niveaux - Détail des statistiques par niveau.
 * @property {number} totalTime - Cumul du temps sur tous les niveaux.
 * @property {number} totalMeteorites - Cumul des météorites détruites.
 * @property {number} date - Timestamp de l'enregistrement.
 */

/**
 * Formate et calcule les données pour un score en mode Solo.
 * @param {Object} params - Les données d'entrée.
 * @param {string} params.pseudo - Le pseudo du joueur.
 * @param {Array} params.niveaux - Tableau d'objets { niveau, time, meteorites }.
 * @returns {SoloScore} L'objet score prêt pour le stockage.
 */
export function createSoloScore({ pseudo, niveaux }) {
    // Calcul des totaux par réduction de tableau
    const totalTime = niveaux.reduce((acc, lvl) => acc + lvl.time, 0);
    const totalMeteorites = niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);

    return {
        pseudo,
        niveaux,
        totalTime,
        totalMeteorites,
        date: Date.now()
    };
}

/**
 * @typedef {Object} DuoScore
 * @property {Array} joueurs - Liste des deux joueurs avec leurs stats individuelles.
 * @property {Array} niveaux - Temps de complétion global par niveau.
 * @property {number} totalTime - Temps total de la partie.
 * @property {number} totalMeteorites - Somme des météorites des deux joueurs.
 * @property {number} date - Timestamp de l'enregistrement.
 */

/**
 * Formate et calcule les données pour un score en mode Duo.
 * @param {Object} params - Les données d'entrée.
 * @param {Object} params.joueur1 - Données du J1 { pseudo, niveaux }.
 * @param {Object} params.joueur2 - Données du J2 { pseudo, niveaux }.
 * @param {Array} params.niveauxTime - Temps global par niveau.
 * @returns {DuoScore} L'objet score prêt pour le stockage.
 */
export function createDuoScore({ joueur1, joueur2, niveauxTime }) {
    // Calcul du temps total de la session Duo
    const totalTime = niveauxTime.reduce((acc, lvl) => acc + lvl.time, 0);

    // Agrégation des scores individuels (météorites)
    const totalMeteoritesJ1 = joueur1.niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);
    const totalMeteoritesJ2 = joueur2.niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);

    return {
        joueurs: [
            {
                pseudo: joueur1.pseudo,
                niveaux: joueur1.niveaux,
                totalMeteorites: totalMeteoritesJ1
            },
            {
                pseudo: joueur2.pseudo,
                niveaux: joueur2.niveaux,
                totalMeteorites: totalMeteoritesJ2
            }
        ],
        niveaux: niveauxTime,
        totalTime,
        totalMeteorites: totalMeteoritesJ1 + totalMeteoritesJ2,
        date: Date.now()
    };
}