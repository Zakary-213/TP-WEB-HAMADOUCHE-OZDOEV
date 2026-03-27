const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

function animateCameraSwitch(scene, cameras, fromPlayer, toPlayer, duration = 180) {
    if (!fromPlayer || !toPlayer || !cameras?.cameraTargetNode) return;

    const start = cameras.cameraTargetNode.position.clone();
    const end = toPlayer.position.clone();

    const startTime = performance.now();

    const observer = scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        let t = elapsed / duration;

        if (t >= 1) t = 1;

        // easing smooth
        const eased = t * t * (3 - 2 * t);

        cameras.cameraTargetNode.position = BABYLON.Vector3.Lerp(start, end, eased);

        if (t === 1) {
            scene.onBeforeRenderObservable.remove(observer);
            cameras.cameraTargetNode.position.copyFrom(toPlayer.position);
        }
    });
}

// Crée un indicateur visuel (petite flèche) au-dessus d'un joueur sélectionné
function createSelectionIndicator(scene, playerNode) {
        const root = new BABYLON.TransformNode("selectionIndicatorRoot", scene);
        // Hauteur suffisante pour être bien au-dessus de la tête, même avec les skins les plus grands
        root.position = new BABYLON.Vector3(0, 10, 0);

        const arrow = BABYLON.MeshBuilder.CreateCylinder("selectionArrow", {
            height: 1.6,
            diameterTop: 0,
            diameterBottom: 0.9,
            tessellation: 4
        }, scene);
        arrow.parent = root;

        const mat = new BABYLON.StandardMaterial("selectionArrowMat", scene);
        mat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.2); // jaune lumineux
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        arrow.material = mat;

        if (playerNode) {
            root.parent = playerNode;
        }
        return root;
}

// Place les deux équipes en lignes pour l'intro de match
function placeTeamsForIntro(myTeam, opponentTeam) {
    const placeTeamLine = (team, side) => {
        if (!team || !team.players) return;

        const lineX = -5 * side; // proche de la ligne médiane côté équipe
        const baseZ = -12;
        const spacingZ = 6;

        team.players.forEach((p, index) => {
            if (!p || !p.position) return;

            p.position.x = lineX;
            p.position.y = 0;
            p.position.z = baseZ + spacingZ * index;

            if (p.model) {
                // Orientation vers le centre du terrain
                p.model.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
                p.model.rotation.z = 0;
            }
        });
    };

    // Équipe de gauche (side = 1) et de droite (side = -1)
    placeTeamLine(myTeam, 1);
    placeTeamLine(opponentTeam, -1);
}

const createScene = function () {

    // VARIABLES 
    let chargeStart = 0;
    let isCharging = false;

    const maxChargeTime = 1000; // 1 seconde max
    const maxForce = 25;

    const scene = new BABYLON.Scene(engine);

    scene.collisionsEnabled = true;

    // Light (ambiance plus douce)
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.45;

    // --- Environnement (espace autour du stade) ---
    createEnvironment(scene); // Defined in js/structure/environnement.js

    // --- TOURNAMENT STATE ---
    let tournamentStage = "finale";

    // --- Structure ---

    createField(scene); 

    let tribune;
    switch(tournamentStage) {
        case "huitieme": tribune = new TribuneHuitieme(scene); break;
        case "quart": tribune = new TribuneQuart(scene); break;
        case "demi": tribune = new TribuneDemi(scene); break;
        case "finale": tribune = new TribuneFinale(scene); break;
        default: tribune = new TribuneHuitieme(scene); break;
    }
    tribune.create();

    
    // --- Objects ---
    const leftGoal = createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2);
    const rightGoal = createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2);

    // Liste des poteaux (pour les rebonds de la balle)
    const goalPosts = [
        leftGoal.leftPost,
        leftGoal.rightPost,
        rightGoal.leftPost,
        rightGoal.rightPost
    ];

    // Ball
    const ball = createBall(scene);
    ball.checkCollisions = true;
    ball.ellipsoid = new BABYLON.Vector3(0.55, 0.55, 0.55);

    ball.isOutAnimationPlaying = false;
    ball.outAnimationFinished = false;
    ball.outVelocity = new BABYLON.Vector3(0, 0, 0);
    ball.isOutOfPlay = false;
    ball.outTimer = 0;
    ball.outFallDelay = 0;

    ball.pushLockUntil = 0;
    ball.ignorePlayerCollisionUntil = 0;
    ball.lastKicker = null;
    ball.lastTouchTeam = null;

    ball.outDecision = null;
    ball.outExitPosition = null;

    ball.restartLocked = false;
    ball.restartTaker = null;

    // Panneaux de score 3D style stade
    createScoreboard3D(scene);

    // Jauge de tir
    const kickGauge = createKickGauge(scene);
    drawGaugeColors(kickGauge);

    const myTeam = new PlayerTeam(scene, "My Team", new BABYLON.Color3(1, 0, 0));
    myTeam.createTeamFormation(1); // 1 pour le côté gauche

    // Pour l'instant, le "joueur actif" est le premier attaquant (index 3)
    let activePlayer = myTeam.players[3]; 
    const basePlayer = activePlayer;
    myTeam.activePlayer = activePlayer;

        // Indicateur de sélection (flèche) au-dessus du joueur actif
        const selectionIndicator = createSelectionIndicator(scene, activePlayer);

    // Opponent team based on tournament stage
    let opponentTeam;
    switch(tournamentStage) {
        case "huitieme": opponentTeam = new AITeamHuitieme(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
        case "quart": opponentTeam = new AITeamQuart(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
        case "demi": opponentTeam = new AITeamDemi(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
        case "finale": opponentTeam = new AITeamFinale(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
        default: opponentTeam = new AITeamHuitieme(scene, "Adversaire", new BABYLON.Color3(0, 0, 1)); break;
    }
    opponentTeam.createTeamFormation(-1); // -1 pour le côté droit
    myTeam.opponents = opponentTeam.players;
    opponentTeam.opponents = myTeam.players;

    const tackleController = new TackleController();

    // Mi-temps / fin de match (piloté par js/ui/matchFlow.js)
    // Mi-temps réglée à 30 secondes.
    const HALF_TIME_SECONDS = 30;
    const HALF_TIME_PAUSE_SECONDS = 10;

    let gameplayPaused = false;
    let preMatchIntroPlaying = true;

    const setGameplayPaused = (v) => {
        gameplayPaused = !!v;
    };

    let matchFlow = null;

    // Cameras Setup (TPS et FPS gérées dans cameras.js)
    const cameras = setupCameras(scene, canvas, activePlayer);

    // Branche la gestion mi-temps / fin du match (affichage + pause/reprise)
    if (window.createMatchFlow) {
        const setActivePlayerFn = (p) => {
            activePlayer = p;
            myTeam.activePlayer = p;
            if (selectionIndicator && p) {
                selectionIndicator.parent = p;
            }
        };

        matchFlow = window.createMatchFlow({
            halfSeconds: HALF_TIME_SECONDS,
            halftimePauseSeconds: HALF_TIME_PAUSE_SECONDS,
            setGameplayPaused,
            myTeam,
            opponentTeam,
            cameras,
            ball,
            basePlayer,
            setActivePlayerFn
        });
    }

    // Input & Variables de base
    const input = {
        forward:false,
        backward:false,
        left:false,
        right:false,
        sprint:false
    };

    window.addEventListener("keydown",(e)=>{
        if (preMatchIntroPlaying) return;

        if(e.key==="z"||e.key==="Z") input.forward=true;
        if(e.key==="s"||e.key==="S") input.backward=true;
        if(e.key==="q"||e.key==="Q") input.left=true;
        if(e.key==="d"||e.key==="D") input.right=true;
        if(e.key==="Shift") input.sprint = true;

        if (e.code === "Space" && !isCharging) {
            chargeStart = Date.now();
            isCharging = true;
        }

        if(e.key==="a" || e.key==="A"){
            const p = myTeam.getPlayerOnSide("left");
            myTeam.switchPlayerSmooth(p, cameras, scene, 180);
            activePlayer = myTeam.activePlayer;
            if (selectionIndicator && activePlayer) {
                selectionIndicator.parent = activePlayer;
            }
        }

        if(e.key==="e" || e.key==="E"){
            const p = myTeam.getPlayerOnSide("right");
            myTeam.switchPlayerSmooth(p, cameras, scene, 180);
            activePlayer = myTeam.activePlayer;
            if (selectionIndicator && activePlayer) {
                selectionIndicator.parent = activePlayer;
            }
        }

        if(e.key==="c" || e.key==="C"){
            // Laisse cameras.js faire le switch TPS / FPV,
            // puis aligne une seule fois la caméra sur la direction du joueur
            setTimeout(() => {
                cameras.alignFpvToDirection(activePlayer.facingDirection);
            }, 0);
        }

        tackleController.handleKeyDown(e, {
            activePlayer,
            playerFacing,
            ball,
            opponentTeam
        });
        
    });

    window.addEventListener("keyup",(e)=>{
        if (preMatchIntroPlaying) return;

        if(e.key==="z"||e.key==="Z") input.forward=false;
        if(e.key==="s"||e.key==="S") input.backward=false;
        if(e.key==="q"||e.key==="Q") input.left=false;
        if(e.key==="d"||e.key==="D") input.right=false;
        if(e.key==="Shift") input.sprint = false;

       if (e.code === "Space" && isCharging) {
            const force = computeKickPower(kickGauge);

            hideKickGauge(kickGauge);

            if (isRestartWaitingKick()) {
                takeRestartKick(ball, lastDirection, force);
            } else {
                kick(scene, ball, activePlayer, lastDirection, force, myTeam);
            }

            isCharging = false;
        }
    });

    // Vitesse de marche de base
    const baseSpeed = 0.07;
    // Multiplicateur de sprint (un peu plus rapide aussi)
    const SPRINT_MULTIPLIER = 1.8;
    const STAMINA_DRAIN_RATE = 0.35; // par seconde en sprint
    const STAMINA_REGEN_RATE = 0.25; // par seconde en marche/repos

    let lastDirection = new BABYLON.Vector3(1,0,0);
    let playerFacing = new BABYLON.Vector3(1,0,0);

    let previousPlayerPosition = activePlayer.position.clone();
    let playerMoveVelocity = new BABYLON.Vector3(0, 0, 0);

    let lastKickTime = 0;
    const kickCooldown = 300;

    scene.onBeforeRenderObservable.add(()=>{
        if (preMatchIntroPlaying || gameplayPaused) {
            // On fige le gameplay à la mi-temps (10 secondes)
            return;
        }

        if (
            (scene.activeCamera === cameras.tpsCamera || scene.activeCamera === cameras.broadcastCamera) &&
            activePlayer
        ) {
            // suit doucement le joueur actif même hors switch
            cameras.cameraTargetNode.position = BABYLON.Vector3.Lerp(
                cameras.cameraTargetNode.position,
                activePlayer.position,
                0.12
            );
        }

        if (!isRestartWaitingKick()) {
            myTeam.autoSwitch(ball, cameras);
        }
        activePlayer = myTeam.activePlayer;

        // Si l'auto-switch a changé de joueur actif, on recolle la flèche dessus
        if (selectionIndicator && activePlayer && selectionIndicator.parent !== activePlayer) {
            selectionIndicator.parent = activePlayer;
        }

        if (isRestartWaitingKick() && restartState.position) {
            ball.position.x = restartState.position.x;
            ball.position.y = 0.75;
            ball.position.z = restartState.position.z;

            if (ball.velocity) {
                ball.velocity.set(0, 0, 0);
            }
        }

        if (isRestartWaitingKick()) {
            enforceRestartClearance(ball, myTeam, opponentTeam);
        }

        updateAIRestart(ball);

        myTeam.players.forEach(player => {
            player.isInFpv = false;
        });

        if (scene.activeCamera === cameras.fpvCamera) {
            activePlayer.isInFpv = true;
        }

        // Affiche la flèche uniquement en vues TPS / broadcast (R),
        // on la masque en vue FPS (C)
        if (selectionIndicator) {
            const showIndicator = scene.activeCamera !== cameras.fpvCamera;
            selectionIndicator.setEnabled(showIndicator);

            // Utilise la hauteur de la flèche comme jauge d'endurance
            const staminaForIndicator = activePlayer.stamina ?? 1;
            const minScale = 0.25;
            const maxScale = 1.0;
            const s = minScale + (maxScale - minScale) * staminaForIndicator;
            selectionIndicator.scaling.y = s;
        }

        myTeam.update(ball);
        // Met à jour l'IA uniquement si son comportement est implémenté pour ce stade
        if (opponentTeam && opponentTeam.aiImplemented) opponentTeam.update(ball);

        // Applique l'etat "au sol" des joueurs tacles (stun temporaire)
        tackleController.updateStunnedPlayers(myTeam);
        tackleController.updateStunnedPlayers(opponentTeam);

        // COLLISIONS ENTRE JOUEURS (évite qu'ils se traversent)
        const PLAYER_RADIUS = 1.2;
        tackleController.beginFrame();

        if (opponentTeam) {
            // Joueurs de myTeam vs joueurs de opponentTeam
            myTeam.players.forEach(pA => {
                if (!pA) return;
                opponentTeam.players.forEach(pB => {
                    if (!pB) return;

                    if (tackleController.shouldIgnoreCollision(pA, pB)) {
                        tackleController.registerPotentialHit(pA, pB);
                        return;
                    }

                    resolvePlayerCollision(pA, pB, PLAYER_RADIUS, PLAYER_RADIUS);
                });
            });
            // Joueurs de la même équipe (myTeam)
            for (let i = 0; i < myTeam.players.length; i++) {
                for (let j = i + 1; j < myTeam.players.length; j++) {
                    if (tackleController.shouldIgnoreCollision(myTeam.players[i], myTeam.players[j])) {
                        continue;
                    }
                    resolvePlayerCollision(myTeam.players[i], myTeam.players[j], PLAYER_RADIUS, PLAYER_RADIUS);
                }
            }
        }

        tackleController.applyBallSteal(ball);

        const dt = scene.getEngine().getDeltaTime() / 1000;

        let moveX = 0;
        let moveZ = 0;

        // TPS + Broadcast : déplacement en axes fixes du terrain
        if (scene.activeCamera === cameras.tpsCamera || scene.activeCamera === cameras.broadcastCamera) {
            if(input.forward) moveX += 1;
            if(input.backward) moveX -= 1;
            if(input.left) moveZ += 1;
            if(input.right) moveZ -= 1;
        }
        // FPV : déplacement relatif à la direction de la caméra
        else if (scene.activeCamera === cameras.fpvCamera) {

            // Direction "avant" de la caméra projetée sur le sol
            const forward = cameras.fpvCamera.getForwardRay().direction.clone();
            forward.y = 0;
            forward.normalize();

            // Direction "droite" de la caméra projetée sur le sol
            const right = new BABYLON.Vector3(forward.z, 0, -forward.x);

            let moveVector = BABYLON.Vector3.Zero();

            if(input.forward) moveVector.addInPlace(forward);       // Z = avance
            if(input.backward) moveVector.subtractInPlace(forward); // S = recule
            if(input.right) moveVector.addInPlace(right);           // D = droite
            if(input.left) moveVector.subtractInPlace(right);       // Q = gauche

            // On convertit le vecteur final en moveX / moveZ pour réutiliser activePlayer.move()
            if (moveVector.lengthSquared() > 0) {
                moveVector.normalize();
                moveX = moveVector.x;
                moveZ = moveVector.z;
            }
        }

        // Déplacement normal / tacle glissé avec gestion du sprint / endurance
        let movement;
        const restartTakerLocked = isRestartTaker(activePlayer);

        // Mise à jour de l'endurance du joueur actif
        let stamina = activePlayer.stamina;
        const maxStamina = activePlayer.maxStamina || 1;
        const isTryingToMove = (moveX !== 0 || moveZ !== 0);

        let effectiveSpeed = baseSpeed;

        if (!restartTakerLocked && isTryingToMove && input.sprint && stamina > 0.05) {
            // Sprint : vitesse augmentée, jauge qui se vide
            effectiveSpeed = baseSpeed * SPRINT_MULTIPLIER;
            stamina -= STAMINA_DRAIN_RATE * dt;
        } else {
            // Pas de sprint ou joueur à l'arrêt : la jauge se régénère
            stamina += STAMINA_REGEN_RATE * dt;
        }

        if (stamina < 0) stamina = 0;
        if (stamina > maxStamina) stamina = maxStamina;
        activePlayer.stamina = stamina;

        if (restartTakerLocked) {
            // Pendant une remise : le tireur ne bouge pas,
            // mais on peut quand même changer la direction visée
            movement = tackleController.updateAndMove(activePlayer, 0, 0, baseSpeed);

            let aimX = 0;
            let aimZ = 0;

            // On garde la même logique d'axes que ton mode TPS
            if (input.forward) aimX += 1;
            if (input.backward) aimX -= 1;
            if (input.left) aimZ += 1;
            if (input.right) aimZ -= 1;

            if (aimX !== 0 || aimZ !== 0) {
                const aim = new BABYLON.Vector3(aimX, 0, aimZ);
                aim.normalize();

                lastDirection = sanitizeRestartDirection(aim, restartState);
                playerFacing = lastDirection.clone();
            } else {
                lastDirection = getDefaultRestartDirection(restartState);
                playerFacing = lastDirection.clone();
            }
        } else {
            movement = tackleController.updateAndMove(activePlayer, moveX, moveZ, effectiveSpeed);
        }

        const controlledPlayer = movement.controlledPlayer;
        const directionOpt = movement.directionOpt;

        const currentPlayerPosition = controlledPlayer.position.clone();
        playerMoveVelocity = currentPlayerPosition.subtract(previousPlayerPosition);
        previousPlayerPosition = currentPlayerPosition;
        
        if (!restartTakerLocked && directionOpt) {
            lastDirection = directionOpt;
            playerFacing = lastDirection.clone();
        }

        // COLLISION JOUEUR HUMAIN → BALLE
        checkBallCollision(controlledPlayer, ball, playerFacing, myTeam, playerMoveVelocity);

        // Si la balle sort du terrain, on lance l'animation de chute
        if (
            ball &&
            ball.position &&
            !ball.isOutAnimationPlaying &&
            !ball.isOutOfPlay &&
            isBallOutOfBounds(ball)
        ) {
            ball.outExitPosition = ball.position.clone();
            ball.outDecision = getRestartDecision(ball, myTeam, opponentTeam);

            startBallOutAnimation(ball);
        }

        // COLLISION JOUEURS IA → BALLE (uniquement si le comportement IA est implémenté)
        if (opponentTeam && opponentTeam.aiImplemented) {
            opponentTeam.players.forEach(bot => {
                if (!bot) return;

                const toBall = ball.position.subtract(bot.position);
                if (toBall.lengthSquared() === 0) return;

                const dir = toBall.normalize();
                checkBallCollision(bot, ball, dir, opponentTeam);
            });
        }

        // UPDATE JAUGE
        if (isCharging) {
            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                controlledPlayer,
                lastDirection,
                time
            );
        } else {
            hideKickGauge(kickGauge);
        }

        // PHYSIQUE SIMPLE DE LA BALLE (tir + rebonds sur les poteaux)
        if (!ball.velocity) {
            ball.velocity = new BABYLON.Vector3(0, 0, 0);
        }

        if (ball.isOutAnimationPlaying) {
            updateBallOutAnimation(ball, dt);
        } else if (!ball.isOutOfPlay) {
            // Mise à jour de la position de la balle en fonction de sa vitesse
            if (ball.velocity.lengthSquared() > 0.000001) {
                ball.position.x += ball.velocity.x * dt;
                ball.position.z += ball.velocity.z * dt;

                const friction = 0.985;
                ball.velocity.scaleInPlace(friction);

                if (ball.velocity.lengthSquared() < 0.0001) {
                    ball.velocity.set(0, 0, 0);
                }

                const ballRadius = 0.55;
                const postRadius = 0.2;
                const collisionDistance = ballRadius + postRadius;

                let hasBounced = false;

                for (let i = 0; i < goalPosts.length; i++) {
                    const post = goalPosts[i];
                    if (!post || hasBounced) continue;

                    const postPos = post.getAbsolutePosition();
                    const diff = ball.position.subtract(postPos);
                    const horizontal = new BABYLON.Vector3(diff.x, 0, diff.z);
                    const dist = horizontal.length();

                    if (dist > 0 && dist < collisionDistance) {
                        const normal = horizontal.normalize();

                        const reflected = BABYLON.Vector3.Reflect(ball.velocity, normal);
                        ball.velocity = reflected.scale(0.7);

                        ball.position = postPos.add(normal.scale(collisionDistance));
                        hasBounced = true;
                    }
                }
            }

            // ─── DÉFLEXION BALLE ↔ JOUEURS ──────────────────────────────────────
            // Empêche la balle de traverser un joueur quand elle est en mouvement
            if (!ball.restartLocked) {
                const BALL_RADIUS   = 0.55;
                const PLAYER_COLR   = 1.1; // rayon de collision des joueurs
                const COMBINED_R    = BALL_RADIUS + PLAYER_COLR;

                // Construire la liste de tous les joueurs à vérifier
                const allPlayers = [...myTeam.players];
                if (opponentTeam) allPlayers.push(...opponentTeam.players);

                allPlayers.forEach(p => {
                    if (!p || !p.position) return;

                    // Ignore temporairement le joueur qui vient de tirer / pousser
                    if (
                        ball.lastKicker === p &&
                        ball.ignorePlayerCollisionUntil &&
                        performance.now() < ball.ignorePlayerCollisionUntil
                    ) {
                        return;
                    }

                    const dx   = ball.position.x - p.position.x;
                    const dz   = ball.position.z - p.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist < COMBINED_R && dist > 0.001) {
                        const nx = dx / dist;
                        const nz = dz / dist;

                        const dot = ball.velocity.x * nx + ball.velocity.z * nz;
                        if (dot < 0) {
                            ball.velocity.x -= 2 * dot * nx;
                            ball.velocity.z -= 2 * dot * nz;

                            // légère perte d'énergie
                            ball.velocity.x *= 0.75;
                            ball.velocity.z *= 0.75;
                        }

                        const overlap = COMBINED_R - dist;
                        ball.position.x += nx * overlap;
                        ball.position.z += nz * overlap;
                    }
                });
            }

        }

        if (ball.outAnimationFinished && ball.outDecision) {
            startRestart(ball, ball.outDecision, myTeam, opponentTeam, cameras);
            ball.outAnimationFinished = false;
            ball.outDecision = null;
        }

        

        // GOAL DETECTION (Vérifie si le ballon est dans un des triggers de but)
        // On vérifie d'abord que le ballon a une vraie position
        if (ball && ball.position && !ball.isOutAnimationPlaying && !ball.isOutOfPlay) {
            
            // Pour des TransformNodes complexes, on peut utiliser des Sphères virtuelles ou vérifier le Mesh enfant
            // Ici, le ballon gère sa propre physique donc sa position est suffisante
            
            // Méthode simple : on regarde la boundingbox du trigger
            const ballCenter = ball.position;
            
            // On ajoute une vérification de sécurité : le ballon doit être près des cages (X > 45 ou X < -45)
            // pour éviter un but fantôme si la position d'initialisation croise brièvement un trigger mal placé
            let playerScored = false;
            let aiScored = false;

            if (Math.abs(ballCenter.x) > 45) {
                playerScored = rightGoal.triggerBox.intersectsPoint(ballCenter);
                aiScored = leftGoal.triggerBox.intersectsPoint(ballCenter);
            }

            if (playerScored || aiScored) {
                // Stopper l'animation physique (si le ballon vole)
                scene.stopAnimation(ball);
                
                // Remettre la balle au centre
                ball.position = new BABYLON.Vector3(0, 0.65, 0);
                ball.rotation = new BABYLON.Vector3(0, 0, 0);

                if (ball.velocity) {
                    ball.velocity.set(0, 0, 0);
                }

                // Mise à jour du score en fonction de qui a marqué
                if (playerScored) {
                    window.gameScoreboard.playerScored();
                } else if (aiScored) {
                    window.gameScoreboard.aiScored();
                }

                // Replacer tous les joueurs à leur position de départ
                if (myTeam && myTeam.resetPositions) myTeam.resetPositions();
                if (opponentTeam && opponentTeam.resetPositions) opponentTeam.resetPositions();

                // Reset de l'endurance pour tous les joueurs après un but
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
            }
        }

    });



    // --- UI Update (Chronomètre) ---
    const ENABLE_PRE_MATCH_INTRO = true;
    const PRE_MATCH_INTRO_DURATION_MS = 10000;
    const PRE_MATCH_INTRO_TURNS = 1; // 0.5 tour = 180°
    const TOURNAMENT_INTRO_LABEL_BY_STAGE = {
        huitieme: "Huitieme de finale",
        quart: "Quart de finale",
        demi: "Demi-finale",
        finale: "Finale"
    };
    const tournamentIntroLabel = TOURNAMENT_INTRO_LABEL_BY_STAGE[tournamentStage] || "Huitieme de finale";

    // Lancement du match après l'intro caméra
    if (typeof window.startPreMatchIntro === "function") {
        window.startPreMatchIntro(scene, cameras, ENABLE_PRE_MATCH_INTRO, {
            durationMs: PRE_MATCH_INTRO_DURATION_MS,
            rotationTurns: PRE_MATCH_INTRO_TURNS,
            tournamentLabel: tournamentIntroLabel,
            fromBeta: 0.45,
            toBeta: 0.75,
            fromRadius: 220,
            toRadius: 100,
            onComplete: () => {
                // On recolle le pivot caméra sur le joueur actif
                if (cameras?.cameraTargetNode && activePlayer?.position) {
                    cameras.cameraTargetNode.position.copyFrom(activePlayer.position);
                }

                preMatchIntroPlaying = false;
                window.gameScoreboard.startTimer();
            }
        });
    } else {
        preMatchIntroPlaying = false;
        window.gameScoreboard.startTimer();
    }

    scene.onBeforeRenderObservable.add(() => {
        const deltaSeconds = scene.getEngine().getDeltaTime() / 1000;
        window.gameScoreboard.updateTimer(deltaSeconds);

        // Gère la mi-temps + fin de match (dans js/ui/matchFlow.js)
        if (matchFlow) matchFlow.update();
    });

    


    return scene;
};

const scene = createScene();

engine.runRenderLoop(function(){
    scene.render();
});

window.addEventListener("resize",function(){
    engine.resize();
});