// Player
const createPlayer = (scene, position, teamColor) => {
    // Player Group (Parent Node)
    const wPlayer = new BABYLON.TransformNode("player", scene);
    wPlayer.position = position;

    // Simple spherical player (plus besoin de player.glb)
    const playerMesh = BABYLON.MeshBuilder.CreateSphere("playerMesh", { diameter: 2 }, scene);
    playerMesh.scaling = new BABYLON.Vector3(2, 2, 2);
    playerMesh.position = new BABYLON.Vector3(0, 0, 0);
    playerMesh.parent = wPlayer;

    const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
    playerMat.diffuseColor = teamColor;
    playerMat.emissiveColor = teamColor.scale(0.5);
    playerMesh.material = playerMat;

    // Team Indicator (Disc on ground)
    const teamDisc = BABYLON.MeshBuilder.CreateDisc("teamDisc", { radius: 0.9, tessellation: 16 }, scene);
    teamDisc.rotation.x = Math.PI / 2;
    teamDisc.position.y = 0.05; // Slightly above ground to avoid z-fighting
    teamDisc.parent = wPlayer;

    const discMaterial = new BABYLON.StandardMaterial("discMat", scene);
    discMaterial.diffuseColor = teamColor;
    discMaterial.emissiveColor = teamColor; // Glow
    teamDisc.material = discMaterial;

    return wPlayer;
};
