const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

// Add your code here matching the playground format
const createScene = function () {

    const scene = new BABYLON.Scene(engine);

    // Camera looking at the center
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 50, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);

    // Light (ambiance plus douce)
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.45;

    // --- Environnement (espace autour du stade) ---
    createEnvironment(scene); // Defined in js/structure/environnement.js

    // --- Structure ---
    // Field (Ground and Markings)
    createField(scene); // Defined in js/structure/field.js

    // Grandstands (Tribunes)
    const tribune = new TribuneFinale(scene);
    tribune.create();

    
    // --- Objects ---
    // Goals
    // Left Goal (at -50, needs to face +X, back to -X)
    createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2); // Defined in js/objects/goal.js

    // Right Goal (at 50, needs to face -X, back to +X)
    createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2); // Defined in js/objects/goal.js

    // Ball
    const ball = createBall(scene); // Defined in js/objects/ball.js

    // Players
    const teamAColor = new BABYLON.Color3(1, 0, 0); // Red
    const teamBColor = new BABYLON.Color3(0, 0, 1); // Blue

    // Team A (Left side -50 to 0)
    createPlayer(scene, new BABYLON.Vector3(-40, 0, 0), teamAColor); // Goalie?
    createPlayer(scene, new BABYLON.Vector3(-20, 0, 10), teamAColor);
    createPlayer(scene, new BABYLON.Vector3(-20, 0, -10), teamAColor);
    createPlayer(scene, new BABYLON.Vector3(-10, 0, 20), teamAColor);
    createPlayer(scene, new BABYLON.Vector3(-10, 0, -20), teamAColor);

    // Team B (Right side 0 to 50)
    createPlayer(scene, new BABYLON.Vector3(40, 0, 0), teamBColor); // Goalie?
    createPlayer(scene, new BABYLON.Vector3(20, 0, 10), teamBColor);
    createPlayer(scene, new BABYLON.Vector3(20, 0, -10), teamBColor);
    createPlayer(scene, new BABYLON.Vector3(10, 0, 20), teamBColor);
    createPlayer(scene, new BABYLON.Vector3(10, 0, -20), teamBColor);

    // --- Interaction ---
    const kickButton = document.getElementById("kickButton");
    
    kickButton.addEventListener("click", function() {
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const force = 10 + Math.random() * 20; // Random distance between 10 and 30 units

        // Current position
        const startX = ball.position.x;
        const startZ = ball.position.z;

        // Target position
        let targetX = startX + Math.cos(angle) * force;
        let targetZ = startZ + Math.sin(angle) * force;

        // Clamp to field boundaries (approximate)
        if (targetX > 48) targetX = 48;
        if (targetX < -48) targetX = -48;
        if (targetZ > 28) targetZ = 28;
        if (targetZ < -28) targetZ = -28;

        // Animation
        const frameRate = 60;
        const animationBox = new BABYLON.Animation("kickAnimation", "position", frameRate, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

        const keys = [];
        keys.push({
            frame: 0,
            value: ball.position.clone()
        });

        keys.push({
            frame: frameRate, // 1 second animation
            value: new BABYLON.Vector3(targetX, 0.75, targetZ)
        });

        animationBox.setKeys(keys);

        // Easing function for more natural movement (starts fast, slows down)
        const easingFunction = new BABYLON.CircleEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        animationBox.setEasingFunction(easingFunction);

        ball.animations = [];
        ball.animations.push(animationBox);

        scene.beginAnimation(ball, 0, frameRate, false);
    });

    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click", function() {
        // Stop any running animations on the ball
        scene.stopAnimation(ball);
        
        // Reset position to center
        ball.position = new BABYLON.Vector3(0, 0.75, 0);
        
        // Reset rotation if any (though we aren't rotating it yet)
        ball.rotation = new BABYLON.Vector3(0, 0, 0);
    });

    return scene;
};

const scene = createScene(); //Call the createScene function

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
    engine.resize();
});
