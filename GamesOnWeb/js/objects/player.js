const createPlayer = (scene, position, teamColor) => {
    const wPlayer = new BABYLON.TransformNode("player", scene);
    wPlayer.position = position;

    wPlayer.animations = {};

    BABYLON.SceneLoader.ImportMesh(
        "",
        "textures/",
        "cricketers_pack_low_poly.glb",
        scene,
        function (meshes, particleSystems, skeletons, animationGroups) {
            console.log("Animations trouvées :", animationGroups);


            const model = new BABYLON.TransformNode("playerModel", scene);
            model.parent = wPlayer;

            const playerMesh = meshes[1];

            playerMesh.parent = model;
            playerMesh.scaling = new BABYLON.Vector3(8,8,8);
            playerMesh.position.x = 15.7;
            playerMesh.position.y = 0;

            model.rotation.y = Math.PI / 2;
            model.rotation.x = -Math.PI / 2;

            wPlayer.model = model;

            // récupérer les animations
            animationGroups.forEach((anim) => {

                if(anim.name.toLowerCase().includes("idle"))
                    wPlayer.animations.idle = anim;

                if(anim.name.toLowerCase().includes("run") || anim.name.toLowerCase().includes("walk"))
                    wPlayer.animations.run = anim;

            });

            // animation par défaut
            if(wPlayer.animations.idle){
                wPlayer.animations.idle.start(true);
            }

            meshes.forEach((mesh, index) => {
                if (index !== 1 && mesh !== playerMesh) {
                    mesh.dispose();
                }
            });
        }
    );

    return wPlayer;
};