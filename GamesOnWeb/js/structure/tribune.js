class Tribune {
    constructor(scene) {
        this.scene = scene;
        this.stadiumRoot = new BABYLON.TransformNode("stadiumRoot", scene);

        // Paramètres par défaut de la structure de base
        this.pitchWidth = 100;
        this.pitchHeight = 60;
        this.margin = 5;
        
        this.rowsPerTier = 12;
        this.numTiers = 3;
        this.rowHeight = 0.6;
        this.rowDepth = 1.0;
        this.tierGapHeight = 2.5;
        this.tierGapDepth = 2.0;

        this.initMaterials();
        this.calculateDimensions();
    }

    calculateDimensions() {
        this.innerX = this.pitchWidth / 2 + this.margin;
        this.innerZ = this.pitchHeight / 2 + this.margin;
        this.standDepth = this.numTiers * (this.rowsPerTier * this.rowDepth) + (this.numTiers - 1) * this.tierGapDepth;

        this.maxY = (this.numTiers - 1) * (this.rowsPerTier * this.rowHeight + this.tierGapHeight) + (this.rowsPerTier - 1) * this.rowHeight;
        this.roofHeight = this.maxY + 10;
        this.towerHeight = this.roofHeight + 5;
    }

    initMaterials() {
        this.blueSeatMaterial = new BABYLON.PBRMaterial("blueSeatMat", this.scene);
        this.blueSeatMaterial.albedoColor = new BABYLON.Color3(0.05, 0.2, 0.8);
        this.blueSeatMaterial.roughness = 0.7;

        this.redSeatMaterial = new BABYLON.PBRMaterial("redSeatMat", this.scene);
        this.redSeatMaterial.albedoColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        this.redSeatMaterial.roughness = 0.7;

        this.whiteSeatMaterial = new BABYLON.PBRMaterial("whiteSeatMat", this.scene);
        this.whiteSeatMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        this.whiteSeatMaterial.roughness = 0.7;

        this.goldSeatMaterial = new BABYLON.PBRMaterial("goldSeatMat", this.scene);
        this.goldSeatMaterial.albedoColor = new BABYLON.Color3(1.0, 0.84, 0.0);
        this.goldSeatMaterial.metallic = 0.8;
        this.goldSeatMaterial.roughness = 0.3;

        this.concreteMaterial = new BABYLON.PBRMaterial("concreteMat", this.scene);
        this.concreteMaterial.albedoColor = new BABYLON.Color3(0.65, 0.65, 0.65);
        this.concreteMaterial.roughness = 0.9;

        this.roofMaterial = new BABYLON.PBRMaterial("roofMat", this.scene);
        this.roofMaterial.albedoColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        this.roofMaterial.alpha = 0.6;

        this.trussMaterial = new BABYLON.PBRMaterial("trussMat", this.scene);
        this.trussMaterial.albedoColor = new BABYLON.Color3(0.8, 0.05, 0.05); 
        this.trussMaterial.metallic = 0.5;
        this.trussMaterial.roughness = 0.4;

        this.adMaterial = new BABYLON.PBRMaterial("adMat", this.scene);
        this.adMaterial.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.05); 
        this.adMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);  
        this.adMaterial.emissiveIntensity = 1.2;

        // Par défaut, toutes les tribunes ont un toit
        this.hasRoof = true;
    }

    createSideStand(name, length, position, rotationY, teamColor) {
        const standGroup = new BABYLON.TransformNode(name, this.scene);
        standGroup.parent = this.stadiumRoot;
        standGroup.position = position;
        standGroup.rotation.y = rotationY;

        const aisleWidth = 1.5;
        const numSections = 5;
        const sectionLength = (length - (numSections - 1) * aisleWidth) / numSections;

        for (let t = 0; t < this.numTiers; t++) {
            const tierBaseY = t * (this.rowsPerTier * this.rowHeight + this.tierGapHeight);
            const tierBaseZ = t * (this.rowsPerTier * this.rowDepth + this.tierGapDepth);

            // Mur de soutènement
            if (t > 0) {
                const wall = BABYLON.MeshBuilder.CreateBox(name + "_wall_" + t, {
                    width: length, height: this.tierGapHeight + 1, depth: 0.5
                }, this.scene);
                wall.position = new BABYLON.Vector3(0, tierBaseY - this.tierGapHeight / 2 + 0.5, tierBaseZ - 0.25);
                wall.material = this.concreteMaterial;
                wall.parent = standGroup;
            }

            for (let r = 0; r < this.rowsPerTier; r++) {
                let seatMat;
                if (teamColor === "blue") {
                    seatMat = this.blueSeatMaterial;
                } else if (teamColor === "red") {
                    seatMat = this.redSeatMaterial;
                } else if (teamColor === "white") {
                    seatMat = this.whiteSeatMaterial;
                } else if (teamColor === "gold") {
                    seatMat = this.goldSeatMaterial;
                } else {
                    seatMat = this.concreteMaterial;
                }
                const y = tierBaseY + r * this.rowHeight + this.rowHeight / 2;
                const z = tierBaseZ + r * this.rowDepth + this.rowDepth / 2;

                for (let s = 0; s < numSections; s++) {
                    const box = BABYLON.MeshBuilder.CreateBox(`${name}_t${t}_r${r}_s${s}`, {
                        width: sectionLength, height: this.rowHeight, depth: this.rowDepth
                    }, this.scene);
                    const xCenter = -length / 2 + sectionLength / 2 + s * (sectionLength + aisleWidth);
                    box.position = new BABYLON.Vector3(xCenter, y, z);
                    box.material = seatMat;
                    box.parent = standGroup;
                }

                if (r < this.rowsPerTier - 1) { // Escaliers
                    for (let a = 0; a < numSections - 1; a++) {
                        const stair = BABYLON.MeshBuilder.CreateBox(`${name}_t${t}_r${r}_stair${a}`, {
                            width: aisleWidth, height: this.rowHeight * 0.7, depth: this.rowDepth
                        }, this.scene);
                        const xOffset = -length / 2 + sectionLength + aisleWidth / 2 + a * (sectionLength + aisleWidth);
                        stair.position = new BABYLON.Vector3(xOffset, y - this.rowHeight * 0.15, z);
                        stair.material = this.concreteMaterial;
                        stair.parent = standGroup;
                    }
                }
            }
        }

        // Bande publicitaire
        const adBoard = BABYLON.MeshBuilder.CreateBox(name + "_adBoard", {
            width: length, height: 1.2, depth: 0.3
        }, this.scene);
        adBoard.position = new BABYLON.Vector3(0, 0.6, -0.5); 
        adBoard.material = this.adMaterial;
        adBoard.parent = standGroup;

        // Le toit (optionnel, peut être désactivé par les sous-classes)
        if (this.hasRoof) {
            const roof = BABYLON.MeshBuilder.CreatePlane(name + "_roof", { width: length, height: this.standDepth + 10 }, this.scene);
            roof.material = this.roofMaterial;
            roof.rotation.x = Math.PI / 2 - 0.1; // Légère inclinaison
            roof.position = new BABYLON.Vector3(0, this.roofHeight, this.standDepth / 2 - 5);
            roof.parent = standGroup;
        }

        return standGroup;
    }

    createCornerTower(name, x, z) {
        const radius = 22; 
        const tower = BABYLON.MeshBuilder.CreateCylinder(name, {
            height: this.towerHeight,
            diameter: radius * 2
        }, this.scene);
        tower.position = new BABYLON.Vector3(x, this.towerHeight / 2, z);
        tower.material = this.concreteMaterial;
        tower.parent = this.stadiumRoot;

        for (let i = 2; i < this.towerHeight - 5; i += 4) {
            const ramp = BABYLON.MeshBuilder.CreateTorus(name + "_ramp_" + i, {
                diameter: (radius * 2) + 1.5,
                thickness: 1.5,
                tessellation: 32
            }, this.scene);
            ramp.position = new BABYLON.Vector3(x, i, z);
            ramp.material = this.concreteMaterial;
            ramp.parent = this.stadiumRoot;
        }
    }

    startLEDAnimation() {
        let time = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            time += 0.04;
            this.adMaterial.emissiveIntensity = 1.1 + Math.sin(time) * 0.15;
        });
    }

    create() {
        console.warn("La méthode create() doit être implémentée par les classes enfants.");
        return this.stadiumRoot;
    }
}
