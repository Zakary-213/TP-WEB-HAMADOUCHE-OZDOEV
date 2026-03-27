class TribuneDemi extends Tribune {
    constructor(scene) {
        super(scene);
        // Demi : encore un peu plus remplie que le quart
        this.crowdDensity = 0.8;
        // Vous pouvez par exemple changer le nombre d'étages ou la taille pour la demi-finale si vous le souhaitez:
        // this.numTiers = 2; // Demi finale plus petite par exemple
        // this.calculateDimensions(); // recalculer les dimensions si on change un paramètre
    }

    create() {
        // --- ASSEMBLAGE PARFAIT (Zéro dépassement) ---
        // Les tribunes font exactement la taille du terrain pour former une croix parfaite.
        const pitchLengthX = this.innerX * 2; // 110
        const pitchLengthZ = this.innerZ * 2; // 70

        this.createSideStand("northStand", pitchLengthX, new BABYLON.Vector3(0, 0, this.innerZ), 0, "blue");
        this.createSideStand("southStand", pitchLengthX, new BABYLON.Vector3(0, 0, -this.innerZ), Math.PI, "red");
        this.createSideStand("eastStand", pitchLengthZ, new BABYLON.Vector3(this.innerX, 0, 0), Math.PI / 2, "blue");
        this.createSideStand("westStand", pitchLengthZ, new BABYLON.Vector3(-this.innerX, 0, 0), -Math.PI / 2, "red");

        // Création des 4 tours dans les 4 angles "vides"
        const towerX = this.innerX + this.standDepth / 2; // 55 + 20 = 75
        const towerZ = this.innerZ + this.standDepth / 2; // 35 + 20 = 55
        this.createCornerTower("towerNE", towerX, towerZ);
        this.createCornerTower("towerNW", -towerX, towerZ);
        this.createCornerTower("towerSE", towerX, -towerZ);
        this.createCornerTower("towerSW", -towerX, -towerZ);

        // --- STRUCTURE ROUGE DU TOIT (La touche finale San Siro) ---
        const trussThickness = 4;
        
        // Poutres au-dessus des tribunes Nord/Sud
        const trussNS1 = BABYLON.MeshBuilder.CreateBox("trussNS1", { width: towerX * 2.2, height: trussThickness, depth: trussThickness }, this.scene);
        trussNS1.position = new BABYLON.Vector3(0, this.towerHeight + 2, towerZ);
        trussNS1.material = this.trussMaterial;
        trussNS1.parent = this.stadiumRoot;

        const trussNS2 = BABYLON.MeshBuilder.CreateBox("trussNS2", { width: towerX * 2.2, height: trussThickness, depth: trussThickness }, this.scene);
        trussNS2.position = new BABYLON.Vector3(0, this.towerHeight + 2, -towerZ);
        trussNS2.material = this.trussMaterial;
        trussNS2.parent = this.stadiumRoot;

        // Poutres au-dessus des tribunes Est/Ouest (plus hautes pour croiser les autres)
        const trussEW1 = BABYLON.MeshBuilder.CreateBox("trussEW1", { width: trussThickness, height: trussThickness, depth: towerZ * 2.2 }, this.scene);
        trussEW1.position = new BABYLON.Vector3(towerX, this.towerHeight + trussThickness + 2, 0);
        trussEW1.material = this.trussMaterial;
        trussEW1.parent = this.stadiumRoot;

        const trussEW2 = BABYLON.MeshBuilder.CreateBox("trussEW2", { width: trussThickness, height: trussThickness, depth: towerZ * 2.2 }, this.scene);
        trussEW2.position = new BABYLON.Vector3(-towerX, this.towerHeight + trussThickness + 2, 0);
        trussEW2.material = this.trussMaterial;
        trussEW2.parent = this.stadiumRoot;

        // Animation LED toujours présente + foule animée
        this.startLEDAnimation();
        if (this.crowd && typeof this.crowd.startAnimation === "function") {
            this.crowd.startAnimation();
        }

        return this.stadiumRoot;
    }
}