class TribuneFinale extends Tribune {
    constructor(scene) {
        super(scene);

        // Finale : grande arène fermée, plus imposante que tous les autres tours
        this.numTiers = 4;        // Plus de niveaux que la demi
        this.rowsPerTier = 14;    // Beaucoup de rangées pour un "mur" de supporters
        this.tierGapHeight = 2.3; 
        this.rowHeight = 0.65;    // Pente réaliste mais bien haute
        this.hasRoof = false;     // Pas de toiture par tribune pour ce stade de finale

        this.calculateDimensions();
    }

    create() {
        // On garde un stade imposant, mais on laisse un espace entre les tribunes
        const lengthFactor = 0.9; // tribunes un peu plus courtes pour qu'elles ne se touchent pas
        const pitchLengthX = this.innerX * 2 * lengthFactor;
        const pitchLengthZ = this.innerZ * 2 * lengthFactor;

        // --- 1. TRIBUNES PRINCIPALES (tout en or pour la finale) ---
        this.createSideStand("northStandFinal", pitchLengthX, new BABYLON.Vector3(0, 0, this.innerZ), 0, "gold");
        this.createSideStand("southStandFinal", pitchLengthX, new BABYLON.Vector3(0, 0, -this.innerZ), Math.PI, "gold");
        this.createSideStand("eastStandFinal", pitchLengthZ, new BABYLON.Vector3(this.innerX, 0, 0), Math.PI / 2, "gold");
        this.createSideStand("westStandFinal", pitchLengthZ, new BABYLON.Vector3(-this.innerX, 0, 0), -Math.PI / 2, "gold");

        // --- 2. AURÉOLE DORÉE AUTOUR DU STADE (qui bouge) ---
        const haloRadius = this.innerX + this.standDepth + 10;
        const halo = BABYLON.MeshBuilder.CreateTorus("finalHalo", {
            diameter: haloRadius * 2,
            thickness: 4,
            tessellation: 64
        }, this.scene);
        halo.position = new BABYLON.Vector3(0, this.roofHeight + 12, 0);
        halo.parent = this.stadiumRoot;

        const haloMat = new BABYLON.StandardMaterial("finalHaloMat", this.scene);
        haloMat.emissiveColor = new BABYLON.Color3(1.0, 0.9, 0.4);
        haloMat.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.2);
        halo.material = haloMat;

        // Animation : l'auréole tourne autour du stade et pulse légèrement
        let haloAngle = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            haloAngle += dt * 0.5; // vitesse de rotation
            halo.rotation.y = haloAngle;

            const pulse = 0.8 + Math.sin(haloAngle * 2) * 0.2;
            haloMat.emissiveColor = new BABYLON.Color3(1.0 * pulse, 0.9 * pulse, 0.5 * pulse);
        });

        // --- 3. ANIMATIONS LED SUR LES BANDES PUB ---
        if (typeof this.startLEDAnimation === "function") {
            this.startLEDAnimation();
        }

        return this.stadiumRoot;
    }

    // --- NOUVELLE MÉTHODE : Création d'obélisques/pyramides d'angle ---
    createObelisks(innerX, innerZ) {
        const offsetDistX = innerX * 1.5;
        const offsetDistZ = innerZ * 1.5;
        const obeliskHeight = 40;

        const obeliskMat = new BABYLON.StandardMaterial("obeliskMat", this.scene);
        obeliskMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Roche sombre
        obeliskMat.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0.0); // Léger reflet doré

        const positions = [
            new BABYLON.Vector3(offsetDistX, obeliskHeight / 2, offsetDistZ),
            new BABYLON.Vector3(-offsetDistX, obeliskHeight / 2, offsetDistZ),
            new BABYLON.Vector3(offsetDistX, obeliskHeight / 2, -offsetDistZ),
            new BABYLON.Vector3(-offsetDistX, obeliskHeight / 2, -offsetDistZ)
        ];

        positions.forEach((pos, index) => {
            // Un obélisque est juste une pyramide très étirée
            const obelisk = BABYLON.MeshBuilder.CreateCylinder(`obelisk_${index}`, {
                height: obeliskHeight,
                diameterTop: 0.5, // Petite pointe coupée
                diameterBottom: 10, // Base solide
                tessellation: 4
            }, this.scene);
            
            obelisk.position = pos;
            obelisk.rotation.y = Math.PI / 4; // On oriente les faces vers le centre du terrain
            obelisk.material = obeliskMat;
            obelisk.parent = this.stadiumRoot;
        });
    }
}