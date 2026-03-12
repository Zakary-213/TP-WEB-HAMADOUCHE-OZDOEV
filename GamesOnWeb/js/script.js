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

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI,
        0.01,
        60,
        new BABYLON.Vector3(0,0,0),
        scene
    );
    camera.attachControl(canvas, true);

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
    createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2);
    createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2);

    // Ball
    const ball = createBall(scene);
    ball.checkCollisions = true;
    ball.ellipsoid = new BABYLON.Vector3(0.7,0.7,0.7);

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

    // Camera tracking
    camera.lockedTarget = activePlayer;
    camera.inputs.clear();

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

    });


    // KICK logic has been moved to gameLogic.js

    // RESET
    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click",function(){

        scene.stopAnimation(ball);

        

        ball.position = new BABYLON.Vector3(0,0.75,0);
        ball.rotation = new BABYLON.Vector3(0,0,0);

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