/**
 * @module reglage
 * @description Gère l'interface des paramètres : remappage des touches pour J1 et J2,
 * contrôle des volumes (Musique et SFX) et persistance dans le localStorage.
 */

// --- RÉFÉRENCES ÉLÉMENTS DOM (Input J1) ---
const BUTTONS = {
    up: document.querySelector('.btn-up'),
    left: document.querySelector('.btn-left'),
    down: document.querySelector('.btn-down'),
    right: document.querySelector('.btn-right'),
    shoot: document.querySelector('.btn-shoot')
};

// --- RÉFÉRENCES ÉLÉMENTS DOM (Input J2) ---
const BUTTONS_J2 = {
    up: document.querySelector('.btn2-up'),
    left: document.querySelector('.btn2-left'),
    down: document.querySelector('.btn2-down'),
    right: document.querySelector('.btn2-right'),
    shoot: document.querySelector('.btn2-shoot')
};

/** @type {Object} Touches par défaut pour le premier lancement */
const DEFAULT_KEYS = {
    up: '↑',
    left: '←',
    down: '↓',
    right: '→',
    shoot: 'Entrée'
};

/** @type {Object} Thèmes visuels des boutons selon l'état de capture */
const STYLES = {
    waiting: {
        background: 'linear-gradient(135deg, #ffff00, #ffcc00)',
        color: '#000',
        boxShadow: '0 0 30px rgba(255, 255, 0, 0.8)'
    },
    error: {
        background: 'linear-gradient(135deg, #ff0000, #cc0000)',
        color: 'white',
        boxShadow: '0 0 30px rgba(255, 0, 0, 0.8)'
    },
    normal: {
        background: 'linear-gradient(135deg, #ff006e, #8338ec)',
        color: 'white',
        boxShadow: '0 4px 0 #1a1a2e, 0 0 15px rgba(255, 0, 110, 0.5)'
    }
};

// --- Variables d'état interne ---
let isListeningForKey = false;
let currentButton = null;

let isListeningForKeyJ2 = false;
let currentButtonJ2 = null;


window.addEventListener('DOMContentLoaded', () => {
    loadSavedKeys();
    loadSavedKeysJ2();
    initVolumeControls();
});

/** Liaison des clics boutons J1 */
Object.entries(BUTTONS).forEach(([keyType, button]) => {
    if (button) {
        button.addEventListener('click', () => startListeningForKey(button, keyType));
    }
});

/** Liaison des clics boutons J2 */
Object.entries(BUTTONS_J2).forEach(([keyType, button]) => {
    if (button) {
        button.addEventListener('click', () => startListeningForKeyJ2(button, keyType));
    }
});


/** Charge les touches J1 du localStorage ou applique les défauts. */
function loadSavedKeys() {
    Object.entries(BUTTONS).forEach(([keyType, button]) => {
        if (button) {
            const savedKey = localStorage.getItem(`key_${keyType}`);
            button.textContent = savedKey || DEFAULT_KEYS[keyType];
        }
    });
}

/** Charge les touches J2 (par défaut vides pour forcer le réglage en mode Duo). */
function loadSavedKeysJ2() {
    Object.entries(BUTTONS_J2).forEach(([keyType, button]) => {
        if (button) {
            const savedKey = localStorage.getItem(`key2_${keyType}`);
            button.textContent = savedKey || '';
            applyStyle(button, STYLES.normal);
        }
    });
}

/** Prépare l'interface à capturer une touche pour le J1. */
function startListeningForKey(button, keyType) {
    if (isListeningForKey) return;
    
    isListeningForKey = true;
    currentButton = button;
    currentButton.dataset.keyType = keyType;
    
    applyStyle(button, STYLES.waiting);
    button.textContent = 'Appuyez...';
    
    document.addEventListener('keydown', handleKeyPress);
}

/** Prépare l'interface à capturer une touche pour le J2. */
function startListeningForKeyJ2(button, keyType) {
    if (isListeningForKeyJ2) return;

    isListeningForKeyJ2 = true;
    currentButtonJ2 = button;
    currentButtonJ2.dataset.keyType = keyType;

    applyStyle(button, STYLES.waiting);
    button.textContent = 'Appuyez...';

    document.addEventListener('keydown', handleKeyPressJ2);
}

/** Traite l'événement clavier pour le J1. */
function handleKeyPress(event) {
    if (!isListeningForKey) return;
    event.preventDefault();
    
    const keyLabel = normalizeKey(event.key);
    
    // Vérification de conflit (touche déjà utilisée)
    if (isKeyUsed(keyLabel)) {
        showError();
        return;
    }
    
    applyNewKey(keyLabel);
}

/** Traite l'événement clavier pour le J2. */
function handleKeyPressJ2(event) {
    if (!isListeningForKeyJ2) return;
    event.preventDefault();

    const keyLabel = normalizeKey(event.key);

    if (isKeyUsedJ2(keyLabel)) {
        showErrorJ2();
        return;
    }

    applyNewKeyJ2(keyLabel);
}

/** Transforme les noms techniques (ex: ' ') en labels lisibles (ex: 'Espace'). */
function normalizeKey(key) {
    const keyMap = {
        ' ': 'Espace',
        'Enter': 'Entrée',
        'ArrowUp': '↑',
        'ArrowDown': '↓',
        'ArrowLeft': '←',
        'ArrowRight': '→'
    };
    return keyMap[key] || key.toUpperCase();
}

/** Vérifie si une touche est déjà assignée à une autre action (global). */
function isKeyUsed(keyLabel) {
    const usedByJ1 = Object.values(BUTTONS).some(btn => btn && btn !== currentButton && btn.textContent === keyLabel);
    const usedByJ2 = Object.values(BUTTONS_J2).some(btn => btn && btn.textContent === keyLabel && btn.textContent !== '');
    return usedByJ1 || usedByJ2;
}

/** Vérifie les conflits spécifiquement pour le J2. */
function isKeyUsedJ2(keyLabel) {
    const usedByJ2 = Object.values(BUTTONS_J2).some(btn => btn && btn !== currentButtonJ2 && btn.textContent === keyLabel);
    const usedByJ1 = Object.values(BUTTONS).some(btn => btn && btn.textContent === keyLabel);
    return usedByJ2 || usedByJ1;
}

/** Affiche un retour visuel d'erreur J1 avant de restaurer l'ancienne touche. */
function showError() {
    applyStyle(currentButton, STYLES.error);
    currentButton.textContent = 'Déjà utilisée!';
    
    setTimeout(() => {
        const keyType = currentButton.dataset.keyType;
        const savedKey = localStorage.getItem(`key_${keyType}`) || DEFAULT_KEYS[keyType];
        applyStyle(currentButton, STYLES.normal);
        currentButton.textContent = savedKey;
    }, 1500);
    
    stopListening();
}

/** Affiche un retour visuel d'erreur J2. */
function showErrorJ2() {
    applyStyle(currentButtonJ2, STYLES.error);
    currentButtonJ2.textContent = 'Déjà utilisée!';

    setTimeout(() => {
        const keyType = currentButtonJ2.dataset.keyType;
        const savedKey = localStorage.getItem(`key2_${keyType}`) || '';
        applyStyle(currentButtonJ2, STYLES.normal);
        currentButtonJ2.textContent = savedKey;
    }, 1500);

    stopListeningJ2();
}

/** Valide et sauvegarde la nouvelle touche J1. */
function applyNewKey(keyLabel) {
    currentButton.textContent = keyLabel;
    applyStyle(currentButton, STYLES.normal);
    localStorage.setItem(`key_${currentButton.dataset.keyType}`, keyLabel);
    stopListening();
}

/** Valide et sauvegarde la nouvelle touche J2. */
function applyNewKeyJ2(keyLabel) {
    currentButtonJ2.textContent = keyLabel;
    applyStyle(currentButtonJ2, STYLES.normal);
    localStorage.setItem(`key2_${currentButtonJ2.dataset.keyType}`, keyLabel);
    stopListeningJ2();
}

function applyStyle(button, style) {
    Object.assign(button.style, style);
}

function stopListening() {
    document.removeEventListener('keydown', handleKeyPress);
    isListeningForKey = false;
}

function stopListeningJ2() {
    document.removeEventListener('keydown', handleKeyPressJ2);
    isListeningForKeyJ2 = false;
}


/** Initialise les sliders de volume et synchronise avec le stockage. */
function initVolumeControls() {
    const musicSlider = document.getElementById('music-slider');
    const volumeSlider = document.getElementById('volume-slider');
    const musicValue = document.getElementById('music-value');
    const volumeValue = document.getElementById('volume-value');

    // --- Configuration Musique ---
    if (musicSlider && musicValue) {
        const savedM = localStorage.getItem('music_volume');
        const initial = savedM !== null ? Number(savedM) : Number(musicSlider.value);
        musicSlider.value = initial;
        musicValue.textContent = initial + '%';

        musicSlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            musicValue.textContent = val + '%';
            localStorage.setItem('music_volume', String(val));
            window.applyMusicVolume?.(val);
        });
    }

    // --- Configuration Effets (SFX) ---
    if (volumeSlider && volumeValue) {
        const savedS = localStorage.getItem('sfx_volume');
        const initial = savedS !== null ? Number(savedS) : Number(volumeSlider.value);
        volumeSlider.value = initial;
        volumeValue.textContent = initial + '%';

        volumeSlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            volumeValue.textContent = val + '%';
            localStorage.setItem('sfx_volume', String(val));
            window.applySfxVolume?.(val);
        });
    }
}