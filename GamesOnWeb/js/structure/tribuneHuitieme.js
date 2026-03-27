class TribuneHuitieme extends Tribune {
	constructor(scene) {
		super(scene);
		// Huitième de finale : stade plus modeste
		this.crowdDensity = 0.4; // pas trop de supporters
		this.numTiers = 2;      // un étage de moins
		this.rowsPerTier = 8;   // moins de rangées
		this.tierGapHeight = 2; // niveaux plus rapprochés
		this.hasRoof = false;   // pas de toit pour les huitièmes

		this.calculateDimensions();
	}

	create() {
		// Tribunes légèrement plus courtes que pour la demi
		const shrinkFactor = 0.8; // 80% de la longueur, mais même recul que la demi

		const pitchLengthX = this.innerX * 2 * shrinkFactor;
		const pitchLengthZ = this.innerZ * 2 * shrinkFactor;

		this.createSideStand(
			"northStand8",
			pitchLengthX,
			new BABYLON.Vector3(0, 0, this.innerZ),
			0,
			"blue"
		);

		this.createSideStand(
			"southStand8",
			pitchLengthX,
			new BABYLON.Vector3(0, 0, -this.innerZ),
			Math.PI,
			"red"
		);

		this.createSideStand(
			"eastStand8",
			pitchLengthZ,
			new BABYLON.Vector3(this.innerX, 0, 0),
			Math.PI / 2,
			"blue"
		);

		this.createSideStand(
			"westStand8",
			pitchLengthZ,
			new BABYLON.Vector3(-this.innerX, 0, 0),
			-Math.PI / 2,
			"red"
		);

		// Pas de grandes tours ni de grosses poutres rouges ici :
		// le stade de huitième reste visuellement plus simple.

		// On garde tout de même l'animation LED sur les panneaux pub.
		this.startLEDAnimation();
		this.crowd.startAnimation(); // Mexican Wave — boules qui sautent

		return this.stadiumRoot;
	}
}

