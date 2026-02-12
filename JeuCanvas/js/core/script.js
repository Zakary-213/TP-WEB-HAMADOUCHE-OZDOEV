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
import { getScores } from '../score/scoreManager.js';

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

let scoreMode = 'solo';
let scoreScrollOffset = 0;

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

    // Bouton Score - Redirection vers la page score
    document.querySelector('.Score').addEventListener('click', () => {
        if (etat !== ETAT.MENU) return;

        scoreMode = 'solo';
        scoreScrollOffset = 0; 
        setEtat(ETAT.SCORE);
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
    canvas.addEventListener('click', (event) => {
        if (etat === ETAT.SCORE) {

            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const cardY = (canvas.height - 520) / 2;
            const tabY = cardY + 40;

            const centerX = canvas.width / 2;
            const tabSpacing = 120;

            if (mouseY >= tabY - 20 && mouseY <= tabY + 10) {

                if (Math.abs(mouseX - (centerX - tabSpacing)) < 60) {
                    scoreMode = 'solo';
                    scoreScrollOffset = 0;
                    return;
                }

                if (Math.abs(mouseX - centerX) < 60) {
                    scoreMode = 'duo';
                    scoreScrollOffset = 0;
                    return;
                }

                if (Math.abs(mouseX - (centerX + tabSpacing)) < 60) {
                    scoreMode = 'duel';
                    scoreScrollOffset = 0;
                    return;
                }
            }

            setEtat(ETAT.MENU);
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

        scoreScrollOffset += event.deltaY * 0.5;

        if (scoreScrollOffset < 0) scoreScrollOffset = 0;

        event.preventDefault();
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
    } 
    else if (mode === 'duo') {
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
    if (etat === ETAT.JEU || etat === ETAT.DUEL || etat === ETAT.GAME_OVER || etat === ETAT.TRANSITION || etat === ETAT.SCORE) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (etat === ETAT.SCORE) {
        drawScoreScreen();
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

function drawScoreScreen() {

    const scores = getScores(scoreMode);

    const cardWidth = 440;
    const cardHeight = 520;

    const cardX = (canvas.width - cardWidth) / 2;
    const cardY = (canvas.height - cardHeight) / 2;

    const contentPadding = 40;
    const lineHeight = 22;

    // --- FOND ---
    ctx.fillStyle = '#1f2235';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    ctx.fill();

    // =========================
    // === ONGLET ZONE CLICK ===
    // =========================

    const tabY = cardY + 40;
    const tabSpacing = 120;
    const centerX = canvas.width / 2;

    const tabs = [
        { mode: 'solo', x: centerX - tabSpacing },
        { mode: 'duo', x: centerX },
        { mode: 'duel', x: centerX + tabSpacing }
    ];

    ctx.font = '18px Arial';
    ctx.textAlign = 'center';

    tabs.forEach(tab => {
        ctx.fillStyle = scoreMode === tab.mode ? '#f1c40f' : 'white';
        ctx.fillText(tab.mode.toUpperCase(), tab.x, tabY);
    });

    // --- TITRE ---
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('CLASSEMENT', canvas.width / 2, cardY + 85);

    // --- ZONE CONTENU ---
    const contentX = cardX + contentPadding;
    const contentY = cardY + 110;
    const contentWidth = cardWidth - contentPadding * 2;
    const contentHeight = cardHeight - 170;

    // 🔥 Calcul hauteur totale
    let totalContentHeight = 0;

    scores.forEach(score => {
        if (scoreMode === 'solo') {
            totalContentHeight += 25;
            totalContentHeight += score.niveaux.length * lineHeight;
            totalContentHeight += 35;
        }
        else if (scoreMode === 'duo') {

            totalContentHeight += 25; // titre

            // 2 increments par niveau
            totalContentHeight += score.niveaux.length * (lineHeight * 2);

            // TOTAL :
            totalContentHeight += lineHeight * 2;

            totalContentHeight += 15; // marge finale
        }
    });

    const maxScroll = Math.max(0, totalContentHeight - contentHeight);

    if (scoreScrollOffset > maxScroll) scoreScrollOffset = maxScroll;
    if (scoreScrollOffset < 0) scoreScrollOffset = 0;

    // --- CLIP ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentWidth, contentHeight);
    ctx.clip();

    ctx.textAlign = 'left';

    // 🔥 EXACTEMENT comme solo
    let y = contentY + 20 - scoreScrollOffset;

    scores.forEach((score, index) => {

        // =====================
        // ======== SOLO =======
        // =====================
        if (scoreMode === 'solo') {

            if (!score.pseudo) return;

            ctx.fillStyle = '#f1c40f';
            ctx.font = '18px Arial';
            ctx.fillText(`${index + 1}. ${score.pseudo}`, contentX, y);
            y += 25;

            ctx.fillStyle = 'white';
            ctx.font = '15px Arial';

            score.niveaux.forEach(lvl => {

                const minutes = Math.floor(lvl.time / 60000);
                const seconds = Math.floor((lvl.time % 60000) / 1000);
                const timeFormatted =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                ctx.fillText(
                    `N${lvl.niveau} : ${timeFormatted} - ${lvl.meteorites} météorites`,
                    contentX + 20,
                    y
                );

                y += lineHeight;
            });

            const totalMinutes = Math.floor(score.totalTime / 60000);
            const totalSeconds = Math.floor((score.totalTime % 60000) / 1000);
            const totalFormatted =
                `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;

            ctx.fillStyle = '#00ffaa';
            ctx.fillText(
                `TOTAL : ${totalFormatted} - ${score.totalMeteorites} météorites`,
                contentX + 20,
                y
            );

            y += 35;
        }

        // =====================
        // ======== DUO ========
        // =====================
        else if (scoreMode === 'duo') {

            const joueur1 = score.joueurs[0];
            const joueur2 = score.joueurs[1];

            if (!joueur1 || !joueur2) return;

            ctx.font = '18px Arial';

            // 🔥 Numéro en BLANC
            ctx.fillStyle = 'white';
            ctx.fillText(`${index + 1}.`, contentX, y);

            const numberWidth = ctx.measureText(`${index + 1}. `).width;

            // J1 bleu
            ctx.fillStyle = '#3498db';
            ctx.fillText(joueur1.pseudo, contentX + numberWidth, y);

            const pseudoWidth = ctx.measureText(joueur1.pseudo).width;

            // &
            ctx.fillStyle = 'white';
            ctx.fillText(" & ", contentX + numberWidth + pseudoWidth, y);

            const andWidth = ctx.measureText(" & ").width;

            // J2 rouge
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(
                joueur2.pseudo,
                contentX + numberWidth + pseudoWidth + andWidth,
                y
            );

            y += 25;

            // ----- NIVEAUX -----
            score.niveaux.forEach((lvlTime, i) => {

                const minutes = Math.floor(lvlTime.time / 60000);
                const seconds = Math.floor((lvlTime.time % 60000) / 1000);
                const timeFormatted =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                ctx.fillStyle = 'white';
                ctx.fillText(
                    `N${lvlTime.niveau} : ${timeFormatted}`,
                    contentX + 20,
                    y
                );
                y += lineHeight;

                ctx.fillStyle = '#3498db';
                ctx.fillText(
                    `${joueur1.pseudo} : ${joueur1.niveaux[i].meteorites}`,
                    contentX + 40,
                    y
                );

                ctx.fillStyle = '#e74c3c';
                ctx.fillText(
                    `${joueur2.pseudo} : ${joueur2.niveaux[i].meteorites}`,
                    contentX + 220,
                    y
                );

                y += lineHeight;
            });

            // ----- TOTAL -----
            const totalMinutes = Math.floor(score.totalTime / 60000);
            const totalSeconds = Math.floor((score.totalTime % 60000) / 1000);
            const totalFormatted =
                `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;

            ctx.fillStyle = '#00ffaa';
            ctx.fillText(
                `TOTAL : ${totalFormatted}`,
                contentX + 20,
                y
            );

            y += lineHeight;

            ctx.fillStyle = '#3498db';
            ctx.fillText(
                `${joueur1.pseudo} : ${joueur1.totalMeteorites}`,
                contentX + 40,
                y
            );

            ctx.fillStyle = '#e74c3c';
            ctx.fillText(
                `${joueur2.pseudo} : ${joueur2.totalMeteorites}`,
                contentX + 220,
                y
            );

            y += 35;
        }

    });

    ctx.restore();

    // --- FOOTER ---
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(
        'Molette pour scroller • Clique pour revenir',
        canvas.width / 2,
        cardY + cardHeight - 20
    );
}
