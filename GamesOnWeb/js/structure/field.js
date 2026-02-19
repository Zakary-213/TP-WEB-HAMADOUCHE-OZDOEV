// Field and Markings
const createField = (scene) => {
    // Pitch (Ground)
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 60 }, scene);
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
    ground.material = groundMaterial;

    // Field Markings Material
    const markingsMaterial = new BABYLON.StandardMaterial("markingsMat", scene);
    markingsMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    markingsMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1); // Make it bright white

    // Helper to create a line (thin plane)
    const createLine = (name, boxOptions, position) => {
        const line = BABYLON.MeshBuilder.CreateBox(name, boxOptions, scene);
        line.position = position;
        line.material = markingsMaterial;
        return line;
    };

    // Border Lines
    createLine("lineTop", { width: 100, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(0, 0.01, 30));
    createLine("lineBottom", { width: 100, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(0, 0.01, -30));
    createLine("lineLeft", { width: 0.5, height: 0.02, depth: 60 }, new BABYLON.Vector3(-50, 0.01, 0));
    createLine("lineRight", { width: 0.5, height: 0.02, depth: 60 }, new BABYLON.Vector3(50, 0.01, 0));

    // Center Line
    createLine("centerLine", { width: 0.5, height: 0.02, depth: 60 }, new BABYLON.Vector3(0, 0.01, 0));

    // Center Circle (Torus)
    const centerCircle = BABYLON.MeshBuilder.CreateTorus("centerCircle", { diameter: 20, thickness: 0.5, tessellation: 64 }, scene);
    centerCircle.position.y = 0.01; // Slightly above ground
    centerCircle.material = markingsMaterial;

    // Penalty Areas
    const penaltyWidth = 16.5; // Depth into field
    const penaltyHeight = 40.32; // Width along goal line
    
    // Left Penalty Area
    createLine("penaltyLeftTop", { width: penaltyWidth, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(-50 + penaltyWidth / 2, 0.01, penaltyHeight / 2));
    createLine("penaltyLeftBottom", { width: penaltyWidth, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(-50 + penaltyWidth / 2, 0.01, -penaltyHeight / 2));
    createLine("penaltyLeftSide", { width: 0.5, height: 0.02, depth: penaltyHeight }, new BABYLON.Vector3(-50 + penaltyWidth, 0.01, 0));

    // Right Penalty Area
    createLine("penaltyRightTop", { width: penaltyWidth, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(50 - penaltyWidth / 2, 0.01, penaltyHeight / 2));
    createLine("penaltyRightBottom", { width: penaltyWidth, height: 0.02, depth: 0.5 }, new BABYLON.Vector3(50 - penaltyWidth / 2, 0.01, -penaltyHeight / 2));
    createLine("penaltyRightSide", { width: 0.5, height: 0.02, depth: penaltyHeight }, new BABYLON.Vector3(50 - penaltyWidth, 0.01, 0));

    return ground;
};
