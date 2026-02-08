import niveau1 from '../niveaux/niveau1.js';
import niveau2 from '../niveaux/niveau2.js';
import niveau3 from '../niveaux/niveau3.js';
import niveau1Duo from '../niveaux/niveau1Duo.js';
import niveau2Duo from '../niveaux/niveau2Duo.js';
import niveau3Duo from '../niveaux/niveau3Duo.js';

// Etats globaux du jeu
export const ETAT = {
    MENU: 'MENU ACCUEIL',
    CHOIX_MODE: 'CHOIX MODE',
    JEU: 'JEU EN COURS',
    GAME_OVER: 'GAME OVER',
    TRANSITION: 'TRANSITION NIVEAU'
};

// Listes de niveaux pour le solo et le duo
export const LEVELS = [
    niveau1,
    niveau2,
    niveau3
];

export const LEVELS_DUO = [
    niveau1Duo,
    niveau2Duo,
    niveau3Duo
];

// Configuration des touches personnalisables
export let customKeys = {
    up: localStorage.getItem('key_up') || '↑',
    left: localStorage.getItem('key_left') || '←',
    down: localStorage.getItem('key_down') || '↓',
    right: localStorage.getItem('key_right') || '→',
    shoot: localStorage.getItem('key_shoot') || 'Entrée'
};

// Touches configurables pour le Joueur 2 (par défaut ZQSD, même touche de tir que J1)
export let customKeys2 = {
    up: 'z',
    left: 'q',
    down: 's',
    right: 'd',
    shoot: 'Entrée'
};

// Convertir les symboles de flèches en touches réelles
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

export function reloadCustomKeysFromStorage() {
    customKeys.up = getActualKey(localStorage.getItem('key_up') || '↑');
    customKeys.left = getActualKey(localStorage.getItem('key_left') || '←');
    customKeys.down = getActualKey(localStorage.getItem('key_down') || '↓');
    customKeys.right = getActualKey(localStorage.getItem('key_right') || '→');
    customKeys.shoot = getActualKey(localStorage.getItem('key_shoot') || 'Entrée');
}

export function reloadCustomKeys2FromStorage() {
    // Fallback ZQSD si aucune touche Joueur 2 n'a été définie
    customKeys2.up = getActualKey(localStorage.getItem('key2_up') || 'z');
    customKeys2.left = getActualKey(localStorage.getItem('key2_left') || 'q');
    customKeys2.down = getActualKey(localStorage.getItem('key2_down') || 's');
    customKeys2.right = getActualKey(localStorage.getItem('key2_right') || 'd');
    const savedShoot2 = localStorage.getItem('key2_shoot');
    if (savedShoot2) {
        customKeys2.shoot = getActualKey(savedShoot2);
    } else {
        // Par défaut même touche de tir que le Joueur 1
        customKeys2.shoot = customKeys.shoot;
    }
}

// Initialiser la configuration clavier dès le chargement du module
reloadCustomKeysFromStorage();
reloadCustomKeys2FromStorage();
