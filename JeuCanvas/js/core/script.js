import Vaisseau from '../entities/vaisseau.js';
import GameManager from './gameManager.js';
import GameManagerDuo from './gameManagerDuo.js';
import { loadAssets } from './assetLoader.js';
import { TYPE_VAISSEAU } from '../entities/typeVaisseau.js';
import Player from '../entities/player.js';
import Boutique, { BoutiqueUI } from '../ui/boutique.js';
import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';
import LevelManager from '../niveaux/levelManagerSolo.js';
import TransitionNiveau, { transitionSoloLevel, transitionDuoLevel } from '../niveaux/transitionNiveau.js';
import { startDuel, updateDuelGameState, drawDuel, resetDuelState } from '../niveaux/duel.js';
import { defineListeners, inputStates } from './ecouteur.js';
import { ETAT, LEVELS, LEVELS_DUO, customKeys, customKeys2, reloadCustomKeysFromStorage, reloadCustomKeys2FromStorage, setEtat as appliquerEtat } from './gameState.js';

let canvas, ctx;

let monVaisseau, monVaisseau2, gameManager, gameManagerDuo;

let etat = ETAT.MENU, modeActuel = 'solo', loadedAssets, keys = inputStates;

const player = new Player(), DEBUG_HITBOX = true;
const BASE_CANVAS_WIDTH = 500, BASE_CANVAS_HEIGHT = 600;

let coeursJ1, coeursJ2, barreVieJ1, barreVieJ2, labelJ1, labelJ2;

let settingsOverlay, duoSettingsOverlay, settingsClose, menuButtons, modeButtons;
let gameOverOverlay, shopOverlay, shopClose, btnBoutique, boutiqueUI = null;

let gameOverTitle, gameOverSubtitle, gameOverHint, duoSettingsTitle, duoStartBtn;

let chronometre, meteoriteCountElement, levelTransition, destroyedMeteorites = 0;
let levelManager, levelManagerDuo, pendingMode = 'duo';

const setOverlayVisibility = (overlay, active) => {
    if (!overlay) return;
    overlay.classList.toggle('active', active);
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
};

const setDisplay = (el, value) => {
    if (el) el.style.display = value;
};

const setMenuButtonsVisible = (visible) => {
    setDisplay(menuButtons, visible ? 'flex' : 'none');
};

const setModeButtonsVisible = (visible) => {
    if (!modeButtons) return;
    modeButtons.style.display = visible ? 'flex' : 'none';
    modeButtons.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

const setCanvasActive = (active) => {
    const canvasEl = document.getElementById('monCanvas');
    if (!canvasEl) return;
    canvasEl.classList.toggle('game-active', active);
};

const hideLifeBars = () => {
    setDisplay(barreVieJ1, 'none');
    setDisplay(barreVieJ2, 'none');
};

const setVaisseaux = (vaisseau1, vaisseau2) => {
    monVaisseau = vaisseau1;
    monVaisseau2 = vaisseau2;
};

const getVaisseaux = () => ({ vaisseau1: monVaisseau, vaisseau2: monVaisseau2 });

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');
    settingsOverlay = document.querySelector('.settings-overlay');
    duoSettingsOverlay = document.querySelector('.settings-overlay-j2');
    gameOverOverlay = document.querySelector('.gameover-overlay');
    gameOverTitle = document.querySelector('.gameover-title');
    gameOverSubtitle = document.querySelector('.gameover-subtitle');
    gameOverHint = document.querySelector('.gameover-hint');
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
    canvas.width = BASE_CANVAS_WIDTH;
    canvas.height = BASE_CANVAS_HEIGHT;

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
                startGame('solo');
                setEtat(ETAT.JEU);
            });
        }

        if (btnDuo) {
            btnDuo.addEventListener('click', () => {
                if (etat !== ETAT.CHOIX_MODE) return;
                pendingMode = 'duo';
				if (duoSettingsOverlay) {
                    if (duoSettingsTitle) duoSettingsTitle.textContent = 'Contrôles Joueur 2';
                    if (duoStartBtn) duoStartBtn.textContent = 'Lancer le duo';
					duoSettingsOverlay.classList.add('active');
					duoSettingsOverlay.setAttribute('aria-hidden', 'false');
				} else {
					startGame('duo');
					setEtat(ETAT.JEU);
				}
            });
        }

        if (btnDuel) {
            btnDuel.addEventListener('click', () => {
                if (etat !== ETAT.CHOIX_MODE) return;
                pendingMode = 'duel';
                // Afficher les réglages Joueur 2 pour le duel
                if (duoSettingsOverlay) {
                    if (duoSettingsTitle) duoSettingsTitle.textContent = 'Contrôles Duel';
                    if (duoStartBtn) duoStartBtn.textContent = 'Lancer le duel';
                    duoSettingsOverlay.classList.add('active');
                    duoSettingsOverlay.setAttribute('aria-hidden', 'false');
                } else {
                    startGame('duel');
                    setEtat(ETAT.DUEL);
                }
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
        duoStartBtn = duoSettingsOverlay.querySelector('.btn-duo-start');
        duoSettingsTitle = duoSettingsOverlay.querySelector('h2');

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
                if (pendingMode === 'duel') {
                    startGame('duel');
                    setEtat(ETAT.DUEL);
				} else {
					startGame('duo');
					setEtat(ETAT.JEU);
				}
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

    // On lance la boucle d'animation dès le menu
    requestAnimationFrame(gameLoop);
});

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

async function loadAssetsOnStart() {
    loadedAssets = await loadAssets(assetsToLoadURLs);
    window.applyMusicVolume = applyMusicVolume;
    const savedMusicVolume = localStorage.getItem('music_volume');
    if (savedMusicVolume !== null) {
        applyMusicVolume(Number(savedMusicVolume));
    }
}

const transitionSolo = (levelIndex, doneCallback) =>
    transitionSoloLevel({
        levelIndex,
        doneCallback,
        levelTransition,
        LEVELS,
        ETAT,
        setEtat
    });

const transitionDuo = (levelIndex, doneCallback) =>
    transitionDuoLevel({
        levelIndex,
        doneCallback,
        levelTransition,
        LEVELS_DUO,
        ETAT,
        setEtat
    });

function startGame(mode) {
    modeActuel = mode;
    resetDuelState();

    if (mode === 'solo') {
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
            transitionSolo
        );
        levelManager.start();
        const shipType = player.getEquippedShip();
        monVaisseau = new Vaisseau(
            canvas.width / 2,
            canvas.height / 2,
            loadedAssets[shipType],
            50,
            50,
            1.5,
            3,
            shipType
        );
    } else if (mode === 'duo') {
        levelManager = null;
        gameManager = null;
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
        levelManagerDuo = new LevelManager(
            gameManagerDuo,
            LEVELS_DUO,
            () => {},
            transitionDuo
        );
        levelManagerDuo.start();
    } else if (mode === 'duel') {
        levelManager = null;
        levelManagerDuo = null;
        gameManager = null;
        gameManagerDuo = null;
        startDuel({
            canvas,
            player,
            loadedAssets,
            setVaisseaux,
            updateBarreDeVie
        });
    }

    updateBarreDeVie();
}

function gameLoop() {
    // Ne dessiner le canvas que quand il est visible
    if (etat === ETAT.JEU || etat === ETAT.DUEL || etat === ETAT.GAME_OVER || etat === ETAT.TRANSITION) {
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
    if (etat !== ETAT.JEU && etat !== ETAT.DUEL) return;
    if (modeActuel === 'duo') {
        updateGameStateDuo();
        return;
    }
    if (modeActuel === 'duel') {
        updateDuelGameState({
            keys,
            customKeys,
            customKeys2,
            getVaisseaux,
            setVaisseaux,
            updateBarreDeVie,
            setEtat,
            ETAT,
            setDuelGameOverText
        });
        return;
    }

    if (!gameManager || !monVaisseau || !levelManager) return;

    gameManager.updateGameState({
        vaisseau: monVaisseau,
        levelManager,
        keys,
        customKeys,
        setEtat,
        ETAT,
        updateBarreDeVie,
        chronometre,
        formatTime
    });
}

function updateGameStateDuo() {
    // Si le gestionnaire duo n'existe pas, on ne fait rien
    if (!gameManagerDuo) return;

    gameManagerDuo.updateGameStateDuo({
        vaisseau1: monVaisseau,
        vaisseau2: monVaisseau2,
        levelManagerDuo,
        keys,
        customKeys,
        customKeys2,
        setEtat,
        ETAT,
        updateBarreDeVie,
        chronometre,
        formatTime
    });

    // Après la mise à jour des collisions, vérifier si un des deux vaisseaux est mort
    if (monVaisseau && typeof monVaisseau.estMort === 'function' && monVaisseau.estMort()) {
        monVaisseau = null;
    }
    if (monVaisseau2 && typeof monVaisseau2.estMort === 'function' && monVaisseau2.estMort()) {
        monVaisseau2 = null;
    }

    updateBarreDeVie();

	// Mettre à jour le chronomètre en fonction du niveau duo courant
	if (levelManagerDuo) {
		const level = levelManagerDuo.getCurrentLevel();
		if (level && chronometre) {
			chronometre.textContent = formatTime(level.getElapsedTime());
		}
	}

    // Si les deux vaisseaux sont maintenant morts/absents, on déclenche le game over duo
    if (!monVaisseau && !monVaisseau2) {
        setEtat(ETAT.GAME_OVER);
        console.log('Game Over Duo : les deux joueurs sont morts');
    }
}

function setDuelGameOverText(winnerLabel) {
    if (gameOverTitle) gameOverTitle.textContent = 'DUEL TERMINÉ';
    if (gameOverSubtitle) gameOverSubtitle.textContent = `${winnerLabel} gagne la partie`;
    if (gameOverHint) gameOverHint.textContent = 'Clique sur le canvas pour revenir';
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

    // Mode DUO / DUEL : deux barres avec labels
    if (modeActuel === 'duo' || modeActuel === 'duel') {
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
    etat = appliquerEtat(
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
    );
}

const drawBullets = (vaisseau) => {
    if (!vaisseau) return;
    for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
        const bullet = vaisseau.bullets[i];
        bullet.draw(ctx);
    }
};

function drawPlaying() {
    if (modeActuel === 'duel') {
        drawDuel(ctx, getVaisseaux);
        return;
    }

    if (modeActuel === 'duo') {
        if (!gameManagerDuo) return;
        if (!monVaisseau && !monVaisseau2) return;
        gameManagerDuo.draw(ctx, monVaisseau, monVaisseau2);
        drawBullets(monVaisseau);
        drawBullets(monVaisseau2);
        return;
    }

    if (!gameManager || !monVaisseau) return;
    if (gameManager.isHit()) {
        monVaisseau.draw(ctx);
        return;
    }

    gameManager.draw(ctx);
    monVaisseau.draw(ctx);
    drawShieldBubble(ctx, monVaisseau);
    drawEclairBar(ctx, monVaisseau);
    drawRafaleBar(ctx, monVaisseau);
    drawBullets(monVaisseau);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}