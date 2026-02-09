// CONSTANTES
const BUTTONS = {
    up: document.querySelector('.btn-up'),
    left: document.querySelector('.btn-left'),
    down: document.querySelector('.btn-down'),
    right: document.querySelector('.btn-right'),
    shoot: document.querySelector('.btn-shoot')
};

// Boutons pour la configuration des touches du Joueur 2
const BUTTONS_J2 = {
    up: document.querySelector('.btn2-up'),
    left: document.querySelector('.btn2-left'),
    down: document.querySelector('.btn2-down'),
    right: document.querySelector('.btn2-right'),
    shoot: document.querySelector('.btn2-shoot')
};

const DEFAULT_KEYS = {
    up: '↑',
    left: '←',
    down: '↓',
    right: '→',
    shoot: 'Entrée'
};

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

// VARIABLES D'ÉTAT
let isListeningForKey = false;
let currentButton = null;

let isListeningForKeyJ2 = false;
let currentButtonJ2 = null;

// INITIALISATION
window.addEventListener('DOMContentLoaded', () => {
    loadSavedKeys();
    loadSavedKeysJ2();
    initVolumeControls();
});

// Attacher les écouteurs aux boutons
Object.entries(BUTTONS).forEach(([keyType, button]) => {
    if (button) {
        button.addEventListener('click', () => startListeningForKey(button, keyType));
    }
});

// Attacher les écouteurs aux boutons du Joueur 2
Object.entries(BUTTONS_J2).forEach(([keyType, button]) => {
    if (button) {
        button.addEventListener('click', () => startListeningForKeyJ2(button, keyType));
    }
});

// FONCTIONS PRINCIPALES

function loadSavedKeys() {
    Object.entries(BUTTONS).forEach(([keyType, button]) => {
        if (button) {
            const savedKey = localStorage.getItem(`key_${keyType}`);
            button.textContent = savedKey || DEFAULT_KEYS[keyType];
        }
    });
}

// Chargement des touches du Joueur 2 (par défaut cases vides)
function loadSavedKeysJ2() {
    Object.entries(BUTTONS_J2).forEach(([keyType, button]) => {
        if (button) {
            const savedKey = localStorage.getItem(`key2_${keyType}`);
            button.textContent = savedKey || '';
            applyStyle(button, STYLES.normal);
        }
    });
}

function startListeningForKey(button, keyType) {
    if (isListeningForKey) return;
    
    isListeningForKey = true;
    currentButton = button;
    currentButton.dataset.keyType = keyType;
    
    applyStyle(button, STYLES.waiting);
    button.textContent = 'Appuyez...';
    
    document.addEventListener('keydown', handleKeyPress);
}

function startListeningForKeyJ2(button, keyType) {
    if (isListeningForKeyJ2) return;

    isListeningForKeyJ2 = true;
    currentButtonJ2 = button;
    currentButtonJ2.dataset.keyType = keyType;

    applyStyle(button, STYLES.waiting);
    button.textContent = 'Appuyez...';

    document.addEventListener('keydown', handleKeyPressJ2);
}

function handleKeyPress(event) {
    if (!isListeningForKey) return;
    
    event.preventDefault();
    
    const keyLabel = normalizeKey(event.key);
    
    // Vérifier si la touche est déjà utilisée
    if (isKeyUsed(keyLabel)) {
        showError();
        return;
    }
    
    // Appliquer la nouvelle touche
    applyNewKey(keyLabel);
}

function handleKeyPressJ2(event) {
    if (!isListeningForKeyJ2) return;

    event.preventDefault();

    const keyLabel = normalizeKey(event.key);

    // Vérifier si la touche est déjà utilisée pour le joueur 2
    if (isKeyUsedJ2(keyLabel)) {
        showErrorJ2();
        return;
    }

    // Appliquer la nouvelle touche
    applyNewKeyJ2(keyLabel);
}

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

function isKeyUsed(keyLabel) {
    const usedByJ1 = Object.values(BUTTONS).some(
        btn => btn && btn !== currentButton && btn.textContent === keyLabel
    );
    const usedByJ2 = Object.values(BUTTONS_J2).some(
        btn => btn && btn.textContent === keyLabel && btn.textContent !== ''
    );
    return usedByJ1 || usedByJ2;
}

function isKeyUsedJ2(keyLabel) {
    const usedByJ2 = Object.values(BUTTONS_J2).some(
        btn => btn && btn !== currentButtonJ2 && btn.textContent === keyLabel
    );
    const usedByJ1 = Object.values(BUTTONS).some(
        btn => btn && btn.textContent === keyLabel
    );
    return usedByJ2 || usedByJ1;
}

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

function applyNewKey(keyLabel) {
    currentButton.textContent = keyLabel;
    applyStyle(currentButton, STYLES.normal);
    
    // Sauvegarder dans localStorage
    const keyType = currentButton.dataset.keyType;
    localStorage.setItem(`key_${keyType}`, keyLabel);
    
    stopListening();
}

function applyNewKeyJ2(keyLabel) {
    currentButtonJ2.textContent = keyLabel;
    applyStyle(currentButtonJ2, STYLES.normal);

    // Sauvegarder dans localStorage pour Joueur 2
    const keyType = currentButtonJ2.dataset.keyType;
    localStorage.setItem(`key2_${keyType}`, keyLabel);

    stopListeningJ2();
}

function applyStyle(button, style) {
    Object.assign(button.style, style);
}

function stopListening() {
    document.removeEventListener('keydown', handleKeyPress);
    isListeningForKey = false;
    currentButton = null;
}

function stopListeningJ2() {
	document.removeEventListener('keydown', handleKeyPressJ2);
	isListeningForKeyJ2 = false;
	currentButtonJ2 = null;
}

function initVolumeControls() {
    const musicSlider = document.getElementById('music-slider');
    const volumeSlider = document.getElementById('volume-slider');
    const musicValue = document.getElementById('music-value');
    const volumeValue = document.getElementById('volume-value');

    if (musicSlider && musicValue) {
        const savedMusicVolume = localStorage.getItem('music_volume');
        const initialMusic = savedMusicVolume !== null ? Number(savedMusicVolume) : Number(musicSlider.value);
        musicSlider.value = initialMusic;
        musicValue.textContent = initialMusic + '%';
        musicSlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            musicValue.textContent = val + '%';
            localStorage.setItem('music_volume', String(val));
            if (window.applyMusicVolume) {
                window.applyMusicVolume(val);
            }
        });
    }

    if (volumeSlider && volumeValue) {
        const savedVolume = localStorage.getItem('sfx_volume');
        const initialSfx = savedVolume !== null ? Number(savedVolume) : Number(volumeSlider.value);
        volumeSlider.value = initialSfx;
        volumeValue.textContent = initialSfx + '%';
        volumeSlider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            volumeValue.textContent = val + '%';
            localStorage.setItem('sfx_volume', String(val));
        });
    }
}
