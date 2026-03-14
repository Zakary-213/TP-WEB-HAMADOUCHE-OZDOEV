// Ball
// Implémentation prête pour un ballon en .glb
// - Tu peux changer `ballRootUrl` et `ballFileName` selon l'emplacement / nom de ton fichier.
// - On garde une petite sphère de secours qui disparaît quand le .glb est chargé.
const createBall = (scene) => {
    // Nœud racine du ballon (c'est lui qui est animé et déplacé dans script.js)
    const ball = new BABYLON.TransformNode("ball", scene);
    ball.position = new BABYLON.Vector3(0, 0.75, 0);

    // Vitesse personnalisée pour la physique simple (tir, rebonds)
    ball.velocity = new BABYLON.Vector3(0, 0, 0);

    // Placeholder sphérique au cas où le .glb met du temps à charger
    const placeholder = BABYLON.MeshBuilder.CreateSphere("ballPlaceholder", { diameter: 1.1 }, scene);
    placeholder.parent = ball;
    const ballMaterial = new BABYLON.StandardMaterial("ballMat", scene);
    ballMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    placeholder.material = ballMaterial;

    // Chemin et nom du fichier GLB à adapter par toi
    const ballRootUrl = "textures/";         
    const ballFileName = "football_anime.glb"; 

    BABYLON.SceneLoader.ImportMesh(
        "",
        ballRootUrl,
        ballFileName,
        scene,
        (meshes) => {
            if (!meshes || meshes.length === 0) {
                return;
            }

            // On groupe les meshes du .glb sous le nœud "ball" pour qu'il suive les animations existantes
            meshes.forEach((m) => {
                m.parent = ball;
            });

            // Optionnel: on peut ajuster l'échelle globale du ballon importé ici
            ball.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);

            // On masque la sphère de secours une fois le .glb chargé
            placeholder.setEnabled(false);
        }
    );

    // --- Rotation automatique : le ballon roule dans le sens de son déplacement ---
    let lastPosition = ball.position.clone();
    const radius = 0.55; // rayon approximatif du ballon (diamètre 1.1)

    scene.onBeforeRenderObservable.add(() => {
        const current = ball.position.clone();
        const delta = current.subtract(lastPosition);
        // On ne regarde que le déplacement au sol (XZ)
        const dx = delta.x;
        const dz = delta.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 0.0001) {
            // Direction de déplacement dans le plan XZ
            const moveDir = new BABYLON.Vector3(dx, 0, dz).normalize();
            // Axe de rotation = direction de déplacement x up (0,1,0)
            const up = new BABYLON.Vector3(0, 1, 0);
            let axis = BABYLON.Vector3.Cross(moveDir, up);
            if (axis.lengthSquared() > 0.0001) {
                axis = axis.normalize();
                // angle de rotation = distance / rayon (roulement sans glissement)
                const angle = distance / radius;
                ball.rotate(axis, angle, BABYLON.Space.WORLD);
            }
        }

        lastPosition.copyFrom(current);
    });

    return ball;
};
