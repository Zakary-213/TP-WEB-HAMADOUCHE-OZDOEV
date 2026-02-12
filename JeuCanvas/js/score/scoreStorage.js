const STORAGE_KEY = 'meteorite_scores';


function getDefaultStructure() {
    return {
        solo: [],
        duo: [],
        duel: []
    };
}


export function getAllScores() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return getDefaultStructure();
    }

    try {
        const parsed = JSON.parse(raw);

        // Sécuriser la structure
        return {
            solo: Array.isArray(parsed.solo) ? parsed.solo : [],
            duo: Array.isArray(parsed.duo) ? parsed.duo : [],
            duel: Array.isArray(parsed.duel) ? parsed.duel : []
        };
    } catch (error) {
        console.warn('Scores corrompus, réinitialisation.');
        return getDefaultStructure();
    }
}

export function saveAllScores(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


export function clearAllScores() {
    localStorage.removeItem(STORAGE_KEY);
}
