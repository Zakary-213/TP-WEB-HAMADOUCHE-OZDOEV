import Vaisseau from '../entities/vaisseau.js';
import GameManagerDuel from '../core/managers/gameManagerDuel.js';
import { TYPE_VAISSEAU } from '../entities/types/typeVaisseau.js';
import Tour from './tour.js';

let gameManagerDuel = null;
let duelScoreJ1 = 0;
let duelScoreJ2 = 0;
let duelRoundLocked = false;
let duelResetTimeout = null;
let tour = null;

let duelContext = null;

function clearDuelResetTimeout() {
	if (duelResetTimeout) {
		clearTimeout(duelResetTimeout);
		duelResetTimeout = null;
	}
}

function createDuelVaisseaux(loadedAssets, canvas) {
	const type1 = TYPE_VAISSEAU.NORMAL;
	const type2 = TYPE_VAISSEAU.NORMAL;

	const vaisseau1 = new Vaisseau(
		canvas.width * 0.25,
		canvas.height / 2,
		loadedAssets[type1],
		50,
		50,
		1.7,
		5,
		type1
	);

	const vaisseau2 = new Vaisseau(
		canvas.width * 0.75,
		canvas.height / 2,
		loadedAssets[type2],
		50,
		50,
		1.7,
		5,
		type2
	);

	return { vaisseau1, vaisseau2 };
}

function resetDuelRound() {
	if (!duelContext || !gameManagerDuel) return;

	gameManagerDuel.resetRound();

	const { canvas, loadedAssets, setVaisseaux, updateBarreDeVie } = duelContext;
	const { vaisseau1, vaisseau2 } = createDuelVaisseaux(loadedAssets, canvas);
	setVaisseaux(vaisseau1, vaisseau2);
	updateBarreDeVie();
}

export function resetDuelState() {
	duelScoreJ1 = 0;
	duelScoreJ2 = 0;
	duelRoundLocked = false;
	clearDuelResetTimeout();
	gameManagerDuel = null;
	duelContext = null;
	if (tour) {
		tour.reset();
	}
}

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
	if (!gameManagerDuel) return;
	if (duelRoundLocked) return;

	const { vaisseau1, vaisseau2 } = getVaisseaux();

	gameManagerDuel.updateGameStateDuel({
		vaisseau1,
		vaisseau2,
		keys,
		customKeys,
		customKeys2,
		updateBarreDeVie
	});

	const v1Dead = vaisseau1 && typeof vaisseau1.estMort === 'function' && vaisseau1.estMort();
	const v2Dead = vaisseau2 && typeof vaisseau2.estMort === 'function' && vaisseau2.estMort();

	if (!v1Dead && !v2Dead) return;

	if (v1Dead || v2Dead) {
		setVaisseaux(v1Dead ? null : vaisseau1, v2Dead ? null : vaisseau2);
	}

	duelRoundLocked = true;

	if (v1Dead && !v2Dead) {
		duelScoreJ2++;
		tour.endRound('Joueur 2');
	} else if (v2Dead && !v1Dead) {
		duelScoreJ1++;
		tour.endRound('Joueur 1');
	}

	const hasWinner = duelScoreJ1 >= 3 || duelScoreJ2 >= 3;

	if (hasWinner) {
		if (duelScoreJ1 >= 3) {
			setDuelGameOverText('Joueur 1');
		} else {
			setDuelGameOverText('Joueur 2');
		}
		setEtat(ETAT.GAME_OVER);
		return;
	}

	duelResetTimeout = setTimeout(() => {
		tour.startNewRound();
		resetDuelRound();
		duelRoundLocked = false;
	}, 1200);
}

export function drawDuel(ctx, getVaisseaux) {
	if (!gameManagerDuel) return;
	const { vaisseau1, vaisseau2 } = getVaisseaux();
	if (!vaisseau1 && !vaisseau2) return;

	gameManagerDuel.draw(ctx, vaisseau1, vaisseau2);

	if (vaisseau1) {
		for (let i = vaisseau1.bullets.length - 1; i >= 0; i--) {
			const bullet = vaisseau1.bullets[i];
			bullet.draw(ctx);
		}
	}
	if (vaisseau2) {
		for (let i = vaisseau2.bullets.length - 1; i >= 0; i--) {
			const bullet = vaisseau2.bullets[i];
			bullet.draw(ctx);
		}
	}
}