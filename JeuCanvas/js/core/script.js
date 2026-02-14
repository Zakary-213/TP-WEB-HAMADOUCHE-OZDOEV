import Vaisseau from '../entities/vaisseau.js';
import GameManager from './managers/gameManager.js';
import GameManagerDuo from './managers/gameManagerDuo.js';
import { loadAssets } from './assetLoader.js';
import { TYPE_VAISSEAU } from '../entities/types/typeVaisseau.js';
import { assetsToLoadURLs } from './helpers/assetsConfig.js';
import { applyMusicVolume as applyMusicVolumeHelper, applySfxVolume as applySfxVolumeHelper } from './helpers/audioHelpers.js';
import Player from '../entities/player.js';
import { BoutiqueUI } from '../ui/boutique.js';
import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';
import LevelManager from '../niveaux/solo/levelManagerSolo.js';
import TransitionNiveau, { transitionSoloLevel, transitionDuoLevel } from '../niveaux/transitionNiveau.js';
import { startDuel, updateDuelGameState, drawDuel, resetDuelState } from '../niveaux/duel.js';
import { defineListeners, inputStates } from './ecouteur.js';
import { ETAT, LEVELS, LEVELS_DUO, customKeys, customKeys2, reloadCustomKeysFromStorage, reloadCustomKeys2FromStorage, setEtat as appliquerEtat } from './gameState.js';

import {
    setOverlayVisibility,
    setCanvasActive,
    setMenuButtonsVisible as setMenuButtonsVisibleUI,
    setModeButtonsVisible as setModeButtonsVisibleUI,
    initLifeBars,
    updateLifeBars,
    hideLifeBars as hideLifeBarsUI,
    resetScoreView,
    handleScoreScreenClick,
    scrollScore,
    drawScoreScreen,
    formatTime
} from './gameHud.js';

let canvas, ctx;

let monVaisseau, monVaisseau2, gameManager, gameManagerDuo;

let etat = ETAT.MENU, modeActuel = 'solo', loadedAssets, keys = inputStates;

const player = new Player();
const BASE_CANVAS_WIDTH = 500, BASE_CANVAS_HEIGHT = 600;

let settingsOverlay, duoSettingsOverlay, settingsClose, menuButtons, modeButtons;
let gameOverOverlay, shopOverlay, shopClose, btnBoutique, boutiqueUI = null;

let gameOverTitle, gameOverSubtitle, gameOverHint, duoSettingsTitle, duoStartBtn;

let chronometre, meteoriteCountElement, levelTransition, destroyedMeteorites = 0, gameHud;
let levelManager, levelManagerDuo, pendingMode = 'duo';

const isJeuState = (state) => {
    return state === ETAT.JEU ||
        state === ETAT.DUEL ||
        state === ETAT.GAME_OVER ||
        state === ETAT.TRANSITION ||
        state === ETAT.SCORE;
};

const setMenuButtonsVisible = (visible) => {
    setMenuButtonsVisibleUI(menuButtons, visible);
};

const setModeButtonsVisible = (visible) => {
    setModeButtonsVisibleUI(modeButtons, visible);
};

const hideLifeBars = () => {
    hideLifeBarsUI();
};

const setHudVisible = (visible) => {
    if (!gameHud) return;
    gameHud.style.display = visible ? '' : 'none';
};

const updateHudVisibility = (etatCourant) => {
    const visible =
        etatCourant === ETAT.JEU ||
        etatCourant === ETAT.DUEL ||
        etatCourant === ETAT.TRANSITION;
    setHudVisible(visible);
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
    gameHud = document.querySelector('.game-hud');
    levelTransition = new TransitionNiveau(canvas);
    initLifeBars();
    setHudVisible(false);
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

    // Bouton Score - Redirection vers la page score
    document.querySelector('.Score').addEventListener('click', () => {
        if (etat !== ETAT.MENU) return;
        resetScoreView();
        setEtat(ETAT.SCORE);
    });

    // Bouton Règles - Redirection vers la page règles
    document.querySelector('.Regles').addEventListener('click', () => {
        if (etat !== ETAT.MENU) return;

        setEtat(ETAT.REGLES);

        const rulesOverlay = document.querySelector('.rules-overlay');
        if (rulesOverlay) {
            rulesOverlay.classList.add('active');
            rulesOverlay.setAttribute('aria-hidden', 'false');
        }
    });

    const rulesOverlay = document.querySelector('.rules-overlay');
    const rulesClose = document.querySelector('.rules-close');

    if (rulesClose) {
        rulesClose.addEventListener('click', () => {
            rulesOverlay.classList.remove('active');
            rulesOverlay.setAttribute('aria-hidden', 'true');
            setEtat(ETAT.MENU);
        });
    }   



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
    canvas.addEventListener('click', (event) => {
        if (etat === ETAT.SCORE) {
            handleScoreScreenClick(canvas, event, setEtat, ETAT);
            return;
        }

        if (etat === ETAT.GAME_OVER) {
            setEtat(ETAT.MENU);
            return;
        }

        if (etat === ETAT.TRANSITION && levelTransition) {
            levelTransition.completeManually();
        }
    });

    canvas.addEventListener('wheel', (event) => {
        if (etat !== ETAT.SCORE) return;
        scrollScore(event.deltaY);
        event.preventDefault();
    });


    // On lance la boucle d'animation dès le menu
    requestAnimationFrame(gameLoop);
});

async function loadAssetsOnStart() {
    loadedAssets = await loadAssets(assetsToLoadURLs);
    window.applyMusicVolume = (value) => applyMusicVolumeHelper(value, loadedAssets);
    window.applySfxVolume = (value) => applySfxVolumeHelper(value, loadedAssets);
    const savedMusicVolume = localStorage.getItem('music_volume');
    if (savedMusicVolume !== null) {
        applyMusicVolumeHelper(Number(savedMusicVolume), loadedAssets);
    }
    const savedSfxVolume = localStorage.getItem('sfx_volume');
    if (savedSfxVolume !== null) {
        applySfxVolumeHelper(Number(savedSfxVolume), loadedAssets);
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
        gameManagerDuo.onMeteoriteDestroyed = () => {
            destroyedMeteorites++;
            meteoriteCountElement.textContent = destroyedMeteorites;
        };
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
            () => {
                destroyedMeteorites = 0;
                meteoriteCountElement.textContent = "0";
            },
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
    if (isJeuState(etat)) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (etat === ETAT.SCORE) {
            drawScoreScreen(ctx, canvas);
        } else {
            drawPlaying();
        }
        //drawPlaying();
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

	// Sécurité : si le GameManager est en game over mais que
	// l'état global n'a pas encore été basculé, on force l'affichage.
	if (gameManager.isGameOver && typeof gameManager.isGameOver === 'function') {
		if (gameManager.isGameOver() && etat !== ETAT.GAME_OVER) {
			setEtat(ETAT.GAME_OVER);
		}
	}
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

function updateBarreDeVie() {
    updateLifeBars(modeActuel, monVaisseau, monVaisseau2);
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

    updateHudVisibility(etat);
}

function setDuelGameOverText(winnerLabel) {
    if (gameOverTitle) gameOverTitle.textContent = 'DUEL TERMINÉ';
    if (gameOverSubtitle) gameOverSubtitle.textContent = `${winnerLabel} gagne la partie`;
    if (gameOverHint) gameOverHint.textContent = 'Clique sur le canvas pour revenir';
}
