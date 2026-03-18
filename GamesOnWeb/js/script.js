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
    // Change this variable to test different stages: "huitieme", "quart", "demi", "finale"
    let tournamentStage = "quart";

    // --- Structure ---
    
    createField(scene); // Defined in js/structure/field.js

    // Grandstands (Tribunes)
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
    // Goals
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

    // Panneaux de score 3D style stade
    createScoreboard3D(scene);

    // Jauge de tir
    const kickGauge = createKickGauge(scene);
    drawGaugeColors(kickGauge);
    // Players (using Team Architecture)
    const myTeam = new PlayerTeam(scene, "My Team", new BABYLON.Color3(1, 0, 0));
    myTeam.createTeamFormation(1); // 1 pour le côté gauche

    // Pour l'instant, le "joueur actif" est le premier attaquant (index 3)
    let activePlayer = myTeam.players[3]; 
    myTeam.activePlayer = activePlayer;

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

    // Cameras Setup (TPS et FPS gérées dans cameras.js)
    const cameras = setupCameras(scene, canvas, activePlayer);

    // Input & Variables de base
    const input = {
        forward:false,
        backward:false,
        left:false,
        right:false
    };

    window.addEventListener("keydown",(e)=>{

        if(e.key==="z"||e.key==="Z") input.forward=true;
        if(e.key==="s"||e.key==="S") input.backward=true;
        if(e.key==="q"||e.key==="Q") input.left=true;
        if(e.key==="d"||e.key==="D") input.right=true;

        if(e.code === "Space" && !isCharging){
            chargeStart = Date.now();
            isCharging = true; 
        }

        if(e.key==="a" || e.key==="A"){
            const p = myTeam.getPlayerOnSide("left");
            myTeam.switchPlayerSmooth(p, cameras, scene, 180);
            activePlayer = myTeam.activePlayer;
        }

        if(e.key==="e" || e.key==="E"){
            const p = myTeam.getPlayerOnSide("right");
            myTeam.switchPlayerSmooth(p, cameras, scene, 180);
            activePlayer = myTeam.activePlayer;
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

        if(e.key==="z"||e.key==="Z") input.forward=false;
        if(e.key==="s"||e.key==="S") input.backward=false;
        if(e.key==="q"||e.key==="Q") input.left=false;
        if(e.key==="d"||e.key==="D") input.right=false;

        if(e.code === "Space" && isCharging){

            const force = computeKickPower(kickGauge);

            hideKickGauge(kickGauge);
            kick(scene, ball, activePlayer, lastDirection, force, myTeam);

            isCharging = false;
        }

    });

    const speed = 0.1;

    let lastDirection = new BABYLON.Vector3(1,0,0);
    let playerFacing = new BABYLON.Vector3(1,0,0);

    let previousPlayerPosition = activePlayer.position.clone();
    let playerMoveVelocity = new BABYLON.Vector3(0, 0, 0);

    let lastKickTime = 0;
    const kickCooldown = 300;

    scene.onBeforeRenderObservable.add(()=>{

        if (scene.activeCamera === cameras.tpsCamera && activePlayer) {
            // suit doucement le joueur actif même hors switch
            cameras.cameraTargetNode.position = BABYLON.Vector3.Lerp(
                cameras.cameraTargetNode.position,
                activePlayer.position,
                0.12
            );
        }

        //myTeam.autoSwitch(ball, cameras);
        activePlayer = myTeam.activePlayer;

        myTeam.players.forEach(player => {
            player.isInFpv = false;
        });

        if (scene.activeCamera === cameras.fpvCamera) {
            activePlayer.isInFpv = true;
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

        // TPS : déplacement en axes fixes du terrain
        if (scene.activeCamera === cameras.tpsCamera) {
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

        // Déplacement normal / tacle glissé
        const movement = tackleController.updateAndMove(activePlayer, moveX, moveZ, speed);
        const controlledPlayer = movement.controlledPlayer;
        const directionOpt = movement.directionOpt;

        const currentPlayerPosition = controlledPlayer.position.clone();
        playerMoveVelocity = currentPlayerPosition.subtract(previousPlayerPosition);
        previousPlayerPosition = currentPlayerPosition;
        
        if (directionOpt) {
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
        if(isCharging){

            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                controlledPlayer,
                lastDirection,
                time
            );

        }
        else{
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
            }
        }

    });



    // --- UI Update (Chronomètre) ---
    // Start the timer when the match actually begins
    window.gameScoreboard.startTimer();

    scene.onBeforeRenderObservable.add(() => {
        window.gameScoreboard.updateTimer(scene.getEngine().getDeltaTime() / 1000);
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