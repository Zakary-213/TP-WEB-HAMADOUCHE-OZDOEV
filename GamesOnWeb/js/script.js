const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

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
    let tournamentStage = "finale";

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

    // Jauge de tir
    const kickGauge = createKickGauge(scene);
    drawGaugeColors(kickGauge);
    // Players (using Team Architecture)
    const myTeam = new PlayerTeam(scene, "My Team", new BABYLON.Color3(1, 0, 0));
    myTeam.createTeamFormation(1); // 1 pour le côté gauche

    // Pour l'instant, le "joueur actif" est le premier attaquant (index 3)
    let activePlayer = myTeam.players[3]; 

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
    });

    window.addEventListener("keyup",(e)=>{

        if(e.key==="z"||e.key==="Z") input.forward=false;
        if(e.key==="s"||e.key==="S") input.backward=false;
        if(e.key==="q"||e.key==="Q") input.left=false;
        if(e.key==="d"||e.key==="D") input.right=false;

        if(e.code === "Space" && isCharging){

            const force = computeKickPower(kickGauge);

            hideKickGauge(kickGauge);
            kick(scene, ball, activePlayer, lastDirection, force);

            isCharging = false;
        }

    });

    const speed = 0.1;

    let lastDirection = new BABYLON.Vector3(1,0,0);
    let playerFacing = new BABYLON.Vector3(1,0,0);

    let lastKickTime = 0;
    const kickCooldown = 300;

    scene.onBeforeRenderObservable.add(()=>{

        const dt = scene.getEngine().getDeltaTime() / 1000;

        let moveX = 0;
        let moveZ = 0;

        if(input.forward) moveX+=1;
        if(input.backward) moveX-=1;
        if(input.left) moveZ+=1;
        if(input.right) moveZ-=1;

        // Appel de la méthode encapsulée dans player.js
        const directionOpt = activePlayer.move(moveX, moveZ, speed);
        
        if (directionOpt) {
            lastDirection = directionOpt;
            playerFacing = lastDirection.clone();
        }

        // COLLISION JOUEUR → BALLE
        checkBallCollision(activePlayer, ball, playerFacing);

        // UPDATE ADVERSAIRES
        opponentTeam.update(ball);

        // UPDATE JAUGE
        if(isCharging){

            const time = performance.now() / 1000;

            updateKickGauge(
                kickGauge,
                activePlayer,
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

        // Mise à jour de la position de la balle en fonction de sa vitesse
        if (ball.velocity.lengthSquared() > 0.000001) {
            ball.position.x += ball.velocity.x * dt;
            ball.position.z += ball.velocity.z * dt;

            // Frottement au sol pour que la balle ralentisse
            const friction = 0.985;
            ball.velocity.scaleInPlace(friction);

            if (ball.velocity.lengthSquared() < 0.0001) {
                ball.velocity.set(0, 0, 0);
            }

            // Rebond sur les poteaux
            const ballRadius = 0.55; // cohérent avec ball.js (diamètre 1.1)
            const postRadius = 0.2;  // moitié de postThickness (0.4)
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

                    // Réflexion de la vitesse par rapport à la normale du poteau
                    const reflected = BABYLON.Vector3.Reflect(ball.velocity, normal);
                    // On atténue un peu l'énergie du rebond
                    ball.velocity = reflected.scale(0.7);

                    // On repousse la balle juste à l'extérieur du rayon de collision
                    ball.position = postPos.add(normal.scale(collisionDistance));
                    hasBounced = true;
                }
            }
        }

        // GOAL DETECTION (Vérifie si le ballon est dans un des triggers de but)
        // On vérifie d'abord que le ballon a une vraie position
        if (ball && ball.position) {
            
            // Pour des TransformNodes complexes, on peut utiliser des Sphères virtuelles ou vérifier le Mesh enfant
            // Ici, le ballon gère sa propre physique donc sa position est suffisante
            
            // Méthode simple : on regarde la boundingbox du trigger
            const ballCenter = ball.position;
            
            if (leftGoal.triggerBox.intersectsPoint(ballCenter) || rightGoal.triggerBox.intersectsPoint(ballCenter)) {
                
                // Le ballon a marqué !
                console.log("GOOOOOAAALLLLL !");
                
                // Stopper l'animation physique (si le ballon vole)
                scene.stopAnimation(ball);
                
                // Remettre la balle au centre
                ball.position = new BABYLON.Vector3(0, 0.65, 0);
                ball.rotation = new BABYLON.Vector3(0, 0, 0);

                if (ball.velocity) {
                    ball.velocity.set(0, 0, 0);
                }

                // Optionnel : Réinitialiser la vitesse si on avait un système de vélocité
            }
        }

    });


    // KICK logic has been moved to gameLogic.js

    // RESET
    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click",function(){

        scene.stopAnimation(ball);

        

        ball.position = new BABYLON.Vector3(0,0.65,0);
        ball.rotation = new BABYLON.Vector3(0,0,0);

        if (ball.velocity) {
            ball.velocity.set(0, 0, 0);
        }

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