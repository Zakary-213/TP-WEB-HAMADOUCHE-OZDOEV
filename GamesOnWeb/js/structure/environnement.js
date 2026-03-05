// Crée un environnement spatial autour du stade (inspiration Galactik Football)
const createEnvironment = (scene) => {
	// Fond de scène noir profond
	scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

	// 1) Dôme d'étoiles (grosse sphère inversée)
	const spaceDome = BABYLON.MeshBuilder.CreateSphere("spaceDome", {
		diameter: 1000,
		segments: 32,
		sideOrientation: BABYLON.Mesh.BACKSIDE
	}, scene);

	const spaceMat = new BABYLON.StandardMaterial("spaceMat", scene);
	spaceMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
	spaceMat.emissiveColor = new BABYLON.Color3(0.02, 0.05, 0.15); // léger bleu nuit
	spaceMat.backFaceCulling = false;
	spaceDome.material = spaceMat;

	// 2) Petites étoiles (sphères très éloignées et lumineuses)
	const starMat = new BABYLON.StandardMaterial("starMat", scene);
	starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
	starMat.specularColor = new BABYLON.Color3(0, 0, 0);

	const starCount = 250;
	const starRadiusMin = 250;
	const starRadiusMax = 450;

	for (let i = 0; i < starCount; i++) {
		const star = BABYLON.MeshBuilder.CreateSphere("star_" + i, {
			diameter: 0.8
		}, scene);

		// Position aléatoire sur une sphère creuse
		const radius = starRadiusMin + Math.random() * (starRadiusMax - starRadiusMin);
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);

		const x = radius * Math.sin(phi) * Math.cos(theta);
		const y = radius * Math.cos(phi);
		const z = radius * Math.sin(phi) * Math.sin(theta);

		star.position = new BABYLON.Vector3(x, y, z);
		star.material = starMat;
		star.isPickable = false;
	}

	// 3) Planètes / lunes lointaines
	const createPlanet = (name, position, color, size) => {
		const planet = BABYLON.MeshBuilder.CreateSphere(name, {
			diameter: size
		}, scene);
		planet.position = position;

		const mat = new BABYLON.StandardMaterial(name + "Mat", scene);
		mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
		mat.emissiveColor = color;
		planet.material = mat;
		planet.isPickable = false;

		return planet;
	};

	const planet1 = createPlanet(
		"planetBlue",
		new BABYLON.Vector3(-200, 120, 260),
		new BABYLON.Color3(0.2, 0.5, 1.0),
		40
	);

	const planet2 = createPlanet(
		"planetPurple",
		new BABYLON.Vector3(260, -80, -220),
		new BABYLON.Color3(0.8, 0.3, 1.0),
		30
	);

	// 4) Étoiles filantes (boules dorées en orbite autour du stade)
	const shootingStars = [];
	const shootingStarMat = new BABYLON.StandardMaterial("shootingStarMat", scene);
	shootingStarMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
	shootingStarMat.emissiveColor = new BABYLON.Color3(1.0, 0.85, 0.2); // doré
	shootingStarMat.specularColor = new BABYLON.Color3(0, 0, 0);

	const createShootingStar = () => {
		const star = BABYLON.MeshBuilder.CreateSphere("shootingStar", { diameter: 1.4 }, scene);
		star.material = shootingStarMat;
		star.isPickable = false;

		// Paramètres d'orbite : rayon, angle initial, vitesse angulaire et hauteur
		const radius = 220 + Math.random() * 80; // toujours bien en dehors du stade
		const angle = Math.random() * Math.PI * 2;
		const angularSpeed = (0.3 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1); // sens +/-
		const height = 80 + Math.random() * 40;

		// Position initiale sur le cercle
		const x = radius * Math.cos(angle);
		const z = radius * Math.sin(angle);
		star.position = new BABYLON.Vector3(x, height, z);

		shootingStars.push({ mesh: star, radius, angle, angularSpeed, height });
	};

	// Crée quelques étoiles filantes au démarrage
	for (let i = 0; i < 6; i++) {
		createShootingStar();
	}

	// 5) Animation générale (planètes + étoiles filantes)
	scene.onBeforeRenderObservable.add(() => {
		const dt = scene.getEngine().getDeltaTime() / 1000;
		// Rotation des planètes
		planet1.rotation.y += 0.03 * dt;
		planet2.rotation.y += 0.02 * dt;

		// Mise à jour des étoiles filantes
		for (let i = 0; i < shootingStars.length; i++) {
			const s = shootingStars[i];
			if (!s.mesh || s.mesh.isDisposed()) continue;

			// Mise à jour de l'angle d'orbite
			s.angle += s.angularSpeed * dt;

			// Recalcule la position sur le cercle autour du stade (en gardant la même hauteur)
			const x = s.radius * Math.cos(s.angle);
			const z = s.radius * Math.sin(s.angle);
			s.mesh.position.set(x, s.height, z);
		}
	});
};

