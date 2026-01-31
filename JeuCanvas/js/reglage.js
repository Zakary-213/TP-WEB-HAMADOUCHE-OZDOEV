// CONSTANTES
const BUTTONS = {
    up: document.querySelector('.btn-up'),
    left: document.querySelector('.btn-left'),
    down: document.querySelector('.btn-down'),
    right: document.querySelector('.btn-right'),
    shoot: document.querySelector('.btn-shoot')
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

// INITIALISATION
window.addEventListener('DOMContentLoaded', () => {
    loadSavedKeys();
    initVolumeControls();
});

// Attacher les écouteurs aux boutons
Object.entries(BUTTONS).forEach(([keyType, button]) => {
    if (button) {
        button.addEventListener('click', () => startListeningForKey(button, keyType));
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

function startListeningForKey(button, keyType) {
    if (isListeningForKey) return;
    
    isListeningForKey = true;
    currentButton = button;
    currentButton.dataset.keyType = keyType;
    
    applyStyle(button, STYLES.waiting);
    button.textContent = 'Appuyez...';
    
    document.addEventListener('keydown', handleKeyPress);
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
    return Object.values(BUTTONS).some(
        btn => btn && btn !== currentButton && btn.textContent === keyLabel
    );
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

function applyNewKey(keyLabel) {
    currentButton.textContent = keyLabel;
    applyStyle(currentButton, STYLES.normal);
    
    // Sauvegarder dans localStorage
    const keyType = currentButton.dataset.keyType;
    localStorage.setItem(`key_${keyType}`, keyLabel);
    
    stopListening();
}

function applyStyle(button, style) {
    Object.assign(button.style, style);
}

function stopListening() {
    document.removeEventListener('keydown', handleKeyPress);
    isListeningForKey = false;
    currentButton = null;
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
