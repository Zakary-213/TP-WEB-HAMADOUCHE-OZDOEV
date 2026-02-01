import Vaisseau from './vaisseau.js';
import GameManager from './gameManager.js';
import { loadAssets } from './assetLoader.js';
import { TYPE_VAISSEAU } from './typeVaisseau.js';

let canvas;
let ctx;
let monVaisseau;
let gameManager;
let appState = "menu";
let previousAppState = "menu";
let loadedAssets; // Déclaration de la variable
const lastKeyPress = {};
const DOUBLE_TAP_DELAY = 250; // ms

let coeurs;

let settingsOverlay;
let settingsClose;
let menuButtons;
let gameOverOverlay;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');
    settingsOverlay = document.querySelector('.settings-overlay');
    gameOverOverlay = document.querySelector('.gameover-overlay');
    settingsClose = document.getElementById('close-settings');
    menuButtons = document.querySelector('div.boutton');

    setAppState('menu');

    document.querySelector('.startBoutton').addEventListener('click', async () => {
        if (appState !== 'menu' && appState !== 'gameover') return;

        startGame();
        setAppState('playing');
    });

    // Bouton Options - Redirection vers page réglages
    document.querySelector('.Réglage').addEventListener('click', () => {
        previousAppState = appState;
        setAppState('settings');
    });

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            // Les touches peuvent avoir été modifiées dans l'overlay
            reloadCustomKeysFromStorage();
            setAppState(previousAppState);
        });
    }

    // Tableau des cœurs pour la barre de vie
    coeurs = document.querySelectorAll('.barreDeVie img');

    // Cacher les cœurs au départ
    coeurs.forEach(coeur => coeur.style.visibility = "hidden");
    
    // Charger les assets dès le démarrage
    loadAssetsOnStart();

    // Centraliser les écouteurs clavier
    bindKeyboardListeners();

    // Rejouer au clic sur le canvas (écran game over)
    canvas.addEventListener('click', () => {
        if (appState !== 'gameover') return;
        setAppState('menu');
    });

    // Lancer la boucle d'animation dès le menu
    requestAnimationFrame(gameLoop);
});

// Gestion des touches pressées
let keys = {};

// Charger les touches personnalisées depuis localStorage
let customKeys = {
    up: localStorage.getItem('key_up') || '↑',
    left: localStorage.getItem('key_left') || '←',
    down: localStorage.getItem('key_down') || '↓',
    right: localStorage.getItem('key_right') || '→',
    shoot: localStorage.getItem('key_shoot') || 'Entrée'
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

function reloadCustomKeysFromStorage() {
    customKeys.up = getActualKey(localStorage.getItem('key_up') || '↑');
    customKeys.left = getActualKey(localStorage.getItem('key_left') || '←');
    customKeys.down = getActualKey(localStorage.getItem('key_down') || '↓');
    customKeys.right = getActualKey(localStorage.getItem('key_right') || '→');
    customKeys.shoot = getActualKey(localStorage.getItem('key_shoot') || 'Entrée');
}

// Convertir toutes les touches personnalisées au démarrage
reloadCustomKeysFromStorage();

// Définis les assets à charger
var assetsToLoadURLs = {
    vaisseau: { url: './assets/img/vaisseau.png' },
    meteorite: { url: './assets/img/meteorite.png' },
    vie: { url: './assets/img/vie.png' },
    gameMusic: { url: './assets/audio/ingame.mp3', buffer: true, loop: true, volume: 0.5 }
};

// Charger les assets au démarrage (avant le jeu)
async function loadAssetsOnStart() {
    loadedAssets = await loadAssets(assetsToLoadURLs);
    window.applyMusicVolume = applyMusicVolume;
    const savedMusicVolume = localStorage.getItem('music_volume');
    if (savedMusicVolume !== null) {
        applyMusicVolume(Number(savedMusicVolume));
    }
}

function startGame() {
    gameManager = new GameManager(canvas);

    monVaisseau = new Vaisseau(
        canvas.width / 2,
        canvas.height / 2,
        loadedAssets.vaisseau,  
        50,  
        50, 
        1.5, // Vitesse du vaisseau
        3, // Points de vie du vaisseau
        TYPE_VAISSEAU.SPREAD  // Type du vaisseau
    );

    console.log("Type du vaisseau :", monVaisseau.type);

    updateBarreDeVie();

    // Spawn la première météorite
    gameManager.spawnMeteorrite();
}

function gameLoop() {
    // Ne dessiner le canvas que quand il est visible
    if (appState === 'playing' || appState === 'gameover') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawPlaying();
    }

    // Mettre à jour l'état du jeu
    updateGameState();

    // Relancer la boucle
    requestAnimationFrame(gameLoop);
}

function updateGameState() {
    if (appState !== "playing") return;
    if (gameManager.isHit()) return;

    // Calculer la direction basée sur les touches personnalisées
    let dx = 0;
    let dy = 0;

    if (keys[customKeys.up]) dy = -1;
    if (keys[customKeys.down]) dy = 1;
    if (keys[customKeys.left]) dx = -1;
    if (keys[customKeys.right]) dx = 1;

    monVaisseau.moveInDirection(dx, dy);

    // Mettre à jour les collisions via GameManager
    gameManager.update(monVaisseau);
    updateBarreDeVie();

    // Si le GameManager vient de passer en gameover pendant l'update
    if (gameManager.isGameOver()) {
        setAppState('gameover');
        console.log("Game Over détecté");
        return;
    }
}

function updateBarreDeVie() {
    for (let i = 0; i < coeurs.length; i++) {
        if (i < monVaisseau.pointsDeVie) {
            coeurs[i].style.visibility = "visible";
        } else {
            coeurs[i].style.visibility = "hidden";
        }
    }
}

function applyMusicVolume(value) {
    if (loadedAssets && loadedAssets.gameMusic && typeof loadedAssets.gameMusic.volume === 'function') {
        loadedAssets.gameMusic.volume(value / 100);
    }
}

function setAppState(nextState) {
    appState = nextState;

    // Toujours éviter les touches "collées" en changeant d'écran
    for (const key of Object.keys(keys)) {
        keys[key] = false;
    }

    const canvasEl = document.getElementById('monCanvas');

    if (appState === 'settings') {
        canvasEl.classList.remove('game-active');
        if (settingsOverlay) {
            settingsOverlay.classList.add('active');
            settingsOverlay.setAttribute('aria-hidden', 'false');
        }
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('active');
            gameOverOverlay.setAttribute('aria-hidden', 'true');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        return;
    }

    // Par défaut, on ferme l'overlay des réglages si on n'est pas en settings
    if (settingsOverlay) {
        settingsOverlay.classList.remove('active');
        settingsOverlay.setAttribute('aria-hidden', 'true');
    }

    if (gameOverOverlay) {
        gameOverOverlay.classList.remove('active');
        gameOverOverlay.setAttribute('aria-hidden', 'true');
    }

    if (appState === 'playing') {
        canvasEl.classList.add('game-active');
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        return;
    }

    if (appState === 'gameover') {
        // Game over : afficher le canvas, sans les boutons
        canvasEl.classList.add('game-active');
        if (gameOverOverlay) {
            gameOverOverlay.classList.add('active');
            gameOverOverlay.setAttribute('aria-hidden', 'false');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        return;
    }

    // menu : cacher le canvas (CSS: display:none), garder les boutons
    canvasEl.classList.remove('game-active');
    if (menuButtons) {
        menuButtons.style.display = 'flex';
    }
}

function bindKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const rawKey = e.key;
        const normalizedKey = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;

        keys[rawKey] = true;
        if (rawKey.length === 1) {
            keys[normalizedKey] = true;
        }

        // Aucune action de jeu hors de l'état playing
        if (appState !== 'playing') return;

        const now = performance.now();
        if (lastKeyPress[normalizedKey] && now - lastKeyPress[normalizedKey] < DOUBLE_TAP_DELAY) {
            let dx = 0;
            let dy = 0;

            if (normalizedKey === customKeys.up) dy = -1;
            if (normalizedKey === customKeys.down) dy = 1;
            if (normalizedKey === customKeys.left) dx = -1;
            if (normalizedKey === customKeys.right) dx = 1;

            if ((dx !== 0 || dy !== 0) && monVaisseau) {
                monVaisseau.startDash(dx, dy);
            }
        }
        lastKeyPress[normalizedKey] = now;

        if (normalizedKey == customKeys.shoot && monVaisseau) {
            monVaisseau.addBullet(performance.now());
        }
    });

    document.addEventListener('keyup', (e) => {
        const rawKey = e.key;
        const normalizedKey = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
        keys[rawKey] = false;
        if (rawKey.length === 1) {
            keys[normalizedKey] = false;
        }
    });
}

function drawPlaying() {
    if (gameManager.isHit()) {
        monVaisseau.draw(ctx);
        return;
    }

    // Dessiner les météorites
    gameManager.draw(ctx);

    // Dessiner le vaisseau
    monVaisseau.draw(ctx);

    // Dessiner les bullets
    for (let i = monVaisseau.bullets.length - 1; i >= 0; i--) {
        const bullet = monVaisseau.bullets[i];
        bullet.draw(ctx);
    }
}