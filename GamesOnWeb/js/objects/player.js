// Player
const createPlayer = (scene, position, teamColor) => {
    // Player Group (Parent Node)
    const wPlayer = new BABYLON.TransformNode("player", scene);
    wPlayer.position = position;

    // Load 3D Model (GLB)
    BABYLON.SceneLoader.ImportMesh("", "textures/", "player.glb", scene, function (meshes) {
        const playerMesh = meshes[0];
        
        // Scale and Position Adjustment
        playerMesh.scaling = new BABYLON.Vector3(1, 1, 1); // Adjust if needed
        playerMesh.position = new BABYLON.Vector3(0, 0, 0); // Local to wPlayer

        // Parent to our group so position logic still works
        playerMesh.parent = wPlayer;

        // Optionally prevent the model from casting/receiving shadows or other optimizations
    });

    // Team Indicator (Disc on ground)
    const teamDisc = BABYLON.MeshBuilder.CreateDisc("teamDisc", { radius: 0.4, tessellation: 16 }, scene);
    teamDisc.rotation.x = Math.PI / 2;
    teamDisc.position.y = 0.05; // Slightly above ground to avoid z-fighting
    teamDisc.parent = wPlayer;

    const discMaterial = new BABYLON.StandardMaterial("discMat", scene);
    discMaterial.diffuseColor = teamColor;
    discMaterial.emissiveColor = teamColor; // Glow
    teamDisc.material = discMaterial;

    return wPlayer;
};
