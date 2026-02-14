/**
 * @module gameState
 * * Gestion centralisée de l'état logique du jeu, des configurations clavier
 * et des transitions entre les différents menus et phases de gameplay.
 */

import niveau1 from '../niveaux/solo/niveau1.js';
import niveau2 from '../niveaux/solo/niveau2.js';
import niveau3 from '../niveaux/solo/niveau3.js';
import niveau1Duo from '../niveaux/duo/niveau1Duo.js';
import niveau2Duo from '../niveaux/duo/niveau2Duo.js';
import niveau3Duo from '../niveaux/duo/niveau3Duo.js';

/**
 * États globaux de la machine à états du jeu.
 * @readonly
 * @enum {string}
 */
export const ETAT = {
    MENU: 'MENU ACCUEIL',
    CHOIX_MODE: 'CHOIX MODE',
    JEU: 'JEU EN COURS',
    DUEL: 'JEU DUEL',
    GAME_OVER: 'GAME OVER',
    TRANSITION: 'TRANSITION NIVEAU',
    SCORE: 'score',
    REGLES: 'regles'
};

/** @type {Array} Liste des modules de niveaux pour le mode solo */
export const LEVELS = [niveau1, niveau2, niveau3];

/** @type {Array} Liste des modules de niveaux pour le mode duo */
export const LEVELS_DUO = [niveau1Duo, niveau2Duo, niveau3Duo];

// ==========================================
//  Configuration des contrôles (Input)
// ==========================================

/** * Touches J1 : initialisées via le stockage local ou valeurs par défaut (flèches).
 * @type {Object} 
 */
export let customKeys = {
    up: localStorage.getItem('key_up') || '↑',
    left: localStorage.getItem('key_left') || '←',
    down: localStorage.getItem('key_down') || '↓',
    right: localStorage.getItem('key_right') || '→',
    shoot: localStorage.getItem('key_shoot') || 'Entrée'
};

/** * Touches J2 : initialisées par défaut en ZQSD.
 * @type {Object} 
 */
export let customKeys2 = {
    up: 'z',
    left: 'q',
    down: 's',
    right: 'd',
    shoot: 'Entrée'
};

/**
 * Traduit les symboles d'affichage en constantes KeyboardEvent.key.
 * @param {string} savedKey - La touche (ex: '↑', 'Entrée').
 * @returns {string} La clé réelle (ex: 'ArrowUp', 'Enter').
 */
function getActualKey(savedKey) {
    const keyMap = {
        '↑': 'ArrowUp',
        '↓': 'ArrowDown',
        '←': 'ArrowLeft',
        '→': 'ArrowRight',
        'Entrée': 'Enter',
        'Espace': ' '
    };
    return keyMap[savedKey] || savedKey.toLowerCase();
}

/**
 * Synchronise les contrôles du Joueur 1 avec le localStorage.
 */
export function reloadCustomKeysFromStorage() {
    customKeys.up = getActualKey(localStorage.getItem('key_up') || '↑');
    customKeys.left = getActualKey(localStorage.getItem('key_left') || '←');
    customKeys.down = getActualKey(localStorage.getItem('key_down') || '↓');
    customKeys.right = getActualKey(localStorage.getItem('key_right') || '→');
    customKeys.shoot = getActualKey(localStorage.getItem('key_shoot') || 'Entrée');
}

/**
 * Synchronise les contrôles du Joueur 2 avec le localStorage.
 * Gère la priorité du tir : touche dédiée J2 ou celle du J1 par défaut.
 */
export function reloadCustomKeys2FromStorage() {
    customKeys2.up = getActualKey(localStorage.getItem('key2_up') || 'z');
    customKeys2.left = getActualKey(localStorage.getItem('key2_left') || 'q');
    customKeys2.down = getActualKey(localStorage.getItem('key2_down') || 's');
    customKeys2.right = getActualKey(localStorage.getItem('key2_right') || 'd');
    
    const savedShoot2 = localStorage.getItem('key2_shoot');
    // Si le J2 n'a pas de touche configurée, on utilise celle du J1
    customKeys2.shoot = savedShoot2 ? getActualKey(savedShoot2) : customKeys.shoot;
}

// Initialisation au chargement du module
reloadCustomKeysFromStorage();
reloadCustomKeys2FromStorage();

/**
 * Orchestre le changement d'état du jeu et met à jour l'interface utilisateur associée.
 * * @param {string} nouvelEtat - L'état vers lequel basculer.
 * @param {Object} keys - Référence vers l'objet de gestion du clavier.
 * @param {HTMLElement} settingsOverlay - Menu paramètres.
 * @param {HTMLElement} duoSettingsOverlay - Menu paramètres duo.
 * @param {HTMLElement} shopOverlay - Menu boutique.
 * @param {HTMLElement} gameOverOverlay - Écran de fin.
 * @param {HTMLElement} gameOverTitle - Élément titre de fin.
 * @param {HTMLElement} gameOverSubtitle - Élément sous-titre de fin.
 * @param {HTMLElement} gameOverHint - Élément aide de fin.
 * @param {Function} setOverlayVisibility - Utilitaire HUD pour les overlays.
 * @param {Function} setCanvasActive - Utilitaire HUD pour le canvas.
 * @param {Function} setMenuButtonsVisible - Utilitaire HUD pour le menu principal.
 * @param {Function} setModeButtonsVisible - Utilitaire HUD pour le choix du mode.
 * @param {Function} hideLifeBars - Utilitaire HUD pour nettoyer la barre de vie.
 * @returns {string} L'état final appliqué.
 */
export function setEtat(
    nouvelEtat,
    keys,
    settingsOverlay,
    duoSettingsOverlay,
    shopOverlay,
    gameOverOverlay,
    gameOverTitle,
    gameOverSubtitle,
    gameOverHint,
    setOverlayVisibility,
    setCanvasActive,
    setMenuButtonsVisible,
    setModeButtonsVisible,
    hideLifeBars
) {
    // --- 1. SÉCURITÉ & RÉINITIALISATION ---
    
    // On réinitialise l'état des touches à 'false' pour éviter que le vaisseau 
    // ne continue d'avancer tout seul si une touche était maintenue lors du changement d'état.
    if (keys) {
        for (const key of Object.keys(keys)) {
            keys[key] = false;
        }
    }

    // On ferme tous les menus contextuels ouverts par précaution.
    if (setOverlayVisibility) {
        setOverlayVisibility(settingsOverlay, false);
        setOverlayVisibility(duoSettingsOverlay, false);
        setOverlayVisibility(shopOverlay, false);
    }

    // --- 2. LOGIQUE DE TRANSITION ---

    // États de Gameplay : Le jeu tourne, les menus sont cachés.
    if (nouvelEtat === ETAT.JEU || nouvelEtat === ETAT.DUEL) {
        setCanvasActive?.(true);
        setOverlayVisibility?.(gameOverOverlay, false);
        setMenuButtonsVisible?.(false);
        setModeButtonsVisible?.(false);
        return nouvelEtat;
    }

    // État Game Over : Le canvas reste actif en fond, mais l'overlay de fin apparaît.
    if (nouvelEtat === ETAT.GAME_OVER) {
        setCanvasActive?.(true);
        setOverlayVisibility?.(gameOverOverlay, true);
        setMenuButtonsVisible?.(false);
        setModeButtonsVisible?.(false);
        hideLifeBars?.(); // On retire les barres de vie pour ne pas encombrer l'écran
        return nouvelEtat;
    }

    // État Transition ou Score : Souvent utilisé pour les entractes.
    if (nouvelEtat === ETAT.TRANSITION || nouvelEtat === ETAT.SCORE) {
        setCanvasActive?.(true);
        setOverlayVisibility?.(gameOverOverlay, false);
        setMenuButtonsVisible?.(false);
        setModeButtonsVisible?.(false);
        hideLifeBars?.();
        return nouvelEtat;
    }

    // État Choix du Mode : On désactive le moteur de jeu pour afficher le menu Solo/Duo.
    if (nouvelEtat === ETAT.CHOIX_MODE) {
        setCanvasActive?.(false);
        setOverlayVisibility?.(gameOverOverlay, false);
        setMenuButtonsVisible?.(false);
        setModeButtonsVisible?.(true);
        hideLifeBars?.();
        return nouvelEtat;
    }

    // État Règles : Simple affichage d'informations.
    if (nouvelEtat === ETAT.REGLES) {
        setCanvasActive?.(false);
        setOverlayVisibility?.(gameOverOverlay, false);
        setMenuButtonsVisible?.(false);
        setModeButtonsVisible?.(false);
        hideLifeBars?.();
        return nouvelEtat;
    }

    // --- 3. CAS PAR DÉFAUT (MENU ACCUEIL) ---
    // Si on arrive ici, c'est qu'on retourne au menu principal.
    setCanvasActive?.(false);
    
    // Réinitialisation des textes du Game Over pour la prochaine partie.
    if (gameOverTitle) gameOverTitle.textContent = 'GAME OVER';
    if (gameOverSubtitle) gameOverSubtitle.textContent = 'Revenir à l’accueil';
    if (gameOverHint) gameOverHint.textContent = 'Clique sur le canvas pour revenir';
    
    setOverlayVisibility?.(gameOverOverlay, false);
    setMenuButtonsVisible?.(true);
    setModeButtonsVisible?.(false);
    hideLifeBars?.();

    return nouvelEtat;
}