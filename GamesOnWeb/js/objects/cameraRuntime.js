// js/objects/cameraRuntime.js
// Architecture FIFA 3 couches : Brain → Rig → Camera (broadcastCamera uniquement)
// TPS (touche R) et FPV (touche C) sont inchangées.
(function () {

    // ─────────────────────────────────────────────────────────────────────────────
    // Utilitaire partagé : animation fluide de switch joueur (utilisé par myTeam)
    // ─────────────────────────────────────────────────────────────────────────────
    function animateCameraSwitch(scene, cameras, fromPlayer, toPlayer, duration) {
        if (!fromPlayer || !toPlayer || !cameras?.cameraTargetNode) return;
        var dur = duration !== undefined ? duration : 180;

        var start = cameras.cameraTargetNode.position.clone();
        var end   = toPlayer.position.clone();
        var durationSeconds = dur > 10 ? (dur / 1000) : dur;
        var safeDuration = Math.max(0.05, durationSeconds || 0.25);
        var t = 0;

        var observer = scene.onBeforeRenderObservable.add(function () {
            var dt = scene.getEngine().getDeltaTime() / 1000;
            t += dt / safeDuration;
            if (t >= 1) t = 1;

            var eased  = t * t * (3 - 2 * t);
            var lerped = BABYLON.Vector3.Lerp(start, end, eased);
            cameras.cameraTargetNode.position.copyFrom(lerped);

            if (t === 1) {
                scene.onBeforeRenderObservable.remove(observer);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CONTROLLER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────────────────
    function createCameraRuntimeController(config) {
        var opts             = config || {};
        var scene            = opts.scene;
        var cameras          = opts.cameras;
        var myTeam           = opts.myTeam;
        var selectionIndicator = opts.selectionIndicator;
        var ballRef          = opts.ball || null;
        var tournamentStage  = opts.tournamentStage || "";

        // État interne minimal
        var state = {
            cameraRig       : null,
            shake           : null,
            kickZoom        : null,
            userZoomOffset  : 0,   // décalage ajouté par le slider réglages (en unités de radius)
            time            : 0
        };

        // ── SETUP RIG ────────────────────────────────────────────────────────────
        function setupBroadcastRig() {
            if (!scene || !cameras?.broadcastCamera) return;

            state.cameraRig = new BABYLON.TransformNode("cameraRig", scene);

            if (cameras.cameraTargetNode?.position) {
                state.cameraRig.position.copyFrom(cameras.cameraTargetNode.position);
            }

            // La broadcastCamera suit ce rig, pas le joueur directement.
            cameras.broadcastCamera.lockedTarget = state.cameraRig;
        }

        function getBallNode(ballArg) {
            return ballArg || ballRef;
        }

        // ═════════════════════════════════════════════════════════════════════════
        // COUCHE 1 — CAMERA BRAIN (intelligence / intensité de jeu)
        // ═════════════════════════════════════════════════════════════════════════
        var cameraBrain = {
            intensity   : 0.3,
            lastBallPos : null,
            velocity    : new BABYLON.Vector3(0, 0, 0),

            update: function (ball, dt) {
                if (!ball || !ball.position) return;

                if (this.lastBallPos) {
                    var rawVel = ball.position.subtract(this.lastBallPos);
                    if (dt > 0) {
                        this.velocity = rawVel.scale(1 / dt);
                    }
                }
                this.lastBallPos = ball.position.clone();

                var speed           = this.velocity.length();
                var targetIntensity = BABYLON.Scalar.Clamp(speed / 40, 0, 1);

                this.intensity = BABYLON.Scalar.Lerp(this.intensity, targetIntensity, 0.05);
            }
        };

        // ═════════════════════════════════════════════════════════════════════════
        // COUCHE 2 — FOCUS + ANTICIPATION + FRAMING (calcul du point cible du rig)
        // ═════════════════════════════════════════════════════════════════════════

        /** Focus FIFA : balle toujours prioritaire (85 % lancée / 70 % repos). */
        function computeFocus(ball, player) {
            var ballPos   = ball.position;
            var playerPos = player.position;
            var ballSpeed = ball.velocity
                ? Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.z * ball.velocity.z)
                : 0;
            var ballWeight = ballSpeed > 1.5 ? 0.85 : 0.70;

            return new BABYLON.Vector3(
                ballPos.x * ballWeight + playerPos.x * (1 - ballWeight),
                0,
                ballPos.z * ballWeight + playerPos.z * (1 - ballWeight)
            );
        }

        /**
         * Direction du jeu — lit où va le jeu, pas juste où va la balle.
         * Si la balle est lente/arrêtée, on utilise la direction du joueur.
         */
        function computeGameDirection(ball, player) {
            var vel = ball.velocity
                ? new BABYLON.Vector3(ball.velocity.x, 0, ball.velocity.z)
                : BABYLON.Vector3.Zero();

            // Balle quasi immobile → on lit la direction du joueur actif
            if (vel.length() < 0.1) {
                if (player.facingDirection) {
                    vel = new BABYLON.Vector3(player.facingDirection.x, 0, player.facingDirection.z);
                } else if (player.forward) {
                    vel = new BABYLON.Vector3(player.forward.x, 0, player.forward.z);
                }
            }

            var len = vel.length();
            return len > 0.001 ? vel.scale(1 / len) : new BABYLON.Vector3(1, 0, 0);
        }

        /** Look-ahead : anticipe la trajectoire du ballon. */
        function computeLookAhead(ball) {
            if (!ball.velocity) return BABYLON.Vector3.Zero();
            return new BABYLON.Vector3(ball.velocity.x, 0, ball.velocity.z).scale(0.7);
        }

        // ═════════════════════════════════════════════════════════════════════════
        // SHAKE PRO — uniquement sur événement (but, tir…)
        // ═════════════════════════════════════════════════════════════════════════

        function triggerShake(power) {
            var p = (power !== undefined) ? power : 0.003;
            state.shake = { power: p, time: 0.3 };
        }

        function applyShake(cam, dt) {
            if (!state.shake || !cam) return;
            state.shake.time -= dt;
            cam.alpha += (Math.random() - 0.5) * state.shake.power;
            cam.beta  += (Math.random() - 0.5) * state.shake.power;
            if (state.shake.time <= 0) {
                state.shake = null;
            }
        }

        // ─── KICK ZOOM (effet FIFA : zoom sur tir fort) ────────────────────────────

        /**
         * @param {number} normalizedPower  0 (tir mou) → 1 (tiré à fond)
         */
        function triggerKickZoom(normalizedPower) {
            var p = BABYLON.Scalar.Clamp(normalizedPower, 0, 1);
            // Tir mou : petit zoom (0.60), tir max : grand zoom (0.36)
            var targetFov    = BABYLON.Scalar.Lerp(0.62, 0.36, p);
            // Durée de maintien du zoom : plus le tir est fort, plus on maintient
            var holdDuration = BABYLON.Scalar.Lerp(0.15, 0.55, p);
            state.kickZoom = {
                targetFov    : targetFov,
                holdTimer    : 0,
                holdDuration : holdDuration,
                phase        : "zoomIn"  // zoomIn | hold | zoomOut
            };
        }

        // Alias rétro-compatibilité (goalReplay, matchFlow appellent triggerGoalShake)
        function triggerGoalShake() {
            triggerShake(0.01);
        }

        // ═════════════════════════════════════════════════════════════════════════
        // COUCHE 3 — UPDATE BROADCAST CAMERA (cœur du système FIFA)
        // ═════════════════════════════════════════════════════════════════════════

        function updateBroadcastCamera(activePlayer, ballArg, gameplayPaused) {
            if (!scene || !cameras?.broadcastCamera || !state.cameraRig || !activePlayer?.position) return;

            var cam = cameras.broadcastCamera;
            var rig = state.cameraRig;

            if (scene.activeCamera !== cam) return;

            var dt = scene.getEngine().getDeltaTime() / 1000;
            state.time += dt;

            var ball = getBallNode(ballArg);
            if (!ball || !ball.position) return;

            // FIX : Garantir que l'intro (ou un autre script) n'a pas détourné la cible
            if (cam.lockedTarget !== rig) {
                cam.lockedTarget = rig;
            }

            // ── 1. BRAIN UPDATE ──────────────────────────────────────────────────
            cameraBrain.update(ball, dt);
            var intensity = cameraBrain.intensity;

            // ── 2. FOCUS + DIRECTION DU JEU + FRAMING ────────────────────────────
            var focus = computeFocus(ball, activePlayer);
            var dir   = computeGameDirection(ball, activePlayer);

            // Framing offset : la caméra "regarde" dans la direction du jeu
            // → le ballon n'est jamais au centre exact (feeling TV)
            // FIX #2 : framing DYNAMIQUE selon vitesse et intensité
            var ballSpeedForFraming = cameraBrain.velocity.length();
            var dynamicForward = BABYLON.Scalar.Clamp(4 + ballSpeedForFraming * 0.2, 4, 10);
            var dynamicSide    = 2 + intensity * 2;              // action → plus de décalage côté

            var framingOffset = dir.scale(dynamicForward);
            var lateralOffset = new BABYLON.Vector3(-dir.z, 0, dir.x).scale(dynamicSide);

            // Quand l'action est très proche des lignes de touche, on réduit
            // le décalage latéral pour recentrer davantage le terrain et éviter
            // que la caméra se colle trop aux tribunes.
            var edgeFactor = Math.min(
                1,
                Math.max(
                    Math.abs(focus.x) / 48,
                    Math.abs(focus.z) / 28
                )
            );
            var lateralScale = 0.3 * (1 - 0.6 * edgeFactor); // → plus petit près des bords

            var target = focus
                .add(framingOffset)
                .add(lateralOffset.scale(lateralScale));

            // Limite la zone où la caméra peut "suivre" l'action pour
            // éviter de sortir trop du terrain (et de ne voir que les tribunes)
            var MAX_X = 25;  // terrain ≈ [-50, 50] — réduit selon conseil prof
            var MAX_Z = 15;  // terrain ≈ [-30, 30] — réduit selon conseil prof
            target.x = BABYLON.Scalar.Clamp(target.x, -MAX_X, MAX_X);
            target.z = BABYLON.Scalar.Clamp(target.z, -MAX_Z, MAX_Z);

            // FIX #1 : follow speed DYNAMIQUE (jeu lent → smooth / contre-attaque → colle)
            var ballSpeedFollow = cameraBrain.velocity.length();
            var dynamicFollow   = BABYLON.Scalar.Clamp(6 + intensity * 6 + (ballSpeedFollow / 20), 6, 14);
            var followSpeed     = gameplayPaused ? 3 : dynamicFollow;
            var t = 1 - Math.exp(-followSpeed * dt);

            // FIX #3 : CATCH-UP (caméra en retard → snap brutal — game changer)
            var distance     = BABYLON.Vector3.Distance(rig.position, target);
            var catchupBoost = BABYLON.Scalar.Clamp(distance / 40, 0, 1);
            var finalT       = Math.min(t * (1 + catchupBoost), 1); // clamp à 1 pour éviter overshoot
            rig.position     = BABYLON.Vector3.Lerp(rig.position, target, finalT);

            // ── 4. FRAMING VERTICAL (caméra descend en action, remonte au calme) ─
            rig.position.y = BABYLON.Scalar.Lerp(
                rig.position.y,
                2 + intensity * 2,
                0.05
            );

            // ── 5. ZOOM INTELLIGENT FIFA ─────────────────────────────────────────
            // Zoom intelligent FIFA — demi : plus proche (on évite les structures du stade)
            var ballSpeed  = cameraBrain.velocity.length();
            var zoomOut    = BABYLON.Scalar.Clamp(ballSpeed / 20, 0, 1);
            var radiusTarget;
            if (tournamentStage === "demi") {
                // Stade demi : structures plus hautes → on reste plus proche du terrain
                radiusTarget = BABYLON.Scalar.Clamp(
                    55 + zoomOut * 10 - intensity * 8,
                    45, 70
                );
            } else {
                radiusTarget = BABYLON.Scalar.Clamp(
                    100 + zoomOut * 15 - intensity * 10,
                    75, 115
                );
            }
            // Offset utilisateur (slider zoom dans les réglages) — plus élevé = plus proche
            radiusTarget -= state.userZoomOffset;
            cam.radius = BABYLON.Scalar.Lerp(cam.radius, radiusTarget, t);

            // ── 6. FOV DYNAMIQUE avec KICK ZOOM (effet FIFA sur tir) ────────────
            var baseFovTarget = BABYLON.Scalar.Lerp(0.70, 0.58, intensity);

            if (state.kickZoom) {
                var kz = state.kickZoom;
                if (kz.phase === "zoomIn") {
                    // Zoom avant rapide
                    var zoomInT = 1 - Math.exp(-18 * dt);
                    cam.fov = BABYLON.Scalar.Lerp(cam.fov, kz.targetFov, zoomInT);
                    if (Math.abs(cam.fov - kz.targetFov) < 0.015) kz.phase = "hold";
                } else if (kz.phase === "hold") {
                    // Maintien bref du zoom
                    kz.holdTimer += dt;
                    if (kz.holdTimer >= kz.holdDuration) kz.phase = "zoomOut";
                } else {
                    // Retour doux au FOV normal
                    var zoomOutT = 1 - Math.exp(-2.5 * dt);
                    cam.fov = BABYLON.Scalar.Lerp(cam.fov, baseFovTarget, zoomOutT);
                    if (Math.abs(cam.fov - baseFovTarget) < 0.008) state.kickZoom = null;
                }
            } else {
                cam.fov = BABYLON.Scalar.Lerp(cam.fov, baseFovTarget, t);
            }

            // ── 7. ROTATION avec micro-drift (caméra vivante) ────────────────────
            var alphaBase = -Math.PI / 2;
            var betaBase  = 0.88;  // was 1.05 : aligné avec le nouveau positionnement broadcast
            cam.alpha = BABYLON.Scalar.Lerp(cam.alpha, alphaBase, t);
            cam.beta  = BABYLON.Scalar.Lerp(cam.beta,  betaBase,  t);

            // Micro mouvement TV — sensation de caméra épaule en direct
            cam.alpha += Math.sin(state.time * 0.2) * 0.0008;
            cam.beta  += Math.cos(state.time * 0.15) * 0.0005;
        }

        // Alias interne pour rétro-compat avec l'ancienne signature
        function updateBroadcastCinematic(activePlayer, ballArg, playerMoveVelocity, gameplayPaused) {
            updateBroadcastCamera(activePlayer, ballArg, gameplayPaused);
        }

        // ═════════════════════════════════════════════════════════════════════════
        // GESTION INTENSITÉ (rétro-compat goalReplay / matchFlow)
        // ═════════════════════════════════════════════════════════════════════════

        function setActionIntensity(typeOrValue) {
            if (typeOrValue === "goal") {
                cameraBrain.intensity = 1;
            } else if (typeOrValue === "shot") {
                cameraBrain.intensity = Math.max(cameraBrain.intensity, 0.7);
            } else if (typeOrValue === "duel") {
                cameraBrain.intensity = Math.max(cameraBrain.intensity, 0.55);
            }
        }

        // ═════════════════════════════════════════════════════════════════════════
        // TPS CAMERA — INCHANGÉE (vue du haut, touche R)
        // ═════════════════════════════════════════════════════════════════════════

        function updateCameraFollow(activePlayer) {
            if (!scene || !cameras || !activePlayer || !cameras.cameraTargetNode) return;

            // Suivi joueur fluide classique pour la caméra TPS. NE PAS MODIFIER.
            if (scene.activeCamera === cameras.tpsCamera) {
                var lerped = BABYLON.Vector3.Lerp(
                    cameras.cameraTargetNode.position,
                    activePlayer.position,
                    0.12
                );
                cameras.cameraTargetNode.position.copyFrom(lerped);
            }
        }

        // ═════════════════════════════════════════════════════════════════════════
        // FPV CAMERA — INCHANGÉE (touche C)
        // ═════════════════════════════════════════════════════════════════════════

        function handleCameraToggle(activePlayer) {
            window.setTimeout(function () {
                if (!cameras || typeof cameras.alignFpvToDirection !== "function") return;
                if (!activePlayer || !activePlayer.facingDirection) return;
                cameras.alignFpvToDirection(activePlayer.facingDirection);
            }, 0);
        }

        function updateFpvState(activePlayer) {
            if (!myTeam || !myTeam.players) return;
            myTeam.players.forEach(function (player) {
                if (player) player.isInFpv = false;
            });
            if (scene && cameras && scene.activeCamera === cameras.fpvCamera && activePlayer) {
                activePlayer.isInFpv = true;
            }
        }

        // ═════════════════════════════════════════════════════════════════════════
        // INDICATEUR DE SÉLECTION
        // ═════════════════════════════════════════════════════════════════════════

        function updateSelectionIndicator(activePlayer) {
            if (!selectionIndicator || !cameras || !scene || !activePlayer) return;
            var showIndicator = scene.activeCamera !== cameras.fpvCamera;
            selectionIndicator.setEnabled(showIndicator);
            var stamina  = activePlayer.stamina !== undefined ? activePlayer.stamina : 1;
            var minScale = 0.25;
            var maxScale = 1.0;
            selectionIndicator.scaling.y = minScale + (maxScale - minScale) * stamina;
        }

        // ═════════════════════════════════════════════════════════════════════════
        // AXES DE DÉPLACEMENT (calcul selon caméra active)
        // ═════════════════════════════════════════════════════════════════════════

        function computeMoveAxes(input) {
            var moveX = 0;
            var moveZ = 0;

            if (!scene || !cameras || !input) return { moveX: moveX, moveZ: moveZ };

            if (scene.activeCamera === cameras.tpsCamera || scene.activeCamera === cameras.broadcastCamera) {
                if (input.forward)  moveX += 1;
                if (input.backward) moveX -= 1;
                if (input.left)     moveZ += 1;
                if (input.right)    moveZ -= 1;
                return { moveX: moveX, moveZ: moveZ };
            }

            if (scene.activeCamera === cameras.fpvCamera) {
                var forward = cameras.fpvCamera.getForwardRay().direction.clone();
                forward.y = 0;
                forward.normalize();

                var right = new BABYLON.Vector3(forward.z, 0, -forward.x);
                right.normalize();

                var moveVector = BABYLON.Vector3.Zero();
                if (input.forward)  moveVector.addInPlace(forward);
                if (input.backward) moveVector.subtractInPlace(forward);
                if (input.right)    moveVector.addInPlace(right);
                if (input.left)     moveVector.subtractInPlace(right);

                if (moveVector.lengthSquared() > 0) {
                    moveVector.normalize();
                    moveX = moveVector.x;
                    moveZ = moveVector.z;
                }
            }

            return { moveX: moveX, moveZ: moveZ };
        }

        function syncTargetToActivePlayer(activePlayer) {
            if (!activePlayer || !activePlayer.position) return;
            if (cameras?.cameraTargetNode) {
                cameras.cameraTargetNode.position.copyFrom(activePlayer.position);
            }
            if (state.cameraRig) {
                state.cameraRig.position.copyFrom(activePlayer.position);
            }
        }

        // ═════════════════════════════════════════════════════════════════════════
        // BOUCLE PRINCIPALE
        // ═════════════════════════════════════════════════════════════════════════

        function update(activePlayer, ballArg, playerMoveVelocity, gameplayPaused) {
            var dt = scene ? scene.getEngine().getDeltaTime() / 1000 : 0;

            updateCameraFollow(activePlayer);                                    // TPS uniquement
            updateBroadcastCamera(activePlayer, ballArg, gameplayPaused);        // Broadcast FIFA
            applyShake(cameras ? cameras.broadcastCamera : null, dt);            // Shake broadcast
            updateFpvState(activePlayer);                                        // FPV uniquement
            updateSelectionIndicator(activePlayer);
        }

        // ═════════════════════════════════════════════════════════════════════════
        // LISTENERS ÉVÉNEMENTS
        // ═════════════════════════════════════════════════════════════════════════

        function handleGoalEvent() {
            triggerShake(0.01);
            setActionIntensity("goal");
        }

        function handleCameraActionEvent(evt) {
            var type = (evt && evt.detail && evt.detail.type) ? evt.detail.type
                     : (evt && typeof evt.detail === "string")  ? evt.detail
                     : "normal";
            setActionIntensity(type);
            if (type === "shot") triggerShake(0.004);
            if (type === "duel") triggerShake(0.002);
        }

        // Nouvel événement universel cam:event (architecture FIFA)
        function handleCamEvent(e) {
            var detail = (e && e.detail) ? e.detail : "";
            // Format objet : { type, force } — envoyé par gameLogic.kick()
            var type  = (typeof detail === "object" && detail.type) ? detail.type : detail;
            var force = (typeof detail === "object" && detail.force) ? detail.force : 0;

            if (type === "goal") { triggerShake(0.01);  setActionIntensity("goal"); }
            if (type === "shot") {
                triggerShake(0.004);
                setActionIntensity("shot");
                // Zoom FIFA : normalise la force (forces usuelles : 8, 15, 25)
                var normalizedPower = BABYLON.Scalar.Clamp(force / 25, 0, 1);
                triggerKickZoom(normalizedPower);
            }
            if (type === "duel") { triggerShake(0.002); setActionIntensity("duel"); }
        }

        function setZoomOffset(offset) {
            state.userZoomOffset = Math.max(0, Number(offset) || 0);
        }

        function getZoomOffset() {
            return state.userZoomOffset;
        }

        setupBroadcastRig();
        window.addEventListener("match:goal",       handleGoalEvent);
        window.addEventListener("gow:cameraAction", handleCameraActionEvent);
        window.addEventListener("cam:event",        handleCamEvent);

        scene.onDisposeObservable.add(function () {
            window.removeEventListener("match:goal",       handleGoalEvent);
            window.removeEventListener("gow:cameraAction", handleCameraActionEvent);
            window.removeEventListener("cam:event",        handleCamEvent);
        });

        return {
            handleCameraToggle,
            computeMoveAxes,
            syncTargetToActivePlayer,
            update,
            updateCameraFollow,
            updateBroadcastCinematic,
            updateFpvState,
            updateSelectionIndicator,
            triggerGoalShake,
            setActionIntensity,
            setZoomOffset,
            getZoomOffset,
            cameraBrain: {
                get intensity() { return cameraBrain.intensity; },
                get target()    { return state.cameraRig ? state.cameraRig.position : null; }
            }
        };
    }

    window.animateCameraSwitch            = animateCameraSwitch;
    window.createCameraRuntimeController  = createCameraRuntimeController;
})();
