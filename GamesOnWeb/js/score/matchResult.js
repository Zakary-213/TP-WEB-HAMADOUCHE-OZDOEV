export async function saveScoreToDB(scoreData) {
    const userId =
        (window.CANVAS_API && typeof window.CANVAS_API.getUserId === 'function'
            ? window.CANVAS_API.getUserId()
            : localStorage.getItem('tpweb_user_id'));

    if (!userId) {
        console.warn("Utilisateur non connecté, score non sauvegardé sur le serveur.");
        return { success: false, message: "User not logged in" };
    }

    const safeData = scoreData || {};
    const minuteButs = Array.isArray(safeData.minuteButs) ? safeData.minuteButs : [];
    const minuteButsAdversaire = Array.isArray(safeData.minuteButsAdversaire)
        ? safeData.minuteButsAdversaire
        : [];

    const totalButs = Number.isFinite(Number(safeData.totalButs)) ? Number(safeData.totalButs) : 0;
    const totalButsAdversaire = Number.isFinite(Number(safeData.totalButsAdversaire))
        ? Number(safeData.totalButsAdversaire)
        : 0;

    const result = safeData.result || safeData.Résultat || 'draw';

    const payload = {
        userId,
        game: 'gamesonweb',
        mode: safeData.mode || '1v1',
        // Le backend /api/scores/scorecanvas exige totalTime; on le dérive du dernier but.
        totalTime: Math.max(
            0,
            ...minuteButs.map((m) => Number(m) || 0),
            ...minuteButsAdversaire.map((m) => Number(m) || 0)
        ) * 60000,
        // Champ requis dans Score existant, réutilisé ici pour éviter de casser l'API actuelle.
        totalMeteorites: totalButs,
        data: {
            result,
            totalButs,
            totalButsAdversaire,
            minuteButs,
            minuteButsAdversaire,
            ...safeData
        }
    };

    const toUrl = (path) => {
        if (window.CANVAS_API && typeof window.CANVAS_API.toUrl === 'function') {
            return window.CANVAS_API.toUrl(path);
        }
        return path;
    };


     try {
        const response = await fetch(toUrl('/api/scores/scorecanvas'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du score sur le serveur:", error);
        return { success: false, error: error.message };
    }
};

