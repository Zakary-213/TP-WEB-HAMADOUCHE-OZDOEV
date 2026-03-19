const setupCameras = (scene, canvas, playerNode) => {
    // Node intermédiaire pour lisser le suivi caméra
    const cameraTargetNode = new BABYLON.TransformNode("cameraTargetNode", scene);
    cameraTargetNode.position.copyFrom(playerNode.position);

    // 1. Caméra de dessus (Third Person Shooter / Globale)
    const tpsCamera = new BABYLON.ArcRotateCamera(
        "tpsCamera",
        Math.PI,
        0.01,
        60, // Distance camera par défaut 60
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    // On centre la caméra globale sur le joueur
    tpsCamera.lockedTarget = cameraTargetNode;
    tpsCamera.inputs.clear(); // Désactive la souris pour cette caméra

    // 1.b Caméra latérale type retransmission (style FIFA)
    const broadcastCamera = new BABYLON.ArcRotateCamera(
        "broadcastCamera",
        -Math.PI / 2,
        1.05,
        90,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    broadcastCamera.lockedTarget = cameraTargetNode;
    broadcastCamera.inputs.clear();
    broadcastCamera.fov = 0.72;

    // 2. Caméra à la première personne (First Person View)
    const fpvCamera = new BABYLON.UniversalCamera(
        "fpvCamera",
        new BABYLON.Vector3(0, 4.3, 0), // Au niveau des yeux (baissé de 8 à 4)
        scene
    );
    
    // On attache la caméra au TransformNode global du joueur
    fpvCamera.parent = playerNode;
    
    // On lui donne un angle de vue naturel
    fpvCamera.fov = 1.2;

    // Coupe l'affichage des parties du modèle trop proches de la caméra
    // (évite de voir l'intérieur du maillot / épaules quand le joueur bouge)
    fpvCamera.minZ = 1.2;

    // Orientation initiale de la caméra FPV : le joueur regarde devant lui au lancement
    fpvCamera.rotation.y = Math.PI / 2;

    // Activer les contrôles de la souris pour tourner la tête
    fpvCamera.attachControl(canvas, true);
    
    // Désactiver les touches directionnelles par defaut de la caméra 
    // (pour que ZQSD/WASD ne gère que les déplacements du joueur définis dans script.js)
    fpvCamera.keysUp = [];
    fpvCamera.keysDown = [];
    fpvCamera.keysLeft = [];
    fpvCamera.keysRight = [];

    // Définir la caméra active par défaut (Broadcast)
    scene.activeCamera = broadcastCamera;

    // Oriente la caméra FPV selon la direction actuelle du joueur
    // Cette fonction sert au moment où on passe en FPV
    function alignFpvToDirection(direction) {
        if (!direction || direction.lengthSquared() === 0) return;

        // Calcule l'angle horizontal à partir de la direction X/Z
        fpvCamera.rotation.y = Math.atan2(direction.x, direction.z);
    }

    // Petit système pour écouter des touches et changer de caméra
    let cameraMode = "broadcast"; // tps | fpv | broadcast
    window.addEventListener("keydown", (e) => {
        if (e.key === "c" || e.key === "C") {
            cameraMode = cameraMode === "fpv" ? "broadcast" : "fpv";
            scene.activeCamera = cameraMode === "fpv" ? fpvCamera : broadcastCamera;
        }

        if (e.key === "r" || e.key === "R") {
            cameraMode = cameraMode === "broadcast" ? "tps" : "broadcast";
            scene.activeCamera = cameraMode === "broadcast" ? broadcastCamera : tpsCamera;
        }
    });

    return { tpsCamera, broadcastCamera, fpvCamera, cameraTargetNode, alignFpvToDirection };

};
