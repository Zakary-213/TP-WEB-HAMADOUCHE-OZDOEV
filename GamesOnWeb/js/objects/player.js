const createPlayer = (scene, position, teamColor) => {

    const wPlayer = new BABYLON.TransformNode("player", scene);
    wPlayer.position = position;

    BABYLON.SceneLoader.ImportMesh(
        "",
        "textures/",
        "cricketers_pack_low_poly.glb",
        scene,
        function (meshes) {

            const model = new BABYLON.TransformNode("playerModel", scene);
            model.parent = wPlayer;

            const playerMesh = meshes[1]; // premier joueur du pack

            playerMesh.parent = model;
            playerMesh.scaling = new BABYLON.Vector3(8,8,8);
            playerMesh.position.x = 15.7;
            playerMesh.position.y = 0;
            model.rotation.y = Math.PI / 2;
            model.rotation.x = -Math.PI / 2;

            meshes.forEach((mesh, index) => {
                if (index !== 1 && mesh !== playerMesh) {
                    mesh.dispose();
                }
            });
        }
    );

    return wPlayer;
};