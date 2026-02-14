import { getScores } from '../score/scoreManager.js';

export const setOverlayVisibility = (overlay, active) => {
    if (!overlay) return;
    overlay.classList.toggle('active', active);
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
};

const setDisplay = (el, value) => {
    if (el) el.style.display = value;
};

export const setCanvasActive = (active) => {
    const canvasEl = document.getElementById('monCanvas');
    if (!canvasEl) return;
    canvasEl.classList.toggle('game-active', active);
};

export const setMenuButtonsVisible = (menuButtons, visible) => {
    setDisplay(menuButtons, visible ? 'flex' : 'none');
};

export const setModeButtonsVisible = (modeButtons, visible) => {
    if (!modeButtons) return;
    modeButtons.style.display = visible ? 'flex' : 'none';
    modeButtons.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

// Gestion des barres de vie / coeurs
let barreVieJ1, barreVieJ2;
let coeursJ1, coeursJ2;
let labelJ1, labelJ2;

export function initLifeBars() {
    barreVieJ1 = document.querySelector('.barreDeVie-j1');
    barreVieJ2 = document.querySelector('.barreDeVie-j2');
    coeursJ1 = barreVieJ1 ? barreVieJ1.querySelectorAll('img') : [];
    coeursJ2 = barreVieJ2 ? barreVieJ2.querySelectorAll('img') : [];
    labelJ1 = barreVieJ1 ? barreVieJ1.querySelector('.label-vie') : null;
    labelJ2 = barreVieJ2 ? barreVieJ2.querySelector('.label-vie') : null;

    // Cacher les cœurs au départ
    coeursJ1.forEach(coeur => { coeur.style.display = 'none'; });
    coeursJ2.forEach(coeur => { coeur.style.display = 'none'; });
}


export function updateLifeBars(modeActuel, vaisseau1, vaisseau2) {
    if (!coeursJ1) return;

    // =========================
    // ===== MODE SOLO =========
    // =========================
    if (modeActuel === 'solo') {

        if (barreVieJ1) barreVieJ1.style.display = 'flex';
        if (barreVieJ2) barreVieJ2.style.display = 'none';

        if (labelJ1) labelJ1.style.display = 'none';
        if (labelJ2) labelJ2.style.display = 'none';

        const pvSolo = vaisseau1 ? vaisseau1.pointsDeVie : 0;

        coeursJ1.forEach((c, i) => {
            c.style.display = i < pvSolo ? 'inline-block' : 'none';
        });

        if (coeursJ2) {
            coeursJ2.forEach(c => {
                c.style.display = 'none';
            });
        }

        return;
    }

    // =========================
    // ===== MODE DUO / DUEL ===
    // =========================
    if (modeActuel === 'duo' || modeActuel === 'duel') {

        if (barreVieJ1) barreVieJ1.style.display = 'flex';
        if (barreVieJ2) barreVieJ2.style.display = 'flex';

        if (labelJ1) labelJ1.style.display = '';
        if (labelJ2) labelJ2.style.display = '';

        const pv1 = vaisseau1 ? vaisseau1.pointsDeVie : 0;
        const pv2 = vaisseau2 ? vaisseau2.pointsDeVie : 0;

        coeursJ1.forEach((c, i) => {
            c.style.display = i < pv1 ? 'inline-block' : 'none';
        });

        if (coeursJ2) {
            coeursJ2.forEach((c, i) => {
                c.style.display = i < pv2 ? 'inline-block' : 'none';
            });
        }
    }
}


export function hideLifeBars() {
    setDisplay(barreVieJ1, 'none');
    setDisplay(barreVieJ2, 'none');
}

// ========================
//  Gestion écran de score
// ========================

let scoreMode = 'solo';
let scoreScrollOffset = 0;

export function resetScoreView() {
    scoreMode = 'solo';
    scoreScrollOffset = 0;
}

export function setScoreMode(mode) {
    if (mode === 'solo' || mode === 'duo') {
        scoreMode = mode;
        scoreScrollOffset = 0;
    }
}

export function scrollScore(deltaY) {
    scoreScrollOffset += deltaY * 0.5;
    if (scoreScrollOffset < 0) scoreScrollOffset = 0;
}

export function handleScoreScreenClick(canvas, event, setEtat, ETAT) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const cardHeight = 520;
    const cardY = (canvas.height - cardHeight) / 2;
    const tabY = cardY + 45;

    const centerX = canvas.width / 2;
    const tabOffset = 60;

    const soloX = centerX - tabOffset;
    const duoX = centerX + tabOffset;

    // Zone verticale cliquable des onglets
    if (mouseY >= tabY - 20 && mouseY <= tabY + 10) {
        if (Math.abs(mouseX - soloX) < 50) {
            setScoreMode('solo');
            return;
        }

        if (Math.abs(mouseX - duoX) < 50) {
            setScoreMode('duo');
            return;
        }
    }

    // Sinon retour menu
    setEtat(ETAT.MENU);
}

export function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function drawScoreScreen(ctx, canvas) {
    ctx.save();

    const scores = getScores(scoreMode);

    const cardWidth = 440;
    const cardHeight = 520;

    const cardX = (canvas.width - cardWidth) / 2;
    const cardY = (canvas.height - cardHeight) / 2;

    const contentPadding = 40;
    const lineHeight = 22;

    // =========================
    // ===== FOND CARTE ========
    // =========================
    ctx.fillStyle = '#1f2235';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    ctx.fill();

    // =========================
    // ===== ONGLET TABS =======
    // =========================

    const centerX = canvas.width / 2;
    const tabY = cardY + 45;

    const tabOffset = 60; // Distance par rapport au centre

    const soloX = centerX - tabOffset;
    const duoX = centerX + tabOffset;

    ctx.font = '18px Arial';
    ctx.textAlign = 'center';

    ctx.fillStyle = scoreMode === 'solo' ? '#f1c40f' : 'white';
    ctx.fillText('SOLO', soloX, tabY);

    ctx.fillStyle = scoreMode === 'duo' ? '#f1c40f' : 'white';
    ctx.fillText('DUO', duoX, tabY);

    // =========================
    // ===== TITRE ============
    // =========================
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('CLASSEMENT', centerX, cardY + 90);

    // =========================
    // ===== ZONE CONTENU =====
    // =========================

    const contentX = cardX + contentPadding;
    const contentY = cardY + 110;
    const contentWidth = cardWidth - contentPadding * 2;
    const contentHeight = cardHeight - 170;

    let totalContentHeight = 0;

    scores.forEach(score => {

        if (scoreMode === 'solo') {
            totalContentHeight += 25;
            totalContentHeight += score.niveaux.length * lineHeight;
            totalContentHeight += 35;
        }

        else if (scoreMode === 'duo') {
            totalContentHeight += 25;
            totalContentHeight += score.niveaux.length * (lineHeight * 2);
            totalContentHeight += lineHeight * 2;
            totalContentHeight += 20;
        }
    });

    const maxScroll = Math.max(0, totalContentHeight - contentHeight);

    if (scoreScrollOffset > maxScroll) scoreScrollOffset = maxScroll;
    if (scoreScrollOffset < 0) scoreScrollOffset = 0;

    ctx.beginPath();
    ctx.rect(contentX, contentY, contentWidth, contentHeight);
    ctx.clip();

    ctx.textAlign = 'left';

    let y = contentY + 20 - scoreScrollOffset;

    scores.forEach((score, index) => {

        // ================= SOLO =================
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

        // ================= DUO =================
        else if (scoreMode === 'duo') {

            const joueur1 = score.joueurs[0];
            const joueur2 = score.joueurs[1];

            if (!joueur1 || !joueur2) return;

            ctx.font = '18px Arial';

            ctx.fillStyle = 'white';
            ctx.fillText(`${index + 1}.`, contentX, y);

            const numberWidth = ctx.measureText(`${index + 1}. `).width;

            ctx.fillStyle = '#3498db';
            ctx.fillText(joueur1.pseudo, contentX + numberWidth, y);

            const pseudoWidth = ctx.measureText(joueur1.pseudo).width;

            ctx.fillStyle = 'white';
            ctx.fillText(" & ", contentX + numberWidth + pseudoWidth, y);

            const andWidth = ctx.measureText(" & ").width;

            ctx.fillStyle = '#e74c3c';
            ctx.fillText(
                joueur2.pseudo,
                contentX + numberWidth + pseudoWidth + andWidth,
                y
            );

            y += 25;

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

    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(
        'Molette pour scroller • Clique pour revenir',
        centerX,
        cardY + cardHeight - 20
    );
    ctx.restore();
}
