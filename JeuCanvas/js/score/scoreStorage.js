/**
 * @module scoreStorage
 * @description Couche d'accès aux données pour le stockage des scores via API.
 */

/**
 * Enregistre un nouveau score dans la base de données.
 * @param {Object} scoreData - Les données du score à sauvegarder.
 * @returns {Promise<Object>} La réponse du serveur.
 */
export async function saveScoreToDB(scoreData) {
    const userId = window.CANVAS_API.getUserId();
    
    if (!userId) {
        console.warn("Utilisateur non connecté, score non sauvegardé sur le serveur.");
        return { success: false, message: "User not logged in" };
    }

    const payload = {
        userId,
        game: 'canvas',
        mode: scoreData.mode,
        totalTime: scoreData.totalTime,
        totalMeteorites: scoreData.totalMeteorites,
        data: scoreData // Full object with levels etc.
    };

    try {
        const response = await fetch(window.CANVAS_API.toUrl('/api/scores/scorecanvas'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du score sur le serveur:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Récupère les top scores depuis le serveur.
 * @param {string} mode - 'solo' ou 'duo'.
 * @returns {Promise<Array>} La liste des scores.
 */
export async function getTopScoresFromDB(mode) {
    const userId = window.CANVAS_API.getUserId();

    if (!userId) {
        return [];
    }

    try {
        const query = new URLSearchParams({
            game: 'canvas',
            mode,
            userId
        });
        const url = window.CANVAS_API.toUrl(`/api/scores/top?${query.toString()}`);
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            // Adapter le format API au format attendu par l'UI Canvas existante.
            return result.data.map((s) => {
                const payload = s.data || {};
                const pseudo = payload.pseudo || (s.user ? s.user.username : 'Inconnu');

                if (mode === 'duo') {
                    return {
                        joueurs: Array.isArray(payload.joueurs) ? payload.joueurs : [],
                        niveaux: Array.isArray(payload.niveaux) ? payload.niveaux : [],
                        totalTime: s.totalTime ?? payload.totalTime ?? 0,
                        totalMeteorites: s.totalMeteorites ?? payload.totalMeteorites ?? 0,
                        date: new Date(s.createdAt).getTime()
                    };
                }

                return {
                    pseudo,
                    niveaux: Array.isArray(payload.niveaux) ? payload.niveaux : [],
                    totalTime: s.totalTime ?? payload.totalTime ?? 0,
                    totalMeteorites: s.totalMeteorites ?? payload.totalMeteorites ?? 0,
                    date: new Date(s.createdAt).getTime()
                };
            });
        }
        return [];
    } catch (error) {
        console.error("Erreur lors de la récupération des scores:", error);
        return [];
    }
}

// Les anciennes fonctions de localStorage sont supprimées ou vidées car l'utilisateur n'en veut plus.
export function getAllScores() { return { solo: [], duo: [] }; }
export function saveAllScores(data) {}
export function clearAllScores() {}