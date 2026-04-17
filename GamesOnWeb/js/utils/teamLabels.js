const TEAM_SKIN_NAMES = {
    skin0: "PARIS",
    skin1: "LYON",
    huitieme: "MARSEILLE",
    finale: "BORDEAUX",
    demi: "LILLE",
    quart: "NANTES",
    skin6: "TOULOUSE",
    skin7: "RENNES",
    skin8: "NICE",
    skin9: "STRASBOURG"
};

const DEFAULT_LEFT_LABEL = "YOU";
const DEFAULT_RIGHT_LABEL = "IA";

function normalizeLabel(label) {
    return String(label || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

export function getTeamDisplayNameFromSkinId(skinId, fallbackName) {
    return TEAM_SKIN_NAMES[skinId] || fallbackName || "TEAM";
}

export function getSelectedTeamDisplayName(storageKey, fallbackName) {
    if (typeof window === "undefined" || !window.localStorage) {
        return fallbackName || "TEAM";
    }

    const skinId = window.localStorage.getItem(storageKey);
    return getTeamDisplayNameFromSkinId(skinId, fallbackName);
}

export function getTeamShortLabel(name, fallbackLabel) {
    const normalized = normalizeLabel(name);
    if (normalized.length >= 2) {
        return normalized.slice(0, 2);
    }

    if (normalized.length === 1) {
        return normalized + (fallbackLabel ? String(fallbackLabel).slice(0, 1) : "X");
    }

    return fallbackLabel || "XX";
}

export function getVersusTeamLabels() {
    return {
        leftName: getSelectedTeamDisplayName("gow-player1-skin-ui", DEFAULT_LEFT_LABEL),
        rightName: getSelectedTeamDisplayName("gow-player2-skin-ui", DEFAULT_RIGHT_LABEL)
    };
}

export function getVersusScoreboardLabels() {
    const names = getVersusTeamLabels();
    return {
        left: getTeamShortLabel(names.leftName, DEFAULT_LEFT_LABEL.slice(0, 2)),
        right: getTeamShortLabel(names.rightName, DEFAULT_RIGHT_LABEL.slice(0, 2))
    };
}
