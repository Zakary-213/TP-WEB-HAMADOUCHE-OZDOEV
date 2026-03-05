const createTribunes = (scene) => {
    const stadiumRoot = new BABYLON.TransformNode("stadiumRoot", scene);

    // 1. MATÉRIAUX
    const blueSeatMaterial = new BABYLON.PBRMaterial("blueSeatMat", scene);
    blueSeatMaterial.albedoColor = new BABYLON.Color3(0.05, 0.2, 0.8);
    blueSeatMaterial.roughness = 0.7;

    const redSeatMaterial = new BABYLON.PBRMaterial("redSeatMat", scene);
    redSeatMaterial.albedoColor = new BABYLON.Color3(0.8, 0.1, 0.1);
    redSeatMaterial.roughness = 0.7;

    const concreteMaterial = new BABYLON.PBRMaterial("concreteMat", scene);
    concreteMaterial.albedoColor = new BABYLON.Color3(0.65, 0.65, 0.65); // Béton un peu plus clair
    concreteMaterial.roughness = 0.9;

    const roofMaterial = new BABYLON.PBRMaterial("roofMat", scene);
    roofMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    roofMaterial.alpha = 0.6; // Toit plus translucide pour laisser voir la structure

    // Le fameux rouge des poutres de San Siro
    const trussMaterial = new BABYLON.PBRMaterial("trussMat", scene);
    trussMaterial.albedoColor = new BABYLON.Color3(0.8, 0.05, 0.05); 
    trussMaterial.metallic = 0.5;
    trussMaterial.roughness = 0.4;

    const adMaterial = new BABYLON.PBRMaterial("adMat", scene);
    adMaterial.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.05); 
    adMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);  
    adMaterial.emissiveIntensity = 1.2;

    // Dimensions de base
    const pitchWidth = 100;
    const pitchHeight = 60;
    const margin = 5;
    
    // Configuration des gradins
    const rowsPerTier = 12;
    const numTiers = 3;
    const rowHeight = 0.6;
    const rowDepth = 1.0;
    const tierGapHeight = 2.5;
    const tierGapDepth = 2.0;

    // Calculs de profondeur pour encastrer parfaitement les éléments
    const innerX = pitchWidth / 2 + margin;  // 55
    const innerZ = pitchHeight / 2 + margin; // 35
    const standDepth = numTiers * (rowsPerTier * rowDepth) + (numTiers - 1) * tierGapDepth; // 40

    // LA HAUTEUR MAX DU STADE (calculée pour aligner le toit et les tours)
    const maxY = (numTiers - 1) * (rowsPerTier * rowHeight + tierGapHeight) + (rowsPerTier - 1) * rowHeight; // ~26
    const roofHeight = maxY + 10;
    const towerHeight = roofHeight + 5;

    // --- FONCTION TRIBUNES ---
    const createSideStand = (name, length, position, rotationY, teamColor) => {
        const standGroup = new BABYLON.TransformNode(name, scene);
        standGroup.parent = stadiumRoot;
        standGroup.position = position;
        standGroup.rotation.y = rotationY;

        const aisleWidth = 1.5;
        const numSections = 5;
        const sectionLength = (length - (numSections - 1) * aisleWidth) / numSections;

        for (let t = 0; t < numTiers; t++) {
            const tierBaseY = t * (rowsPerTier * rowHeight + tierGapHeight);
            const tierBaseZ = t * (rowsPerTier * rowDepth + tierGapDepth);

            // Mur de soutènement
            if (t > 0) {
                const wall = BABYLON.MeshBuilder.CreateBox(name + "_wall_" + t, {
                    width: length, height: tierGapHeight + 1, depth: 0.5
                }, scene);
                wall.position = new BABYLON.Vector3(0, tierBaseY - tierGapHeight / 2 + 0.5, tierBaseZ - 0.25);
                wall.material = concreteMaterial;
                wall.parent = standGroup;
            }

            for (let r = 0; r < rowsPerTier; r++) {
                const seatMat = (teamColor === "blue") ? blueSeatMaterial : redSeatMaterial;
                const y = tierBaseY + r * rowHeight + rowHeight / 2;
                const z = tierBaseZ + r * rowDepth + rowDepth / 2;

                for (let s = 0; s < numSections; s++) {
                    const box = BABYLON.MeshBuilder.CreateBox(`${name}_t${t}_r${r}_s${s}`, {
                        width: sectionLength, height: rowHeight, depth: rowDepth
                    }, scene);
                    const xCenter = -length / 2 + sectionLength / 2 + s * (sectionLength + aisleWidth);
                    box.position = new BABYLON.Vector3(xCenter, y, z);
                    box.material = seatMat;
                    box.parent = standGroup;
                }

                if (r < rowsPerTier - 1) { // Escaliers
                    for (let a = 0; a < numSections - 1; a++) {
                        const stair = BABYLON.MeshBuilder.CreateBox(`${name}_t${t}_r${r}_stair${a}`, {
                            width: aisleWidth, height: rowHeight * 0.7, depth: rowDepth
                        }, scene);
                        const xOffset = -length / 2 + sectionLength + aisleWidth / 2 + a * (sectionLength + aisleWidth);
                        stair.position = new BABYLON.Vector3(xOffset, y - rowHeight * 0.15, z);
                        stair.material = concreteMaterial;
                        stair.parent = standGroup;
                    }
                }
            }
        }

        // Bande publicitaire parfaitement alignée (même longueur que la tribune)
        const adBoard = BABYLON.MeshBuilder.CreateBox(name + "_adBoard", {
            width: length, height: 1.2, depth: 0.3
        }, scene);
        adBoard.position = new BABYLON.Vector3(0, 0.6, -0.5); 
        adBoard.material = adMaterial;
        adBoard.parent = standGroup;

        // Le toit (plus de piliers moches à l'arrière, les tours gèrent ça visuellement)
        const roof = BABYLON.MeshBuilder.CreatePlane(name + "_roof", { width: length, height: standDepth + 10 }, scene);
        roof.material = roofMaterial;
        roof.rotation.x = Math.PI / 2 - 0.1; // Légère inclinaison
        roof.position = new BABYLON.Vector3(0, roofHeight, standDepth / 2 - 5);
        roof.parent = standGroup;

        return standGroup;
    };

    // --- FONCTION TOURS SAN SIRO ---
    const createCornerTower = (name, x, z) => {
        // Un très gros cylindre pour boucher l'angle et soutenir visuellement le toit
        const radius = 22; 
        const tower = BABYLON.MeshBuilder.CreateCylinder(name, {
            height: towerHeight,
            diameter: radius * 2
        }, scene);
        tower.position = new BABYLON.Vector3(x, towerHeight / 2, z);
        tower.material = concreteMaterial;
        tower.parent = stadiumRoot;

        // Les fameuses rampes hélicoïdales de San Siro (simulées par des anneaux toriques)
        for (let i = 2; i < towerHeight - 5; i += 4) {
            const ramp = BABYLON.MeshBuilder.CreateTorus(name + "_ramp_" + i, {
                diameter: (radius * 2) + 1.5,
                thickness: 1.5,
                tessellation: 32
            }, scene);
            ramp.position = new BABYLON.Vector3(x, i, z);
            ramp.material = concreteMaterial;
            ramp.parent = stadiumRoot;
        }
    };

    // --- ASSEMBLAGE PARFAIT (Zéro dépassement) ---
    // Les tribunes font exactement la taille du terrain pour former une croix parfaite.
    const pitchLengthX = innerX * 2; // 110
    const pitchLengthZ = innerZ * 2; // 70

    createSideStand("northStand", pitchLengthX, new BABYLON.Vector3(0, 0, innerZ), 0, "blue");
    createSideStand("southStand", pitchLengthX, new BABYLON.Vector3(0, 0, -innerZ), Math.PI, "red");
    createSideStand("eastStand", pitchLengthZ, new BABYLON.Vector3(innerX, 0, 0), Math.PI / 2, "blue");
    createSideStand("westStand", pitchLengthZ, new BABYLON.Vector3(-innerX, 0, 0), -Math.PI / 2, "red");

    // Création des 4 tours dans les 4 angles "vides"
    const towerX = innerX + standDepth / 2; // 55 + 20 = 75
    const towerZ = innerZ + standDepth / 2; // 35 + 20 = 55
    createCornerTower("towerNE", towerX, towerZ);
    createCornerTower("towerNW", -towerX, towerZ);
    createCornerTower("towerSE", towerX, -towerZ);
    createCornerTower("towerSW", -towerX, -towerZ);

    // --- STRUCTURE ROUGE DU TOIT (La touche finale San Siro) ---
    const trussThickness = 4;
    
    // Poutres au-dessus des tribunes Nord/Sud
    const trussNS1 = BABYLON.MeshBuilder.CreateBox("trussNS1", { width: towerX * 2.2, height: trussThickness, depth: trussThickness }, scene);
    trussNS1.position = new BABYLON.Vector3(0, towerHeight + 2, towerZ);
    trussNS1.material = trussMaterial;
    trussNS1.parent = stadiumRoot;

    const trussNS2 = BABYLON.MeshBuilder.CreateBox("trussNS2", { width: towerX * 2.2, height: trussThickness, depth: trussThickness }, scene);
    trussNS2.position = new BABYLON.Vector3(0, towerHeight + 2, -towerZ);
    trussNS2.material = trussMaterial;
    trussNS2.parent = stadiumRoot;

    // Poutres au-dessus des tribunes Est/Ouest (plus hautes pour croiser les autres)
    const trussEW1 = BABYLON.MeshBuilder.CreateBox("trussEW1", { width: trussThickness, height: trussThickness, depth: towerZ * 2.2 }, scene);
    trussEW1.position = new BABYLON.Vector3(towerX, towerHeight + trussThickness + 2, 0);
    trussEW1.material = trussMaterial;
    trussEW1.parent = stadiumRoot;

    const trussEW2 = BABYLON.MeshBuilder.CreateBox("trussEW2", { width: trussThickness, height: trussThickness, depth: towerZ * 2.2 }, scene);
    trussEW2.position = new BABYLON.Vector3(-towerX, towerHeight + trussThickness + 2, 0);
    trussEW2.material = trussMaterial;
    trussEW2.parent = stadiumRoot;

    // Animation LED toujours présente
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        time += 0.04;
        adMaterial.emissiveIntensity = 1.1 + Math.sin(time) * 0.15;
    });

    return stadiumRoot;
};