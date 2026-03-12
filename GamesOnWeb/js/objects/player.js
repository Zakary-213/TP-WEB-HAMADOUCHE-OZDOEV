const createPlayer = (scene, position, teamColor, meshIndex = 0) => {
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

            const playerMesh = meshes[meshIndex];

            playerMesh.parent = model;
            playerMesh.scaling = new BABYLON.Vector3(8,8,8);
            
            // Centrage dynamique du joueur basé sur sa géométrie
            // Ça enlève le décalage (offset) de base du fichier 3D, peu importe le skin sélectionné
            playerMesh.computeWorldMatrix(true);
            const centerLocal = playerMesh.getBoundingInfo().boundingBox.center;
            playerMesh.position.x = -centerLocal.x * 8;
            playerMesh.position.y = 0;
            playerMesh.position.z = -centerLocal.z * 8;

            // Orientation de base :
            // - équipe sur la gauche (side = 1) regarde vers +X
            // - équipe sur la droite (side = -1) regarde vers -X (vers l'adversaire)
            const side = wPlayer.side || 1;
            model.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
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
                if (index !== meshIndex && mesh !== playerMesh && mesh.parent !== playerMesh) {
                    mesh.dispose();
                }
            });
        }
    );

    // --- ENCAPSULATION DES MÉTHODES ---

    wPlayer.currentAnim = "idle";
    
    wPlayer.playAnimation = function(name) {
        if (!this.animations) return;
        if (this.currentAnim === name) return;

        for (let anim in this.animations) {
            this.animations[anim].stop();
        }

        if (this.animations[name]) {
            this.animations[name].start(true);
            this.currentAnim = name;
        }
    };

    wPlayer.move = function(moveX, moveZ, speed) {
        if (moveX !== 0 || moveZ !== 0) {
            this.playAnimation("run");
            
            // Normalisation pour ne pas aller plus vite en diagonale
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            const normX = moveX / length;
            const normZ = moveZ / length;

            this.position.x += normX * speed;
            this.position.z += normZ * speed;

            // Rotation du modèle vers la direction
            if (this.model) {
                const angle = Math.atan2(normZ, normX);
                const targetRotation = -angle;

                this.model.rotation.z = BABYLON.Scalar.Lerp(
                    this.model.rotation.z,
                    targetRotation,
                    0.15
                );
            }

            // Retourner la direction pour la logique externe (tir, collision)
            return new BABYLON.Vector3(normX, 0, normZ);
        } else {
            this.playAnimation("idle");
            return null; // Pas de mouvement
        }
    };

    return wPlayer;
};