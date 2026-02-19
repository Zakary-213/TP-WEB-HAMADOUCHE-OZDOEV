// Grandstands
const createTribunes = (scene) => {
    // Grandstands (Gradins)
    const standMaterial = new BABYLON.StandardMaterial("standMat", scene);
    standMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Concrete grey

    // Function to create a simple stand
    const createStand = (width, rows, position, rotationY) => {
        const standGroup = new BABYLON.TransformNode("standGroup", scene);
        standGroup.position = position;
        standGroup.rotation.y = rotationY;

        const stepDepth = 0.8;
        const stepHeight = 0.5;

        for (let i = 0; i < rows; i++) {
            const step = BABYLON.MeshBuilder.CreateBox("step" + i, { width: width, height: stepHeight, depth: stepDepth }, scene);
            // Stack steps going back and up
            step.position = new BABYLON.Vector3(0, (i * stepHeight) + stepHeight / 2, i * stepDepth);
            step.material = standMaterial;
            step.parent = standGroup;
        }
        
        // Add a back wall
        const backWallHeight = rows * stepHeight + 2;
        const backWall = BABYLON.MeshBuilder.CreateBox("standBack", {width: width, height: backWallHeight, depth: 0.2}, scene);
        backWall.position = new BABYLON.Vector3(0, backWallHeight/2, (rows * stepDepth) - stepDepth/2 + 0.1);
        backWall.material = standMaterial;
        backWall.parent = standGroup;

        return standGroup;
    };

    // Calculate positions based on pitch size (100x60) + some margin
    const pitchWidth = 100;
    const pitchHeight = 60;
    const margin = 5;

    // Long side stands (North and South)
    // Length should cover the pitch length
    createStand(110, 10, new BABYLON.Vector3(0, 0, (pitchHeight / 2) + margin), 0); // Top
    createStand(110, 10, new BABYLON.Vector3(0, 0, -(pitchHeight / 2) - margin), Math.PI); // Bottom

    // Short side stands (East and West) - Behind goals
    createStand(70, 15, new BABYLON.Vector3((pitchWidth / 2) + margin + 5, 0, 0), -Math.PI / 2); // Right
    createStand(70, 15, new BABYLON.Vector3(-(pitchWidth / 2) - margin - 5, 0, 0), Math.PI / 2); // Left
};
