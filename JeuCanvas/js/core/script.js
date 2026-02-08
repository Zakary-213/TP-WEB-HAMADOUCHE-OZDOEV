import Vaisseau from '../entities/vaisseau.js';
import GameManager from './gameManager.js';
import { loadAssets } from './assetLoader.js';
import { TYPE_VAISSEAU } from '../entities/typeVaisseau.js';
import Player from '../entities/player.js';
import Boutique, { BoutiqueUI } from '../ui/boutique.js';
import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';
import niveau1 from '../niveaux/niveau1.js';
import niveau2 from '../niveaux/niveau2.js';
import niveau3 from '../niveaux/niveau3.js';
import LevelManager from '../niveaux/levelManagerSolo.js';
import TransitionNiveau from '../niveaux/transitionNiveau.js';

let canvas;
let ctx;
let monVaisseau;
let gameManager;
const ETAT = { MENU: 'MENU ACCUEIL', JEU: 'JEU EN COURS', GAME_OVER: 'GAME OVER', TRANSITION: 'TRANSITION NIVEAU' };
let etat = ETAT.MENU;
let loadedAssets; // Déclaration de la variable
const lastKeyPress = {};
const DOUBLE_TAP_DELAY = 250; // ms
const player = new Player();
const DEBUG_HITBOX = true;

// Gestion des touches pressées
let keys = {};

let coeurs;

let settingsOverlay;
let settingsClose;
let menuButtons;
let gameOverOverlay;
let shopOverlay;
let shopClose;
let btnBoutique;
let boutiqueUI = null;

let chronometre;
let meteoriteCountElement;
let levelTransition;
let destroyedMeteorites = 0;
let levelManager;

const LEVELS = [
    niveau1,
    niveau2,
    niveau3
];




document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');
    settingsOverlay = document.querySelector('.settings-overlay');
    gameOverOverlay = document.querySelector('.gameover-overlay');
    settingsClose = document.getElementById('close-settings');
    menuButtons = document.querySelector('div.boutton');
    shopOverlay = document.querySelector('.shop-overlay');
    btnBoutique = document.querySelector('.Boutique');
    shopClose = shopOverlay.querySelector('.btn-return');
    chronometre = document.getElementById('timer');
    meteoriteCountElement = document.getElementById('meteorite-count');
    levelTransition = new TransitionNiveau(canvas);
    setEtat(ETAT.MENU);

    document.querySelector('.startBoutton').addEventListener('click', async () => {
        if (etat !== ETAT.MENU && etat !== ETAT.GAME_OVER) return;

        startGame();
        setEtat(ETAT.JEU);
    });

    // Bouton Options - Redirection vers page réglages
    document.querySelector('.Réglage').addEventListener('click', () => {
        // Ouvrir l'overlay sans changer l'état du jeu
        if (settingsOverlay) {
            settingsOverlay.classList.add('active');
            settingsOverlay.setAttribute('aria-hidden', 'false');
        }
    });

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            // Les touches peuvent avoir été modifiées dans l'overlay
            reloadCustomKeysFromStorage();
            // Fermer l'overlay et garder l'état courant
            settingsOverlay.classList.remove('active');
            settingsOverlay.setAttribute('aria-hidden', 'true');
        });
    }

    // Bouton Boutique - Redirection vers page boutique
    btnBoutique.addEventListener('click', () => {
        // Ouvrir la boutique sans changer l'état du jeu
        if (shopOverlay) {
            shopOverlay.classList.add('active');
            shopOverlay.setAttribute('aria-hidden', 'false');
        }
        if(!boutiqueUI){
            boutiqueUI = new BoutiqueUI(player);
        }
        else {
            boutiqueUI.updateGold();
        }
    });

    shopClose.addEventListener('click', () => {
        if (shopOverlay) {
            shopOverlay.classList.remove('active');
            shopOverlay.setAttribute('aria-hidden', 'true');
        }
    });


    // Tableau des cœurs pour la barre de vie
    coeurs = document.querySelectorAll('.barreDeVie img');

    // Cacher les cœurs au départ
    coeurs.forEach(coeur => coeur.style.visibility = "hidden");
    
    // Charger les assets dès le démarrage
    loadAssetsOnStart();

    // Centraliser les écouteurs clavier
    bindKeyboardListeners();

    // Clic sur le canvas : gérer game over et transition de niveau
    canvas.addEventListener('click', () => {
        if (etat === ETAT.GAME_OVER) {
            setEtat(ETAT.MENU);
            return;
        }

        if (etat === ETAT.TRANSITION && levelTransition) {
            levelTransition.completeManually();
        }
    });

    // Lancer la boucle d'animation dès le menu
    requestAnimationFrame(gameLoop);
});
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
    [TYPE_VAISSEAU.NORMAL]: { url: './assets/img/vaisseaux/NORMAL.png' },
    [TYPE_VAISSEAU.PHASE]: { url: './assets/img/vaisseaux/PHASE.png' },
    [TYPE_VAISSEAU.SPLIT]: { url: './assets/img/vaisseaux/SPLIT.png' },
    [TYPE_VAISSEAU.PIERCE]: { url: './assets/img/vaisseaux/PIERCE.png' },
    [TYPE_VAISSEAU.RICOCHET]: { url: './assets/img/vaisseaux/RICOCHET.png' },
    [TYPE_VAISSEAU.SPREAD]: { url: './assets/img/vaisseaux/SPREAD.png' },
    [TYPE_VAISSEAU.ENEMY]: { url: './assets/img/vaisseaux/ENEMY.png' },
    meteorite: { url: './assets/img/meteorites/meteorite.png' },
    dyna: { url: './assets/img/meteorites/dyna.png'  },
    nuage: { url: './assets/img/meteorites/nuage.png'  },
    lancer: { url: './assets/img/meteorites/drone.png'},
    enemy: { url: './assets/img/vaisseaux/ENEMY.png' },
    vie: { url: './assets/img/vie.png' },
    eclair: { url: './assets/img/gadgets/eclair.png' },
    bouclier: { url: './assets/img/gadgets/bouclier.png' },
    mirroire: { url: './assets/img/gadgets/portail.png' },
    rafale: { url: './assets/img/gadgets/rafale.png' },
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
    gameManager = new GameManager(canvas, player, loadedAssets);
    gameManager.onMeteoriteDestroyed = () => {
        destroyedMeteorites++;
        meteoriteCountElement.textContent = destroyedMeteorites;
    };
    levelManager = new LevelManager(
        gameManager,
        LEVELS,
        () => {
            destroyedMeteorites = 0;
            meteoriteCountElement.textContent = "0";
        },
        (levelIndex, doneCallback) => {
            if (!levelTransition) {
                doneCallback();
                return;
            }

            const isLastLevel = (levelIndex === LEVELS.length - 1);
            setEtat(ETAT.TRANSITION);

            if (isLastLevel) {
                // Fin du niveau 3 : thème or + feux d'artifice + retour menu
                levelTransition.showFinalEndGame(() => {
                    setEtat(ETAT.MENU);
                    doneCallback();
                });
            } else {
                // Transitions normales (niveau 1 -> 2, niveau 2 -> 3)
                levelTransition.showForLevel(levelIndex + 1, () => {
                    setEtat(ETAT.JEU);
                    doneCallback();
                });
            }
        }
    );
    levelManager.start();


    let shipType = player.getEquippedShip();
    
    monVaisseau = new Vaisseau(
        canvas.width / 2,
        canvas.height / 2,
        loadedAssets[shipType],  
        50,  
        50, 
        1.5, // Vitesse du vaisseau
        3, // Points de vie du vaisseau
        shipType  // Type du vaisseau équippé par le joueur
    );

    console.log("Type du vaisseau :", monVaisseau.type);

    updateBarreDeVie();

    // Pas de première météorite (désactivé)
}

function gameLoop() {
    // Ne dessiner le canvas que quand il est visible
    if (etat === ETAT.JEU || etat === ETAT.GAME_OVER || etat === ETAT.TRANSITION) {
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
    if (etat !== ETAT.JEU) return;
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
    levelManager.update();
    gameManager.update(monVaisseau);

    const level = levelManager.getCurrentLevel();
    if (level) {
        chronometre.textContent = formatTime(level.getElapsedTime());
    }

    updateBarreDeVie();

    // Si le GameManager vient de passer en gameover pendant l'update
    if (gameManager.isGameOver()) {
        setEtat(ETAT.GAME_OVER);
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

function setEtat(nouvelEtat) {
    etat = nouvelEtat;

    // Anti touches "collées" lors du changement d'état
    for (const key of Object.keys(keys)) {
        keys[key] = false;
    }

    const canvasEl = document.getElementById('monCanvas');

    // Fermer systématiquement les overlays non liés au core state
    if (settingsOverlay) {
        settingsOverlay.classList.remove('active');
        settingsOverlay.setAttribute('aria-hidden', 'true');
    }
    if (shopOverlay) {
        shopOverlay.classList.remove('active');
        shopOverlay.setAttribute('aria-hidden', 'true');
    }

    if (etat === ETAT.JEU) {
        canvasEl.classList.add('game-active');
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('active');
            gameOverOverlay.setAttribute('aria-hidden', 'true');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        // En jeu uniquement : les cœurs sont gérés par updateBarreDeVie
        return;
    }

    if (etat === ETAT.GAME_OVER) {
        canvasEl.classList.add('game-active');
        if (gameOverOverlay) {
            gameOverOverlay.classList.add('active');
            gameOverOverlay.setAttribute('aria-hidden', 'false');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        // Hors jeu : masquer la barre de vie
        if (coeurs) {
            coeurs.forEach(c => c.style.visibility = 'hidden');
        }
        return;
    }

    if (etat === ETAT.TRANSITION) {
        canvasEl.classList.add('game-active');
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('active');
            gameOverOverlay.setAttribute('aria-hidden', 'true');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        // Hors jeu : masquer la barre de vie
        if (coeurs) {
            coeurs.forEach(c => c.style.visibility = 'hidden');
        }
        return;
    }

    // MENU
    canvasEl.classList.remove('game-active');
    if (gameOverOverlay) {
        gameOverOverlay.classList.remove('active');
        gameOverOverlay.setAttribute('aria-hidden', 'true');
    }
    if (menuButtons) {
        menuButtons.style.display = 'flex';
    }

    // En MENU : masquer la barre de vie
    if (coeurs) {
        coeurs.forEach(c => c.style.visibility = 'hidden');
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

        // Aucune action de jeu hors de l'état JEU
        if (etat !== ETAT.JEU) return;

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
    drawShieldBubble(ctx, monVaisseau);
    drawEclairBar(ctx, monVaisseau);
    drawRafaleBar(ctx, monVaisseau);
    
    // Dessiner les bullets
    for (let i = monVaisseau.bullets.length - 1; i >= 0; i--) {
        const bullet = monVaisseau.bullets[i];
        bullet.draw(ctx);
    }
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


