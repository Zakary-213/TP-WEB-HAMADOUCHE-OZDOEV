const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

// Add your code here matching the playground format
const createScene = function () {

    const scene = new BABYLON.Scene(engine);

    // Camera looking at the center
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI,
        0.01,
        60,
        new BABYLON.Vector3(0,0,0),
        scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // --- Structure ---
    createField(scene);

    // Goals
    createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2);
    createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2);

    // Ball
    const ball = createBall(scene);
    let ballControlled = true;

    // Player
    const players = [];
    const teamAColor = new BABYLON.Color3(1, 0, 0);

    players.push(
        createPlayer(scene, new BABYLON.Vector3(-40, 0, 0), teamAColor)
    );

    const player = players[0];
    ball.parent = player;
    ball.position = new BABYLON.Vector3(1.5, 0.75, 0);

    camera.lockedTarget = players[0];
    camera.inputs.clear();

    // -----------------------------
    // CONTROLES CLAVIER
    // -----------------------------

    const input = {
        forward: false,
        backward: false,
        left: false,
        right: false
    };

    window.addEventListener("keydown", (e) => {

        if (e.key === "z" || e.key === "Z") input.forward = true;
        if (e.key === "s" || e.key === "S") input.backward = true;
        if (e.key === "q" || e.key === "Q") input.left = true;
        if (e.key === "d" || e.key === "D") input.right = true;

    });

    window.addEventListener("keyup", (e) => {

        if (e.key === "z" || e.key === "Z") input.forward = false;
        if (e.key === "s" || e.key === "S") input.backward = false;
        if (e.key === "q" || e.key === "Q") input.left = false;
        if (e.key === "d" || e.key === "D") input.right = false;

    });

    const speed = 0.4;
    const ballDistance = 1.5;
    scene.onBeforeRenderObservable.add(() => {

        let moveX = 0;
        let moveZ = 0;

        if (input.forward) moveX += 1;
        if (input.backward) moveX -= 1;
        if (input.left) moveZ += 1;
        if (input.right) moveZ -= 1;

        if (moveX !== 0 || moveZ !== 0) {

            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= length;
            moveZ /= length;

            player.position.x += moveX * speed;
            player.position.z += moveZ * speed;

            // Position du ballon selon direction
            ball.position.x = moveX * ballDistance;
            ball.position.z = moveZ * ballDistance;
        }

    });

    // --- Interaction ---
    const kickButton = document.getElementById("kickButton");
    
    kickButton.addEventListener("click", function() {

        const angle = Math.random() * Math.PI * 2;
        const force = 10 + Math.random() * 20;

        const startX = ball.position.x;
        const startZ = ball.position.z;

        let targetX = startX + Math.cos(angle) * force;
        let targetZ = startZ + Math.sin(angle) * force;

        if (targetX > 48) targetX = 48;
        if (targetX < -48) targetX = -48;
        if (targetZ > 28) targetZ = 28;
        if (targetZ < -28) targetZ = -28;

        const frameRate = 60;

        const animationBox = new BABYLON.Animation(
            "kickAnimation",
            "position",
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];

        keys.push({
            frame: 0,
            value: ball.position.clone()
        });

        keys.push({
            frame: frameRate,
            value: new BABYLON.Vector3(targetX, 0.75, targetZ)
        });

        animationBox.setKeys(keys);

        const easingFunction = new BABYLON.CircleEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        animationBox.setEasingFunction(easingFunction);

        ball.animations = [];
        ball.animations.push(animationBox);

        scene.beginAnimation(ball, 0, frameRate, false);

    });

    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click", function() {

        scene.stopAnimation(ball);

        ball.position = new BABYLON.Vector3(0, 0.75, 0);
        ball.rotation = new BABYLON.Vector3(0, 0, 0);

    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () {
    scene.render();
});

window.addEventListener("resize", function () {
    engine.resize();
});