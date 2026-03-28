// js/ui/goalReplay.js
// Contrôleur de replay de but: capture les dernières frames puis les rejoue.
(function () {
    function createGoalReplayController(config) {
        const {
            scene,
            ball,
            myTeam,
            opponentTeam,
            cameras,
            maxReplayTimeMs = 5000,
            replayFrameStepMs = 1000 / 60,
            onReplayEnd
        } = config || {};

        let gameState = "playing"; // playing | replayBanner | replay
        let pendingGoalReset = null;

        const replayBuffer = [];
        let replayFrames = [];
        let replayFrameIndex = 0;
        let replayPlaybackCursor = 0;
        let replayLastStepTime = 0;
        let replayPaused = false;
        let replaySpeed = 1; // 1 forward, -1 rewind

        const replayCameras = {
            tv: null,
            ball: null,
            player: null,
            cinematic: null,
            blend: null
        };

        const cameraModes = ["tv", "ball", "player", "cinematic"];
        let currentCameraIndex = 0;
        let previousActiveCamera = null;
        let skipButton = null;

        function ensureSkipButton() {
            if (skipButton) return;

            skipButton = document.getElementById("replay-skip-btn");
            if (!skipButton) {
                skipButton = document.createElement("button");
                skipButton.id = "replay-skip-btn";
                skipButton.type = "button";
                skipButton.textContent = "Passer le replay";
                document.body.appendChild(skipButton);
            }

            skipButton.addEventListener("click", () => {
                if (gameState === "replay" || gameState === "replayBanner") {
                    finalizeGoal();
                }
            });
        }

        function setSkipButtonVisible(visible) {
            if (!skipButton) return;
            skipButton.classList.toggle("replay-skip-btn--show", !!visible);
        }

        function createReplayCameras() {
            if (!scene || replayCameras.blend) return;

            replayCameras.tv = new BABYLON.FreeCamera("replayTvCam", new BABYLON.Vector3(0, 30, -60), scene);
            replayCameras.ball = new BABYLON.FreeCamera("replayBallCam", new BABYLON.Vector3(0, 10, -10), scene);
            replayCameras.player = new BABYLON.FreeCamera("replayPlayerCam", new BABYLON.Vector3(0, 5, -10), scene);

            replayCameras.cinematic = new BABYLON.ArcRotateCamera(
                "replayCinematicCam",
                0,
                Math.PI / 2.4,
                12,
                BABYLON.Vector3.Zero(),
                scene
            );

            // Caméra de rendu finale qui fait une transition douce vers chaque angle.
            replayCameras.blend = new BABYLON.FreeCamera("replayBlendCam", new BABYLON.Vector3(0, 20, -40), scene);
        }

        function installReplayControls() {
            window.addEventListener("keydown", (e) => {
                if (gameState !== "replay") return;

                if (e.key === "p" || e.key === "P") {
                    replayPaused = !replayPaused;
                }

                if (e.key === "ArrowLeft") {
                    replaySpeed = -1;
                }

                if (e.key === "ArrowRight") {
                    replaySpeed = 1;
                }
            });
        }

        function getReplayCameraTargets(frame, t) {
            const ballPos = frame.ball;
            const trackedPlayer = resolveTrackedPlayer(frame);
            const actionMid = trackedPlayer && trackedPlayer.position
                ? BABYLON.Vector3.Lerp(trackedPlayer.position, ballPos, 0.5)
                : ballPos;
            const sideOffset = Math.sin(t * Math.PI * 2) * 3;

            replayCameras.tv.position.copyFrom(ballPos.add(new BABYLON.Vector3(0, 28, -55)));
            replayCameras.tv.setTarget(ballPos);

            replayCameras.ball.position.copyFrom(ballPos.add(new BABYLON.Vector3(0, 5, -10)));
            replayCameras.ball.setTarget(ballPos);

            if (trackedPlayer && trackedPlayer.position) {
                const playerOffset = new BABYLON.Vector3(sideOffset, 3, -8);
                replayCameras.player.position.copyFrom(trackedPlayer.position.add(playerOffset));
            } else {
                replayCameras.player.position.copyFrom(ballPos.add(new BABYLON.Vector3(0, 4, -8)));
            }
            replayCameras.player.setTarget(actionMid);

            if (t < 0.5) {
                replayCameras.cinematic.alpha += 0.005;
            } else {
                replayCameras.cinematic.alpha += 0.02;
            }

            if (t > 0.7) {
                // En fin d'action, on remonte la caméra pour éviter les joueurs qui masquent le ballon.
                replayCameras.cinematic.beta = Math.PI / 2.8;
            } else {
                replayCameras.cinematic.beta = Math.PI / 2.4 + Math.sin(t * Math.PI) * 0.1;
            }

            // Replay en 3 phases: tir -> trajectoire -> but.
            if (t < 0.25) {
                replayCameras.cinematic.radius = 8;
                if (trackedPlayer && trackedPlayer.position) {
                    replayCameras.cinematic.target.copyFrom(trackedPlayer.position);
                } else {
                    replayCameras.cinematic.target.copyFrom(actionMid);
                }
            } else if (t < 0.7) {
                replayCameras.cinematic.radius = 10;
                replayCameras.cinematic.target.copyFrom(ballPos);
            } else {
                replayCameras.cinematic.radius = 6;
                const goalFocus = BABYLON.Vector3.Lerp(ballPos, actionMid, 0.7);
                if (t > 0.8) {
                    // Focus but: on privilégie la balle pour une lecture claire de l'action.
                    replayCameras.cinematic.target.copyFrom(ballPos);
                } else {
                    const avoidOffset = new BABYLON.Vector3(4, 0, 0);
                    replayCameras.cinematic.target.copyFrom(goalFocus.add(avoidOffset));
                }
            }

            // Clamp de sécurité pour éviter une caméra trop proche ou trop lointaine.
            if (replayCameras.cinematic.radius < 6) replayCameras.cinematic.radius = 6;
            if (replayCameras.cinematic.radius > 12) replayCameras.cinematic.radius = 12;

            const mode = cameraModes[currentCameraIndex];
            let targetPos = replayCameras.tv.position;
            let targetLookAt = ballPos;

            if (mode === "ball") {
                targetPos = replayCameras.ball.position;
            } else if (mode === "player") {
                targetPos = replayCameras.player.position;
                targetLookAt = actionMid;
            } else if (mode === "cinematic") {
                targetPos = replayCameras.cinematic.position;
                targetLookAt = actionMid;
            }

            return { targetPos, targetLookAt };
        }

        function updateReplayCamera(frame, replayT) {
            if (!scene || !replayCameras.blend || !frame) return;

            if (replayFrameIndex > 0 && replayFrameIndex % 120 === 0) {
                currentCameraIndex = (currentCameraIndex + 1) % cameraModes.length;
            }

            const t = Number.isFinite(replayT)
                ? replayT
                : (replayFrames.length > 0 ? replayFrameIndex / replayFrames.length : 0);
            const { targetPos, targetLookAt } = getReplayCameraTargets(frame, t);
            const lerpFactor = 0.1 + (t * 0.15);

            replayCameras.blend.position = BABYLON.Vector3.Lerp(
                replayCameras.blend.position,
                targetPos,
                lerpFactor
            );
            replayCameras.blend.setTarget(targetLookAt);

            scene.activeCamera = replayCameras.blend;
        }

        function clearReplayState() {
            replayFrames = [];
            replayFrameIndex = 0;
            replayPlaybackCursor = 0;
            replayLastStepTime = 0;
            replayPaused = false;
            replaySpeed = 1;
        }

        function capturePlayerState(player) {
            return {
                position: player.position.clone(),
                currentAnim: player.currentAnim || "idle",
                wobbleTime: player.wobbleTime || 0,
                facingDirection: player.facingDirection ? player.facingDirection.clone() : null,
                modelRotationY: player.model ? player.model.rotation.y : null,
                modelRotationX: player.model ? player.model.rotation.x : null
            };
        }

        function applyPlayerState(player, snapshot) {
            if (!player || !snapshot) return;

            if (snapshot.position) {
                player.position.copyFrom(snapshot.position);
            }

            if (snapshot.facingDirection && player.facingDirection) {
                player.facingDirection.copyFrom(snapshot.facingDirection);
            }

            if (typeof snapshot.wobbleTime === "number") {
                player.wobbleTime = snapshot.wobbleTime;
            }

            if (player.model) {
                if (typeof snapshot.modelRotationY === "number") {
                    player.model.rotation.y = snapshot.modelRotationY;
                }
                if (typeof snapshot.modelRotationX === "number") {
                    player.model.rotation.x = snapshot.modelRotationX;
                }
            }

            if (typeof player.playAnimation === "function") {
                player.playAnimation(snapshot.currentAnim || "idle");
            }
        }

        function finalizeGoal() {
            if (!pendingGoalReset) return;

            const result = pendingGoalReset;
            pendingGoalReset = null;
            clearReplayState();
            gameState = "playing";

            if (scene && previousActiveCamera) {
                scene.activeCamera = previousActiveCamera;
            }
            previousActiveCamera = null;

            if (typeof window.hideTournamentOverlayBanner === "function") {
                window.hideTournamentOverlayBanner();
            }

            if (typeof onReplayEnd === "function") {
                onReplayEnd(result);
            }

            setSkipButtonVisible(false);
        }

        function captureFrame(now) {
            if (gameState !== "playing") return;
            if (!ball || !ball.position || !myTeam || !opponentTeam) return;

            const lastKicker = ball.lastKicker || null;
            let lastKickerTeam = null;
            let lastKickerIndex = -1;

            if (lastKicker) {
                lastKickerIndex = myTeam.players.indexOf(lastKicker);
                if (lastKickerIndex >= 0) {
                    lastKickerTeam = "my";
                } else {
                    lastKickerIndex = opponentTeam.players.indexOf(lastKicker);
                    if (lastKickerIndex >= 0) {
                        lastKickerTeam = "opponent";
                    }
                }
            }

            replayBuffer.push({
                time: now,
                ball: ball.position.clone(),
                ballRotation: ball.rotation ? ball.rotation.clone() : null,
                players: myTeam.players.map(capturePlayerState),
                opponents: opponentTeam.players.map(capturePlayerState),
                lastKickerTeam,
                lastKickerIndex
            });

            while (replayBuffer.length > 0 && now - replayBuffer[0].time > maxReplayTimeMs) {
                replayBuffer.shift();
            }
        }

        function applyFrame(frame) {
            if (!frame) return;

            ball.position.copyFrom(frame.ball);
            if (frame.ballRotation && ball.rotation) {
                ball.rotation.copyFrom(frame.ballRotation);
            }
            if (ball.velocity) {
                ball.velocity.set(0, 0, 0);
            }

            myTeam.players.forEach((p, i) => {
                applyPlayerState(p, frame.players[i]);
            });

            opponentTeam.players.forEach((p, i) => {
                applyPlayerState(p, frame.opponents[i]);
            });

            if (cameras && cameras.cameraTargetNode) {
                cameras.cameraTargetNode.position.copyFrom(frame.ball);
            }
        }

        function applyInterpolatedPlayerState(player, snapshotA, snapshotB, t) {
            if (!player || !snapshotA || !snapshotB) return;

            const pos = BABYLON.Vector3.Lerp(snapshotA.position, snapshotB.position, t);
            player.position.copyFrom(pos);

            if (player.facingDirection && snapshotA.facingDirection && snapshotB.facingDirection) {
                const facing = BABYLON.Vector3.Lerp(snapshotA.facingDirection, snapshotB.facingDirection, t);
                if (facing.lengthSquared() > 0.000001) facing.normalize();
                player.facingDirection.copyFrom(facing);
            }

            if (typeof snapshotA.wobbleTime === "number" && typeof snapshotB.wobbleTime === "number") {
                player.wobbleTime = BABYLON.Scalar.Lerp(snapshotA.wobbleTime, snapshotB.wobbleTime, t);
            }

            if (player.model) {
                if (typeof snapshotA.modelRotationY === "number" && typeof snapshotB.modelRotationY === "number") {
                    player.model.rotation.y = BABYLON.Scalar.Lerp(snapshotA.modelRotationY, snapshotB.modelRotationY, t);
                }
                if (typeof snapshotA.modelRotationX === "number" && typeof snapshotB.modelRotationX === "number") {
                    player.model.rotation.x = BABYLON.Scalar.Lerp(snapshotA.modelRotationX, snapshotB.modelRotationX, t);
                }
            }

            if (typeof player.playAnimation === "function") {
                const anim = t < 0.5 ? snapshotA.currentAnim : snapshotB.currentAnim;
                player.playAnimation(anim || "idle");
            }
        }

        function applyInterpolatedFrame(frameA, frameB, t) {
            if (!frameA || !frameB) return;

            const interpolatedBall = BABYLON.Vector3.Lerp(frameA.ball, frameB.ball, t);
            ball.position.copyFrom(interpolatedBall);

            if (frameA.ballRotation && frameB.ballRotation && ball.rotation) {
                const interpolatedRot = BABYLON.Vector3.Lerp(frameA.ballRotation, frameB.ballRotation, t);
                ball.rotation.copyFrom(interpolatedRot);
            }

            if (ball.velocity) {
                ball.velocity.set(0, 0, 0);
            }

            myTeam.players.forEach((p, i) => {
                applyInterpolatedPlayerState(p, frameA.players[i], frameB.players[i], t);
            });

            opponentTeam.players.forEach((p, i) => {
                applyInterpolatedPlayerState(p, frameA.opponents[i], frameB.opponents[i], t);
            });

            if (cameras && cameras.cameraTargetNode) {
                cameras.cameraTargetNode.position.copyFrom(interpolatedBall);
            }
        }

        function resolveTrackedPlayer(frame) {
            if (!frame) return myTeam.players[0] || null;

            if (frame.lastKickerTeam === "my" && Number.isInteger(frame.lastKickerIndex)) {
                return myTeam.players[frame.lastKickerIndex] || null;
            }

            if (frame.lastKickerTeam === "opponent" && Number.isInteger(frame.lastKickerIndex)) {
                return opponentTeam.players[frame.lastKickerIndex] || null;
            }

            return myTeam.players[0] || null;
        }

        function startReplay() {
            replayFrames = replayBuffer.slice();

            if (replayFrames.length === 0) {
                finalizeGoal();
                return;
            }

            previousActiveCamera = scene ? scene.activeCamera : null;
            gameState = "replay";
            replayFrameIndex = 0;
            replayPlaybackCursor = 0;
            replayLastStepTime = 0;
            replayPaused = false;
            replaySpeed = 1;
            currentCameraIndex = 0;
            setSkipButtonVisible(true);

            if (replayFrames[0]) {
                updateReplayCamera(replayFrames[0]);
            }
        }

        function update(now) {
            if (gameState === "replayBanner") {
                // On fige le gameplay pendant le petit intro "REPLAY".
                setSkipButtonVisible(true);
                return true;
            }

            if (gameState !== "replay") return false;

            setSkipButtonVisible(true);

            if (replayFrames.length === 0) {
                finalizeGoal();
                return true;
            }

            if (replayLastStepTime && now - replayLastStepTime < replayFrameStepMs) {
                return true;
            }

            const frameIndexA = Math.floor(replayPlaybackCursor);
            const frameIndexB = Math.min(frameIndexA + 1, replayFrames.length - 1);
            const alpha = replayPlaybackCursor - frameIndexA;

            const frameA = replayFrames[frameIndexA];
            const frameB = replayFrames[frameIndexB];
            if (!frameA || !frameB) {
                finalizeGoal();
                return true;
            }

            const t = replayFrames.length > 0 ? replayPlaybackCursor / replayFrames.length : 0;
            applyInterpolatedFrame(frameA, frameB, alpha);

            const blendedCameraFrame = {
                ...frameA,
                ball: BABYLON.Vector3.Lerp(frameA.ball, frameB.ball, alpha)
            };
            updateReplayCamera(blendedCameraFrame, t);

            replayFrameIndex = frameIndexA;

            if (!replayPaused) {
                const isGoalMoment = t > 0.8;
                const speedMultiplier = isGoalMoment ? 0.3 : 1;
                replayPlaybackCursor += replaySpeed * speedMultiplier;
            }

            if (replayPlaybackCursor < 0) replayPlaybackCursor = 0;
            replayLastStepTime = now;

            if (replayPlaybackCursor >= replayFrames.length) {
                finalizeGoal();
            }

            return true;
        }

        function triggerGoal(payload) {
            if (gameState !== "playing") return false;
            if (pendingGoalReset) return false;

            pendingGoalReset = payload;
            setSkipButtonVisible(true);

            if (typeof window.showTournamentOverlayBanner === "function") {
                gameState = "replayBanner";
                window.showTournamentOverlayBanner("Replay", {
                    durationMs: 1800,
                    textAnimationDurationMs: 1800,
                    forceFinaleLike: true,
                    showDelayMs: 80,
                    visibleWindowMs: 1050,
                    onComplete: function () {
                        // Le but a pu être annulé entre-temps.
                        if (!pendingGoalReset) {
                            gameState = "playing";
                            return;
                        }
                        startReplay();
                    }
                });
            } else {
                startReplay();
            }

            return true;
        }

        function isPlaying() {
            return gameState === "playing";
        }

        function getState() {
            return gameState;
        }

        createReplayCameras();
        ensureSkipButton();
        setSkipButtonVisible(false);
        if (!window.__goalReplayControlsInstalled) {
            installReplayControls();
            window.__goalReplayControlsInstalled = true;
        }

        return {
            captureFrame,
            update,
            triggerGoal,
            isPlaying,
            getState
        };
    }

    window.createGoalReplayController = createGoalReplayController;
})();
