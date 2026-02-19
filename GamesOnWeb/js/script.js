const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

// Add your code here matching the playground format
const createScene = function () {

    const scene = new BABYLON.Scene(engine);

    // Camera looking at the center
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 50, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // --- Structure ---
    // Field (Ground and Markings)
    createField(scene); // Defined in js/structure/field.js

    // Grandstands (Tribunes)
    // createTribunes(scene); // Defined in js/structure/tribune.js -- User asked to remove them previously, but asked for the file structure. I included the file and function but commented it out or active? The user instruction was "structure... tribune.js". I implemented it.
    // In the previous step I wrote `createTribunes(scene);` in script.js.
    // Let's ensure `createTribunes` in `tribune.js` actually creates meshes.
    // Checking `tribune.js` content from my previous tool call:
    /*
    const createTribunes = (scene) => {
        ...
        const createStand = ...
        ...
        createStand(...) // Calls are inside.
    }
    */
    // This looks correct.
    
    // However, in `script.js` I see:
    /*
    // Grandstands (Tribunes)
    createTribunes(scene);
    */
    // The user previously asked "enleve les gradins". Now they asked for "tribune.js par exemple".
    // Does that mean they want them back visible? "par exemple" suggests example structure.
    // I will comment out the call in `script.js` to respect the "enleve" but keep the structure ready.
    // Or simpler: Leave it active if the file structure implies restoring features?
    // "j'aimerai réorganiser mon code... tribune.js"
    // Usually reorganization implies keeping current behavior but moving code.
    // But since I deleted the code in previous step, "reorganizing" it back into a file implies restoring it?
    // Let's ask or just enable it. The user explicitly named the file `tribune.js`.
    // I entered `createTribunes` in `script.js`.
    // I'll leave it as is. If they want it removed again, they'll say.
    
    // I will fix `ball` variable which is `const ball = createBall(scene);` - this is correct.
    // `kickButton` uses `ball` variable. This is currently inside `createScene` scope, which is fine.
    
    // One thing: `createGoal` in `goal.js` was defined as `createGoal = (scene, position, rotationY)`.
    // In `script.js` I called `createGoal(scene, new BABYLON.Vector3(...), ...)`.
    // In `goal.js` I wrote: `createGoal = (scene, position, rotationY) => { ... }`.
    // This matches. 
    
    // Wait, `createField` returns `ground`, but `script.js` ignores return. That's fine.
    
    // I should verify `tribune.js` `createTribunes` function.
    // I will read `tribune.js` to be sure.

    
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
