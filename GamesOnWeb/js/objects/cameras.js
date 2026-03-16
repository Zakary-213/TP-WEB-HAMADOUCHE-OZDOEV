const setupCameras = (scene, canvas, playerNode) => {
    // 1. Caméra de dessus (Third Person Shooter / Globale)
    const tpsCamera = new BABYLON.ArcRotateCamera(
        "tpsCamera",
        Math.PI,
        0.01,
        150, // Distance camera par défaut 60
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    // On centre la caméra globale sur le joueur
    tpsCamera.lockedTarget = playerNode;
    tpsCamera.inputs.clear(); // Désactive la souris pour cette caméra

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

    // Activer les contrôles de la souris pour tourner la tête
    fpvCamera.attachControl(canvas, true);
    
    // Désactiver les touches directionnelles par defaut de la caméra 
    // (pour que ZQSD/WASD ne gère que les déplacements du joueur définis dans script.js)
    fpvCamera.keysUp = [];
    fpvCamera.keysDown = [];
    fpvCamera.keysLeft = [];
    fpvCamera.keysRight = [];

    // Définir la caméra active par défaut (Global)
    scene.activeCamera = tpsCamera;

    // Petit système pour écouter une touche et changer de caméra
    let isFpv = false;
    window.addEventListener("keydown", (e) => {
        if (e.key === "c" || e.key === "C") {
            isFpv = !isFpv;
            if (isFpv) {
                scene.activeCamera = fpvCamera;
                // Optionnel : masquer le joueur quand on est dedans
                if(playerNode.model) playerNode.model.setEnabled(false);
            } else {
                scene.activeCamera = tpsCamera;
                if(playerNode.model) playerNode.model.setEnabled(true);
            }
        }
    });

    return { tpsCamera, fpvCamera };
};
