class TribuneQuart extends Tribune {
	constructor(scene) {
		super(scene);

		// Quart de finale : un peu plus grand que les huitièmes,
		// mais moins impressionnant que la demi-finale.
		this.numTiers = 3;        // un étage de plus que Huitième (2 -> 3)
		this.rowsPerTier = 9;     // légèrement plus de rangées
		this.tierGapHeight = 2.2; // un peu plus d'espace entre les niveaux
		this.hasRoof = false;     // toujours sans toit pour garder le contraste

		this.calculateDimensions();
	}

	create() {
		// Légèrement plus long que les huitièmes, mais
		// toujours plus court que la demi-finale.
		const lengthFactor = 0.9; // 90% de la longueur de la demi

		const pitchLengthX = this.innerX * 2 * lengthFactor;
		const pitchLengthZ = this.innerZ * 2 * lengthFactor;

		// Tribunes principales
		this.createSideStand(
			"northStandQuart",
			pitchLengthX,
			new BABYLON.Vector3(0, 0, this.innerZ),
			0,
			"blue"
		);

		this.createSideStand(
			"southStandQuart",
			pitchLengthX,
			new BABYLON.Vector3(0, 0, -this.innerZ),
			Math.PI,
			"red"
		);

		this.createSideStand(
			"eastStandQuart",
			pitchLengthZ,
			new BABYLON.Vector3(this.innerX, 0, 0),
			Math.PI / 2,
			"blue"
		);

		this.createSideStand(
			"westStandQuart",
			pitchLengthZ,
			new BABYLON.Vector3(-this.innerX, 0, 0),
			-Math.PI / 2,
			"red"
		);

		// Pas de tours massives ni d'arches :
		// le quart est un intermédiaire entre Huitième et Demi.

		// Animation LED sur les panneaux pub.
		this.startLEDAnimation();

		return this.stadiumRoot;
	}
}

