/**
 * @module duel
 * @description Gère la logique spécifique au mode Duel (Joueur contre Joueur).
 * Contrôle le système de score (BO5 - Premier à 3 points), les rounds et la réinitialisation des vaisseaux.
 */

import Vaisseau from '../entities/vaisseau.js';
import GameManagerDuel from '../core/managers/gameManagerDuel.js';
import { TYPE_VAISSEAU } from '../entities/types/typeVaisseau.js';
import Tour from './tour.js';

// --- État interne du Duel ---
let gameManagerDuel = null;
let duelScoreJ1 = 0;
let duelScoreJ2 = 0;
let duelRoundLocked = false; // Empêche les mises à jour durant la transition entre deux rounds
let duelResetTimeout = null;
let tour = null;
let duelContext = null; // Stocke les références nécessaires (canvas, assets) pour le reset

/**
 * Nettoie le timer de réinitialisation pour éviter les fuites de mémoire 
 * ou les conflits lors d'un changement d'état brutal.
 */
function clearDuelResetTimeout() {
    if (duelResetTimeout) {
        clearTimeout(duelResetTimeout);
        duelResetTimeout = null;
    }
}

/**
 * Crée les deux vaisseaux en position de duel (gauche vs droite).
 * @param {Object} loadedAssets - Les assets chargés.
 * @param {HTMLCanvasElement} canvas - Le canvas de jeu.
 * @returns {Object} Un objet contenant vaisseau1 et vaisseau2.
 */
function createDuelVaisseaux(loadedAssets, canvas) {
    const type1 = TYPE_VAISSEAU.NORMAL;
    const type2 = TYPE_VAISSEAU.NORMAL;

    const vaisseau1 = new Vaisseau(
        canvas.width * 0.25, // Positionné à 25% du bord gauche
        canvas.height / 2,
        loadedAssets[type1],
        50, 50, 1.7, 5, type1
    );

    const vaisseau2 = new Vaisseau(
        canvas.width * 0.75, // Positionné à 75% du bord gauche
        canvas.height / 2,
        loadedAssets[type2],
        50, 50, 1.7, 5, type2
    );

    return { vaisseau1, vaisseau2 };
}

/**
 * Réinitialise les entités pour un nouveau round sans changer le score global.
 */
function resetDuelRound() {
    if (!duelContext || !gameManagerDuel) return;

    gameManagerDuel.resetRound();

    const { canvas, loadedAssets, setVaisseaux, updateBarreDeVie } = duelContext;
    const { vaisseau1, vaisseau2 } = createDuelVaisseaux(loadedAssets, canvas);
    
    setVaisseaux(vaisseau1, vaisseau2);
    updateBarreDeVie();
}

/**
 * Réinitialise complètement le module Duel (pour un retour menu par exemple).
 */
export function resetDuelState() {
    duelScoreJ1 = 0;
    duelScoreJ2 = 0;
    duelRoundLocked = false;
    clearDuelResetTimeout();
    gameManagerDuel = null;
    duelContext = null;
    if (tour) tour.reset();
}

/**
 * Initialise les composants du mode duel et lance le premier round.
 */
export function startDuel({ canvas, player, loadedAssets, setVaisseaux, updateBarreDeVie }) {
    duelScoreJ1 = 0;
    duelScoreJ2 = 0;
    duelRoundLocked = false;
    clearDuelResetTimeout();
    tour = new Tour();

    duelContext = { canvas, loadedAssets, setVaisseaux, updateBarreDeVie };
    gameManagerDuel = new GameManagerDuel(canvas, player, loadedAssets || {});

    const { vaisseau1, vaisseau2 } = createDuelVaisseaux(loadedAssets, canvas);
    setVaisseaux(vaisseau1, vaisseau2);
    updateBarreDeVie();
}

/**
 * Boucle de mise à jour principale du mode Duel.
 * Gère la détection de mort et la fin de partie.
 */
export function updateDuelGameState({
    keys,
    customKeys,
    customKeys2,
    getVaisseaux,
    setVaisseaux,
    updateBarreDeVie,
    setEtat,
    ETAT,
    setDuelGameOverText
}) {
    if (!gameManagerDuel || duelRoundLocked) return;

    const { vaisseau1, vaisseau2 } = getVaisseaux();

    // Mise à jour physique via le manager
    gameManagerDuel.updateGameStateDuel({
        vaisseau1, vaisseau2, keys, customKeys, customKeys2, updateBarreDeVie
    });

    // Vérification de la mort des joueurs
    const v1Dead = vaisseau1?.estMort?.();
    const v2Dead = vaisseau2?.estMort?.();

    if (!v1Dead && !v2Dead) return;

    // --- Gestion de la mort ---
    if (v1Dead || v2Dead) {
        setVaisseaux(v1Dead ? null : vaisseau1, v2Dead ? null : vaisseau2);
    }

    duelRoundLocked = true; // On fige l'état le temps de la transition

    // Mise à jour du score
    if (v1Dead && !v2Dead) {
        duelScoreJ2++;
        tour.endRound('Joueur 2');
    } else if (v2Dead && !v1Dead) {
        duelScoreJ1++;
        tour.endRound('Joueur 1');
    }

    // Vérification de la condition de victoire (Premier à 3 points)
    const hasWinner = duelScoreJ1 >= 3 || duelScoreJ2 >= 3;

    if (hasWinner) {
        setDuelGameOverText(duelScoreJ1 >= 3 ? 'Joueur 1' : 'Joueur 2');
        setEtat(ETAT.GAME_OVER);
        return;
    }

    // Lancement du round suivant après un court délai
    duelResetTimeout = setTimeout(() => {
        tour.startNewRound();
        resetDuelRound();
        duelRoundLocked = false;
    }, 1200);
}

/**
 * Gère l'affichage spécifique aux vaisseaux et leurs projectiles en mode duel.
 */
export function drawDuel(ctx, getVaisseaux) {
    if (!gameManagerDuel) return;
    const { vaisseau1, vaisseau2 } = getVaisseaux();
    if (!vaisseau1 && !vaisseau2) return;

    // Rendu du manager (fond, obstacles éventuels)
    gameManagerDuel.draw(ctx, vaisseau1, vaisseau2);

    // Rendu manuel des projectiles (pour un contrôle total de l'ordre d'affichage)
    [vaisseau1, vaisseau2].forEach(v => {
        if (v) {
            for (let i = v.bullets.length - 1; i >= 0; i--) {
                v.bullets[i].draw(ctx);
            }
        }
    });
}