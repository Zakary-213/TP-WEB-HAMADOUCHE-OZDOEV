import Vaisseau from '../entities/vaisseau.js';
import GameManager from './gameManager.js';
import GameManagerDuo from './gameManagerDuo.js';
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
import { defineListeners, inputStates } from './ecouteur.js';

let canvas;
let ctx;
let monVaisseau;
let monVaisseau2; // pour le mode duo
let gameManager;
let gameManagerDuo;
const ETAT = { MENU: 'MENU ACCUEIL', CHOIX_MODE: 'CHOIX MODE', JEU: 'JEU EN COURS', GAME_OVER: 'GAME OVER', TRANSITION: 'TRANSITION NIVEAU' };
let etat = ETAT.MENU;
let modeActuel = 'solo'; // 'solo' ou 'duo'
let loadedAssets; // Déclaration de la variable
const player = new Player();
const DEBUG_HITBOX = true;

// Gestion des touches pressées (déléguée à ecouteur.js)
let keys = inputStates;

let coeursJ1;
let coeursJ2;
let barreVieJ1;
let barreVieJ2;
let labelJ1;
let labelJ2;

let settingsOverlay;
let duoSettingsOverlay;
let settingsClose;
let menuButtons;
let modeButtons;
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
    duoSettingsOverlay = document.querySelector('.settings-overlay-j2');
    gameOverOverlay = document.querySelector('.gameover-overlay');
    settingsClose = document.getElementById('close-settings');
    menuButtons = document.querySelector('div.boutton');
    modeButtons = document.querySelector('.mode-buttons');
    shopOverlay = document.querySelector('.shop-overlay');
    btnBoutique = document.querySelector('.Boutique');
    shopClose = shopOverlay.querySelector('.btn-return');
    chronometre = document.getElementById('timer');
    meteoriteCountElement = document.getElementById('meteorite-count');
    levelTransition = new TransitionNiveau(canvas);
    setEtat(ETAT.MENU);

    document.querySelector('.startBoutton').addEventListener('click', () => {
        if (etat !== ETAT.MENU && etat !== ETAT.GAME_OVER) return;
        setEtat(ETAT.CHOIX_MODE);
    });

    // Boutons de choix de mode (Solo / Duo / Duel)
    if (modeButtons) {
        const btnSolo = modeButtons.querySelector('.btn-mode-solo');
        const btnDuo = modeButtons.querySelector('.btn-mode-duo');
        const btnDuel = modeButtons.querySelector('.btn-mode-duel');

        if (btnSolo) {
            btnSolo.addEventListener('click', () => {
                if (etat !== ETAT.CHOIX_MODE) return;
                startGame();
                setEtat(ETAT.JEU);
            });
        }

        if (btnDuo) {
            btnDuo.addEventListener('click', () => {
                if (etat !== ETAT.CHOIX_MODE) return;
				// Ouvrir d'abord l'overlay de configuration du Joueur 2
				if (duoSettingsOverlay) {
					duoSettingsOverlay.classList.add('active');
					duoSettingsOverlay.setAttribute('aria-hidden', 'false');
				} else {
					startGameDuo();
					setEtat(ETAT.JEU);
				}
            });
        }

        if (btnDuel) {
            btnDuel.addEventListener('click', () => {
                // Logique du mode duel à implémenter plus tard
                console.log('Mode Duel non implémenté pour le moment');
            });
        }
    }

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

    // Boutons de l'overlay de configuration Joueur 2
    if (duoSettingsOverlay) {
        const duoCancelBtn = duoSettingsOverlay.querySelector('.btn-duo-cancel');
        const duoStartBtn = duoSettingsOverlay.querySelector('.btn-duo-start');

        if (duoCancelBtn) {
            duoCancelBtn.addEventListener('click', () => {
                duoSettingsOverlay.classList.remove('active');
                duoSettingsOverlay.setAttribute('aria-hidden', 'true');
            });
        }

        if (duoStartBtn) {
            duoStartBtn.addEventListener('click', () => {
                // Recharger les touches configurées du Joueur 2
                reloadCustomKeys2FromStorage();
                duoSettingsOverlay.classList.remove('active');
                duoSettingsOverlay.setAttribute('aria-hidden', 'true');
                startGameDuo();
                setEtat(ETAT.JEU);
            });
        }
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


    // Barres de vie et cœurs pour Joueur 1 / Joueur 2
    barreVieJ1 = document.querySelector('.barreDeVie-j1');
    barreVieJ2 = document.querySelector('.barreDeVie-j2');
    coeursJ1 = barreVieJ1 ? barreVieJ1.querySelectorAll('img') : [];
    coeursJ2 = barreVieJ2 ? barreVieJ2.querySelectorAll('img') : [];
    labelJ1 = barreVieJ1 ? barreVieJ1.querySelector('.label-vie') : null;
    labelJ2 = barreVieJ2 ? barreVieJ2.querySelector('.label-vie') : null;

    // Cacher les cœurs au départ
    coeursJ1.forEach(coeur => coeur.style.visibility = "hidden");
    coeursJ2.forEach(coeur => coeur.style.visibility = "hidden");
    
    // Charger les assets dès le démarrage
    loadAssetsOnStart();

    // Centraliser les écouteurs clavier via ecouteur.js
    defineListeners({
        getEtat: () => etat,
        getCustomKeys: () => customKeys,
        getCustomKeys2: () => customKeys2,
        getVaisseau: () => monVaisseau,
        getVaisseau2: () => monVaisseau2,
        getMode: () => modeActuel
    });

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

// Touches configurables pour le Joueur 2 (par défaut ZQSD, même touche de tir que J1)
let customKeys2 = {
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

function reloadCustomKeysFromStorage() {
    customKeys.up = getActualKey(localStorage.getItem('key_up') || '↑');
    customKeys.left = getActualKey(localStorage.getItem('key_left') || '←');
    customKeys.down = getActualKey(localStorage.getItem('key_down') || '↓');
    customKeys.right = getActualKey(localStorage.getItem('key_right') || '→');
    customKeys.shoot = getActualKey(localStorage.getItem('key_shoot') || 'Entrée');
}

function reloadCustomKeys2FromStorage() {
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

// Convertir toutes les touches personnalisées au démarrage
reloadCustomKeysFromStorage();
reloadCustomKeys2FromStorage();

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
    modeActuel = 'solo';
    monVaisseau2 = null;

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

// Mode duo très simple : deux vaisseaux qui se baladent
function startGameDuo() {
    modeActuel = 'duo';
    levelManager = null;
    gameManager = null;

    // GameManagerDuo a maintenant besoin du player et des assets pour gérer les entités comme en solo
    gameManagerDuo = new GameManagerDuo(canvas, player, loadedAssets || {});

    const type1 = TYPE_VAISSEAU.NORMAL;
    const type2 = TYPE_VAISSEAU.NORMAL;

    monVaisseau = new Vaisseau(
        canvas.width / 3,
        canvas.height / 2,
        loadedAssets[type1],
        50,
        50,
        1.5,
        3,
        type1
    );

    monVaisseau2 = new Vaisseau(
        (canvas.width * 2) / 3,
        canvas.height / 2,
        loadedAssets[type2],
        50,
        50,
        1.5,
        3,
        type2
    );

    updateBarreDeVie();
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
    if (modeActuel === 'duo') {
        updateGameStateDuo();
        return;
    }

    if (gameManager.isHit()) return;

    // Calculer la direction basée sur les touches personnalisées (joueur solo)
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

function updateGameStateDuo() {
    // Si le gestionnaire duo n'existe pas, on ne fait rien
    if (!gameManagerDuo) return;

    // Joueur 1 : touches personnalisées (uniquement si le vaisseau existe encore)
    let dx1 = 0;
    let dy1 = 0;
    if (monVaisseau) {
        if (keys[customKeys.up]) dy1 = -1;
        if (keys[customKeys.down]) dy1 = 1;
        if (keys[customKeys.left]) dx1 = -1;
        if (keys[customKeys.right]) dx1 = 1;
    }

    // Joueur 2 : touches configurables (fallback ZQSD) si le vaisseau existe
    let dx2 = 0;
    let dy2 = 0;
    if (monVaisseau2) {
        if (keys[customKeys2.up]) dy2 = -1;
        if (keys[customKeys2.down]) dy2 = 1;
        if (keys[customKeys2.left]) dx2 = -1;
        if (keys[customKeys2.right]) dx2 = 1;
    }

    gameManagerDuo.update(monVaisseau, monVaisseau2, dx1, dy1, dx2, dy2);

    // Après la mise à jour des collisions, vérifier si un des deux vaisseaux est mort
    if (monVaisseau && typeof monVaisseau.estMort === 'function' && monVaisseau.estMort()) {
        monVaisseau = null;
    }
    if (monVaisseau2 && typeof monVaisseau2.estMort === 'function' && monVaisseau2.estMort()) {
        monVaisseau2 = null;
    }

    updateBarreDeVie();

    // Si les deux vaisseaux sont maintenant morts/absents, on déclenche le game over duo
    if (!monVaisseau && !monVaisseau2) {
        setEtat(ETAT.GAME_OVER);
        console.log('Game Over Duo : les deux joueurs sont morts');
    }
}

function updateBarreDeVie() {
    if (!coeursJ1) return;

    // Mode SOLO : comme avant, une seule barre de cœurs sans texte
    if (modeActuel === 'solo') {
        if (barreVieJ1) barreVieJ1.style.display = 'flex';
        if (barreVieJ2) barreVieJ2.style.display = 'none';
        if (labelJ1) labelJ1.style.display = 'none';
        if (labelJ2) labelJ2.style.display = 'none';

        const pvSolo = monVaisseau ? monVaisseau.pointsDeVie : 0;
        coeursJ1.forEach((c, i) => {
            c.style.visibility = i < pvSolo ? 'visible' : 'hidden';
        });

        if (coeursJ2) {
            coeursJ2.forEach(c => {
                c.style.visibility = 'hidden';
            });
        }
        return;
    }

    // Mode DUO : deux barres avec labels
    if (modeActuel === 'duo') {
        if (barreVieJ1) barreVieJ1.style.display = 'flex';
        if (barreVieJ2) barreVieJ2.style.display = 'flex';
        if (labelJ1) labelJ1.style.display = '';
        if (labelJ2) labelJ2.style.display = '';

        const pv1 = monVaisseau ? monVaisseau.pointsDeVie : 0;
        const pv2 = monVaisseau2 ? monVaisseau2.pointsDeVie : 0;

        coeursJ1.forEach((c, i) => {
            c.style.visibility = i < pv1 ? 'visible' : 'hidden';
        });
        if (coeursJ2) {
            coeursJ2.forEach((c, i) => {
                c.style.visibility = i < pv2 ? 'visible' : 'hidden';
            });
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
	if (duoSettingsOverlay) {
		duoSettingsOverlay.classList.remove('active');
		duoSettingsOverlay.setAttribute('aria-hidden', 'true');
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
        if (modeButtons) {
            modeButtons.style.display = 'none';
            modeButtons.setAttribute('aria-hidden', 'true');
        }
        // En jeu uniquement : les barres de vie sont gérées par updateBarreDeVie
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
        if (modeButtons) {
            modeButtons.style.display = 'none';
            modeButtons.setAttribute('aria-hidden', 'true');
        }
        // Hors jeu : masquer les barres de vie
        if (barreVieJ1) barreVieJ1.style.display = 'none';
        if (barreVieJ2) barreVieJ2.style.display = 'none';
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
        if (modeButtons) {
            modeButtons.style.display = 'none';
            modeButtons.setAttribute('aria-hidden', 'true');
        }
        // Hors jeu : masquer les barres de vie
        if (barreVieJ1) barreVieJ1.style.display = 'none';
        if (barreVieJ2) barreVieJ2.style.display = 'none';
        return;
    }

    // CHOIX DU MODE : on masque le canvas et on affiche uniquement les boutons de mode
    if (etat === ETAT.CHOIX_MODE) {
        canvasEl.classList.remove('game-active');
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('active');
            gameOverOverlay.setAttribute('aria-hidden', 'true');
        }
        if (menuButtons) {
            menuButtons.style.display = 'none';
        }
        if (modeButtons) {
            modeButtons.style.display = 'flex';
            modeButtons.setAttribute('aria-hidden', 'false');
        }
		if (barreVieJ1) barreVieJ1.style.display = 'none';
		if (barreVieJ2) barreVieJ2.style.display = 'none';
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

    if (modeButtons) {
        modeButtons.style.display = 'none';
        modeButtons.setAttribute('aria-hidden', 'true');
    }

    // En MENU : masquer les barres de vie
    if (barreVieJ1) barreVieJ1.style.display = 'none';
    if (barreVieJ2) barreVieJ2.style.display = 'none';
}

function drawPlaying() {
    if (modeActuel === 'duo') {
        drawPlayingDuo();
        return;
    }

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

function drawPlayingDuo() {
    // Si le gestionnaire duo n'existe pas, on ne dessine rien
    if (!gameManagerDuo) return;
    // Si les deux vaisseaux sont absents (morts), rien à dessiner
    if (!monVaisseau && !monVaisseau2) return;

    gameManagerDuo.draw(ctx, monVaisseau, monVaisseau2);

    // Dessiner les bullets uniquement pour les vaisseaux encore présents
    if (monVaisseau) {
        for (let i = monVaisseau.bullets.length - 1; i >= 0; i--) {
            const bullet = monVaisseau.bullets[i];
            bullet.draw(ctx);
        }
    }
    if (monVaisseau2) {
        for (let i = monVaisseau2.bullets.length - 1; i >= 0; i--) {
            const bullet = monVaisseau2.bullets[i];
            bullet.draw(ctx);
        }
    }
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


