const createPlayer = (scene, position, teamColor, meshIndex = 0) => {
    const wPlayer = new BABYLON.TransformNode("player", scene);
    wPlayer.position = position;

    wPlayer.animations = {};
    wPlayer.wobbleTime = 0;
    wPlayer.isInFpv = false;

    BABYLON.SceneLoader.ImportMesh(
        "",
        "textures/",
        "cricketers_pack_low_poly.glb",
        scene,
        function (meshes, particleSystems, skeletons, animationGroups) {


            const model = new BABYLON.TransformNode("playerModel", scene);
            model.parent = wPlayer;

            const playerMesh = meshes[meshIndex];

            playerMesh.parent = model;
            playerMesh.scaling = new BABYLON.Vector3(8,8,8);
            
            // Centrage dynamique du joueur basé sur sa géométrie (X/Z)
            // Ça enlève le décalage (offset) de base du fichier 3D, peu importe le skin sélectionné
            playerMesh.computeWorldMatrix(true);
            const centerLocal = playerMesh.getBoundingInfo().boundingBox.center;
            playerMesh.position.x = -centerLocal.x * 8;
            playerMesh.position.z = -centerLocal.z * 8;

            // Orientation de base :
            // - équipe sur la gauche (side = 1) regarde vers +X
            // - équipe sur la droite (side = -1) regarde vers -X (vers l'adversaire)
            const side = wPlayer.side || 1;
            model.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
            model.rotation.x = -Math.PI / 2;

            // Ajuste la hauteur pour que les pieds soient au niveau du sol (y = 0)
            playerMesh.computeWorldMatrix(true);
            const bbox = playerMesh.getBoundingInfo().boundingBox;
            const minYWorld = bbox.minimumWorld.y;
            const offsetY = -minYWorld;
            model.position.y += offsetY;

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
            
            // Animation procédurale de dandinement ("wobble")
            const dt = scene.getEngine().getDeltaTime() / 1000;
            this.wobbleTime += dt * 15; // Vitesse de balancement
            
            // Normalisation pour ne pas aller plus vite en diagonale
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);

            // sécurité (évite NaN)
            if(length === 0){
                this.playAnimation("idle");
                return null;
            }

            this.playAnimation("run");

            const normX = moveX / length;
            const normZ = moveZ / length;

            this.position.x += normX * speed;
            this.position.z += normZ * speed;

            // Empêche le joueur de sortir des limites du terrain
            let minX = -49;
            let maxX = 49;
            const minZ = -29;
            const maxZ = 29;

            // Si le joueur est face au but (au centre sur l'axe Z), on agrandit la limite X
            if (this.position.z > -7.5 && this.position.z < 7.5) {
                minX = -54; // Profondeur du but (environ 4)
                maxX = 54;
            }

            if (this.position.x < minX) this.position.x = minX;
            if (this.position.x > maxX) this.position.x = maxX;
            if (this.position.z < minZ) this.position.z = minZ;
            if (this.position.z > maxZ) this.position.z = maxZ;

            // Rotation du modèle vers la direction
            if (this.model) {

                const angle = Math.atan2(normZ, normX);
                const targetRotation = -angle;

                this.model.rotation.z = BABYLON.Scalar.Lerp(
                    this.model.rotation.z,
                    targetRotation,
                    0.15
                );
                
                // Appliquer le wobble (balancement gauche / droite)
                // L'axe X du modèle est son "front/back" roll selon la setup
                const wobbleAmount = this.isInFpv ? 0.04 : 0.15;
                this.model.rotation.x = -Math.PI / 2 + Math.sin(this.wobbleTime) * wobbleAmount;
            }

            return new BABYLON.Vector3(normX, 0, normZ);
        }
        else {
            this.playAnimation("idle");
            
            // Revenir doucement à la position droite quand on s'arrête
            if (this.model) {
                this.model.rotation.x = BABYLON.Scalar.Lerp(this.model.rotation.x, -Math.PI / 2, 0.1);
            }
            
            return null; // Pas de mouvement
        }
    };

    return wPlayer;
};