// js/ui/matchFlow.js
// Gestion "mi-temps 1 / mi-temps 2 -> fin du match"
// Fait l'affichage et pilote pause/reprise via un callback.

import { saveScoreToDB } from "../../../JeuCanvas/js/score/scoreStorage";

(function () {
    function createMatchFlow(config) {
        const {
            halfSeconds,
            halftimePauseSeconds,
            mode,
            tournamentStage,
            setGameplayPaused,
            myTeam,
            opponentTeam,
            cameras,
            ball,
            basePlayer,
            setActivePlayerFn,
            onContinueTournament,
            onQuitMatch
        } = config || {};

        const scoreboard = window.gameScoreboard;

        const halftimeOverlay = document.getElementById("halftime-overlay");
        const halftimeCountdownEl = document.getElementById("halftime-countdown");
        const halftimeContinueBtn = document.getElementById("halftime-continue-btn");

        const matchEndOverlay = document.getElementById("match-end-overlay");
        const matchEndResultEl = document.getElementById("match-end-result");
        const matchEndScoreEl = document.getElementById("match-end-score");
        const matchEndContinueBtn = document.getElementById("match-end-continue-btn");
        const matchEndQuitBtn = document.getElementById("match-end-quit-btn");

        let stage = 0; // 0: phase 1 en cours, 1: pause mi-temps 1, 2: phase 2 en cours, 3: fin de match
        let halftimeCountdownInterval = null;
        let halftimeResumeTimeout = null;
        let halftimePadPollInterval = null;
        let lastHalftimeSkipPressed = false;
        let matchEndPadPollInterval = null;
        let lastMatchEndConfirmPressed = false;
        let lastMatchEndMoveDir = 0;
        let matchEndSelectedIndex = 0;

        function getVisibleMatchEndButtons() {
            const buttons = [];

            if (matchEndContinueBtn && matchEndContinueBtn.style.display !== "none") {
                buttons.push(matchEndContinueBtn);
            }

            if (matchEndQuitBtn && matchEndQuitBtn.style.display !== "none") {
                buttons.push(matchEndQuitBtn);
            }

            return buttons;
        }

        function updateMatchEndButtonSelection() {
            const visibleButtons = getVisibleMatchEndButtons();
            if (!visibleButtons.length) return;

            const maxIndex = visibleButtons.length - 1;
            if (matchEndSelectedIndex < 0) matchEndSelectedIndex = 0;
            if (matchEndSelectedIndex > maxIndex) matchEndSelectedIndex = maxIndex;

            visibleButtons.forEach(function (btn, index) {
                btn.classList.toggle("overlay-action-btn--selected", index === matchEndSelectedIndex);
            });

            saveScoreToDB();
        }

        function moveMatchEndSelection(dir) {
            const visibleButtons = getVisibleMatchEndButtons();
            if (visibleButtons.length <= 1) return;

            matchEndSelectedIndex += dir;
            if (matchEndSelectedIndex < 0) matchEndSelectedIndex = visibleButtons.length - 1;
            if (matchEndSelectedIndex >= visibleButtons.length) matchEndSelectedIndex = 0;

            updateMatchEndButtonSelection();
        }

        function confirmMatchEndSelection() {
            const visibleButtons = getVisibleMatchEndButtons();
            if (!visibleButtons.length) return;

            const selected = visibleButtons[matchEndSelectedIndex] || visibleButtons[0];
            if (selected === matchEndContinueBtn) {
                handleMatchEndContinue();
            } else {
                handleMatchEndQuit();
            }
        }

        function handleMatchEndKeyboard(e) {
            if (stage !== 3) return;
            if (!matchEndOverlay || matchEndOverlay.style.display === "none") return;

            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                moveMatchEndSelection(-1);
                e.preventDefault();
                return;
            }

            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                moveMatchEndSelection(1);
                e.preventDefault();
                return;
            }

            if (e.key === "x" || e.key === "X" || e.key === "Enter" || e.key === " ") {
                confirmMatchEndSelection();
                e.preventDefault();
            }
        }

        function stopCountdown() {
            if (halftimeCountdownInterval) {
                clearInterval(halftimeCountdownInterval);
                halftimeCountdownInterval = null;
            }
        }

        function resetBallToCenter() {
            if (!ball) return;

            if (ball.velocity) ball.velocity.set(0, 0, 0);
            ball.restartLocked = false;
            ball.restartTaker = null;
            ball.isOutAnimationPlaying = false;
            ball.outAnimationFinished = false;
            ball.isOutOfPlay = false;
            ball.outTimer = 0;
            ball.outDecision = null;
            ball.outExitPosition = null;

            ball.position.x = 0;
            ball.position.y = 0.65;
            ball.position.z = 0;
        }

        function recenterToBasePlayer() {
            if (myTeam && myTeam.resetPositions) myTeam.resetPositions();
            if (opponentTeam && opponentTeam.resetPositions) opponentTeam.resetPositions();

            if (setActivePlayerFn && basePlayer) {
                setActivePlayerFn(basePlayer);
            }

            if (cameras?.fpvCamera && basePlayer) {
                cameras.fpvCamera.parent = basePlayer;
            }

            if (cameras?.cameraTargetNode && basePlayer?.position) {
                cameras.cameraTargetNode.position.copyFrom(basePlayer.position);
            }
        }

        function cleanupRestartStateIfAny() {
            // resetRestartState est défini par js/models/restartLogic.js
            if (typeof resetRestartState === "function") {
                resetRestartState();
            }
        }

        function hideHalftimeOverlay() {
            if (halftimeOverlay) halftimeOverlay.style.display = "none";
        }

        function showHalftimeOverlay() {
            if (!halftimeOverlay) return;
            halftimeOverlay.style.display = "block";
            halftimeOverlay.classList.remove("halftime-overlay--show");
            // force reflow pour relancer l'animation
            void halftimeOverlay.offsetWidth;
            halftimeOverlay.classList.add("halftime-overlay--show");
        }

        function startHalftimeCountdown() {
            if (!halftimeCountdownEl) return;

            stopCountdown();

            // petit "beat" immédiat
            const initial = Math.max(0, halftimePauseSeconds);
            halftimeCountdownEl.textContent = String(initial);
            halftimeCountdownEl.classList.remove("halftime-countdown--beat", "halftime-countdown--danger");
            halftimeCountdownEl.classList.add("halftime-countdown--beat");
            halftimeCountdownEl.classList.toggle(
                "halftime-countdown--danger",
                halftimePauseSeconds <= 3
            );

            let remaining = halftimePauseSeconds;
            halftimeCountdownInterval = setInterval(function () {
                remaining -= 1;
                const value = Math.max(0, remaining);

                if (halftimeCountdownEl) {
                    halftimeCountdownEl.textContent = String(value);
                    halftimeCountdownEl.classList.remove("halftime-countdown--beat");
                    void halftimeCountdownEl.offsetWidth;
                    halftimeCountdownEl.classList.add("halftime-countdown--beat");

                    halftimeCountdownEl.classList.toggle(
                        "halftime-countdown--danger",
                        value <= 3
                    );
                }

                if (value <= 0) {
                    stopCountdown();
                }
            }, 1000);
        }

        function stopTimerAt(seconds) {
            if (!scoreboard) return;
            if (scoreboard.stopTimer) scoreboard.stopTimer();
            scoreboard.matchTime = seconds;
            if (scoreboard.updateTimerDisplay) scoreboard.updateTimerDisplay();
        }

        function startTimerIfPossible() {
            if (!scoreboard) return;
            if (scoreboard.startTimer) scoreboard.startTimer();
        }

        function stopMatchEndGamepadPolling() {
            if (matchEndPadPollInterval) {
                clearInterval(matchEndPadPollInterval);
                matchEndPadPollInterval = null;
            }
            lastMatchEndConfirmPressed = false;
            lastMatchEndMoveDir = 0;
        }

        function startMatchEndGamepadPolling() {
            stopMatchEndGamepadPolling();

            matchEndPadPollInterval = setInterval(function () {
                if (stage !== 3) return;
                if (!matchEndOverlay || matchEndOverlay.style.display === "none") return;

                const visibleButtons = getVisibleMatchEndButtons();
                if (!visibleButtons.length) {
                    lastMatchEndConfirmPressed = false;
                    lastMatchEndMoveDir = 0;
                    return;
                }

                const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
                const pad = pads.find(function (p) { return p && p.connected; }) || null;
                if (!pad || !pad.buttons) {
                    lastMatchEndConfirmPressed = false;
                    lastMatchEndMoveDir = 0;
                    return;
                }

                const binds = window.inputBindings && typeof window.inputBindings.getGamepadBindings === "function"
                    ? window.inputBindings.getGamepadBindings()
                    : { shoot: 0 };

                const shootIndex = Number.isInteger(binds.shoot) ? binds.shoot : 0;
                const shootBtn = pad.buttons[shootIndex];
                const shootPressed = !!(shootBtn && shootBtn.pressed);

                const leftPressed = !!(pad.buttons[14] && pad.buttons[14].pressed);
                const rightPressed = !!(pad.buttons[15] && pad.buttons[15].pressed);
                const upPressed = !!(pad.buttons[12] && pad.buttons[12].pressed);
                const downPressed = !!(pad.buttons[13] && pad.buttons[13].pressed);
                const axisX = Array.isArray(pad.axes) ? Number(pad.axes[0] || 0) : 0;
                const axisY = Array.isArray(pad.axes) ? Number(pad.axes[1] || 0) : 0;

                let moveDir = 0;
                if (leftPressed || upPressed || axisX < -0.55 || axisY < -0.55) {
                    moveDir = -1;
                } else if (rightPressed || downPressed || axisX > 0.55 || axisY > 0.55) {
                    moveDir = 1;
                }

                if (moveDir !== 0 && lastMatchEndMoveDir === 0) {
                    moveMatchEndSelection(moveDir);
                }

                lastMatchEndMoveDir = moveDir;

                if (shootPressed && !lastMatchEndConfirmPressed) {
                    confirmMatchEndSelection();
                }

                lastMatchEndConfirmPressed = shootPressed;
            }, 80);
        }

        function stopHalftimeGamepadPolling() {
            if (halftimePadPollInterval) {
                clearInterval(halftimePadPollInterval);
                halftimePadPollInterval = null;
            }
            lastHalftimeSkipPressed = false;
        }

        function startHalftimeGamepadPolling() {
            stopHalftimeGamepadPolling();

            halftimePadPollInterval = setInterval(function () {
                if (stage !== 1) return;

                const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
                const pad = pads.find(function (p) { return p && p.connected; }) || null;
                if (!pad || !pad.buttons) {
                    lastHalftimeSkipPressed = false;
                    return;
                }

                const binds = window.inputBindings && typeof window.inputBindings.getGamepadBindings === "function"
                    ? window.inputBindings.getGamepadBindings()
                    : { shoot: 0 };

                const shootIndex = Number.isInteger(binds.shoot) ? binds.shoot : 0;
                const shootBtn = pad.buttons[shootIndex];
                const shootPressed = !!(shootBtn && shootBtn.pressed);

                if (shootPressed && !lastHalftimeSkipPressed) {
                    resumeSecondHalf();
                }

                lastHalftimeSkipPressed = shootPressed;
            }, 80);
        }

        function resumeSecondHalf() {
            if (stage !== 1) return;

            if (halftimeResumeTimeout) {
                clearTimeout(halftimeResumeTimeout);
                halftimeResumeTimeout = null;
            }

            stage = 2;

            const resetTeamStamina = (team) => {
                if (!team || !team.players) return;
                team.players.forEach(p => {
                    if (!p) return;
                    const max = p.maxStamina || 1;
                    p.stamina = max;
                });
            };

            resetTeamStamina(myTeam);
            resetTeamStamina(opponentTeam);

            if (window.matchAudio && typeof window.matchAudio.playWhistle === "function") {
                window.matchAudio.playWhistle();
            }

            setGameplayPaused(false);
            startTimerIfPossible();
            hideHalftimeOverlay();
            stopCountdown();
            stopHalftimeGamepadPolling();
        }

        function triggerHalftime1() {
            if (stage !== 0) return;
            stage = 1;
            setGameplayPaused(true);

            if (window.matchAudio && typeof window.matchAudio.playWhistle === "function") {
                window.matchAudio.playWhistle();
            }

            stopTimerAt(halfSeconds);
            hideHalftimeOverlay();

            cleanupRestartStateIfAny();
            recenterToBasePlayer();
            resetBallToCenter();

            showHalftimeOverlay();
            startHalftimeCountdown();
            startHalftimeGamepadPolling();
            // overlay mi-temps est visible pendant la pause uniquement

            halftimeResumeTimeout = window.setTimeout(resumeSecondHalf, halftimePauseSeconds * 1000);
        }

        function triggerEndMatch() {
            if (stage !== 2) return;
            stage = 3;
            setGameplayPaused(true);

            if (window.matchAudio && typeof window.matchAudio.playWhistle === "function") {
                window.matchAudio.playWhistle();
            }

            stopTimerAt(halfSeconds * 2);
            hideHalftimeOverlay();
            stopCountdown();

            cleanupRestartStateIfAny();
            recenterToBasePlayer();
            resetBallToCenter();

            if (matchEndOverlay) {
                matchEndOverlay.style.display = "block";
                matchEndOverlay.classList.remove("match-end--you", "match-end--ai", "match-end--draw");
            }

            const youScore = scoreboard?.playerScore ?? 0;
            const aiScore = scoreboard?.aiScore ?? 0;
            const playerWon = youScore > aiScore;

            if (matchEndResultEl && matchEndScoreEl) {
                if (youScore > aiScore) {
                    if (matchEndOverlay) matchEndOverlay.classList.add("match-end--you");
                    matchEndResultEl.textContent = "Victoire !";
                } else if (aiScore > youScore) {
                    if (matchEndOverlay) matchEndOverlay.classList.add("match-end--ai");
                    matchEndResultEl.textContent = "Défaite !";
                } else {
                    if (matchEndOverlay) matchEndOverlay.classList.add("match-end--draw");
                    matchEndResultEl.textContent = "Match nul";
                }

                matchEndScoreEl.textContent = scoreboard && typeof scoreboard.getScorelineText === "function"
                    ? scoreboard.getScorelineText()
                    : `YOU ${youScore} - ${aiScore} IA`;
            }

            // Boutons de fin: tournoi gagne => Continuer + Quitter, sinon Quitter seul.
            if (matchEndContinueBtn) {
                const canContinueTournament = mode === "tournament" && playerWon && tournamentStage !== "finale";
                matchEndContinueBtn.style.display = canContinueTournament ? "inline-flex" : "none";
            }

            if (matchEndQuitBtn) {
                matchEndQuitBtn.style.display = "inline-flex";
            }

            matchEndSelectedIndex = 0;
            updateMatchEndButtonSelection();

            startMatchEndGamepadPolling();
        }

        function handleMatchEndContinue() {
            if (typeof onContinueTournament === "function") {
                onContinueTournament();
                return;
            }
            if (typeof window.quitGame === "function") window.quitGame();
        }

        function handleMatchEndQuit() {
            if (typeof onQuitMatch === "function") {
                onQuitMatch();
                return;
            }
            if (typeof window.quitGame === "function") window.quitGame();
        }

        if (halftimeContinueBtn) {
            halftimeContinueBtn.addEventListener("click", resumeSecondHalf);
        }

        if (matchEndContinueBtn) {
            matchEndContinueBtn.addEventListener("click", handleMatchEndContinue);
        }

        if (matchEndQuitBtn) {
            matchEndQuitBtn.addEventListener("click", handleMatchEndQuit);
        }

        document.addEventListener("keydown", handleMatchEndKeyboard);

        return {
            update: function () {
                // Vérifier que la scène est toujours active (évite les appels orphelins)
                if (!window.gameScene) return;
                
                if (!scoreboard) return;
                if (stage === 0 && scoreboard.matchTime >= halfSeconds) {
                    triggerHalftime1();
                } else if (stage === 2 && scoreboard.matchTime >= halfSeconds * 2) {
                    triggerEndMatch();
                }
            },
            getStage: function () { return stage; },
            cleanup: function () {
                stopCountdown();
                if (halftimeResumeTimeout) {
                    clearTimeout(halftimeResumeTimeout);
                    halftimeResumeTimeout = null;
                }
                stopHalftimeGamepadPolling();
                stopMatchEndGamepadPolling();
                if (halftimeContinueBtn) {
                    halftimeContinueBtn.removeEventListener("click", resumeSecondHalf);
                }
                if (matchEndContinueBtn) {
                    matchEndContinueBtn.removeEventListener("click", handleMatchEndContinue);
                }
                if (matchEndQuitBtn) {
                    matchEndQuitBtn.removeEventListener("click", handleMatchEndQuit);
                }
                document.removeEventListener("keydown", handleMatchEndKeyboard);
                hideHalftimeOverlay();
            }
        };
    }

    window.createMatchFlow = createMatchFlow;
})();

