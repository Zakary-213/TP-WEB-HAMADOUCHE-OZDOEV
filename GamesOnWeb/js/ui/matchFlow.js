// js/ui/matchFlow.js
// Gestion "mi-temps 1 / mi-temps 2 -> fin du match"
// Fait l'affichage et pilote pause/reprise via un callback.

(function () {
    function createMatchFlow(config) {
        const {
            halfSeconds,
            halftimePauseSeconds,
            setGameplayPaused,
            myTeam,
            opponentTeam,
            cameras,
            ball,
            basePlayer,
            setActivePlayerFn
        } = config || {};

        const scoreboard = window.gameScoreboard;

        const halftimeOverlay = document.getElementById("halftime-overlay");
        const halftimeCountdownEl = document.getElementById("halftime-countdown");

        const matchEndOverlay = document.getElementById("match-end-overlay");
        const matchEndResultEl = document.getElementById("match-end-result");
        const matchEndScoreEl = document.getElementById("match-end-score");

        let stage = 0; // 0: phase 1 en cours, 1: pause mi-temps 1, 2: phase 2 en cours, 3: fin de match
        let halftimeCountdownInterval = null;
        let halftimeResumeTimeout = null;

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
            // overlay mi-temps est visible pendant la pause uniquement

            halftimeResumeTimeout = window.setTimeout(function () {
                // reprise du jeu (phase 2)
                stage = 2;

                // Reset de l'endurance de tous les joueurs à la reprise de la 2ème mi-temps
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
            }, halftimePauseSeconds * 1000);
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
        }

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
                hideHalftimeOverlay();
            }
        };
    }

    window.createMatchFlow = createMatchFlow;
})();

