import Niveau from './niveau.js';
import { TYPE_METEORITE } from '../entities/typeMeteorite.js';
import { pickByWeight } from '../systems/random.js';
import { TYPE_GADGET } from '../entities/typeGadget.js';

// Niveau 2 pour le mode Duo :
// même logique que Niveau2 solo, mais avec le double
// de météorites/gadgets générés.
export default class Niveau2Duo extends Niveau {
	constructor(gameManagerDuo) {
		super(gameManagerDuo);

		this.targetKills = 70;
		this.currentKills = 0;

		this.maxMeteoritesToSpawn = 100000;
		this.totalSpawned = 0;
		this.spawnFinished = false;

		this.burstSize = 10;
		this.burstDelay = 1000;
		this.burstSpacing = 300;
		this.lastBurstTime = 0;
		this.isBurstSpawning = false;

		this.lancerDelay = 2000;
		this.lastLancerSpawn = 0;

		this.gadgetSpawnDelay = 10000;
		this.lastGadgetSpawn = 0;

		this.spawnTable = [
			{ type: TYPE_METEORITE.NORMAL,   weight: 50 },
			{ type: TYPE_METEORITE.COSTAUD,  weight: 5 },
			{ type: TYPE_METEORITE.NUAGE,    weight: 10 },
			{ type: TYPE_METEORITE.DYNAMITE, weight: 15 },
			{ type: TYPE_METEORITE.ECLATS,   weight: 15 }
		];

		this.gadgetSpawnTable = [
			{ type: TYPE_GADGET.COEUR,     weight: 10 },
			{ type: TYPE_GADGET.BOUCLIER,  weight: 30 },
			{ type: TYPE_GADGET.ECLAIR,    weight: 20 },
			{ type: TYPE_GADGET.RAFALE,    weight: 30 },
			{ type: TYPE_GADGET.MIRROIRE,  weight: 10 }
		];
	}

	start() {
		super.start();

		console.log('=== NIVEAU 2 DUO : START ===');

		this.currentKills = 0;
		const previousCallback = this.gameManager.onMeteoriteDestroyed;
		this.totalSpawned = 0;
		this.spawnFinished = false;
		this.lastBurstTime = performance.now();
		this.lastLancerSpawn = performance.now();
		this.lastGadgetSpawn = performance.now();

		// On enchaîne la logique de callback du niveau 2 solo
		// mais appliquée au GameManagerDuo.
		this.gameManager.onMeteoriteDestroyed = (meteorite) => {
			if (previousCallback) {
				previousCallback(meteorite);
			}
			this.currentKills++;

			console.log(
				`[N2 DUO] Météorites détruites : ${this.currentKills}/${this.targetKills}`
			);

			if (this.currentKills >= this.targetKills) {
				this.finished = true;
				this.spawnFinished = true;
				console.log('=== NIVEAU 2 DUO GAGNÉ ===');
			}
		};
	}

	update() {
		if (this.finished) return;
		super.update();
		this.handleBurstSpawn();
		this.handleLancerSpawn();
		this.handleGadgetSpawn();
	}

	handleBurstSpawn() {
		if (this.finished || this.spawnFinished) return;
		const now = performance.now();
		if (this.isBurstSpawning) return;
		if (now - this.lastBurstTime < this.burstDelay) return;

		this.isBurstSpawning = true;
		this.lastBurstTime = now;

		let spawnedInBurst = 0;

		const interval = setInterval(() => {
			if (this.finished || this.spawnFinished) return;
			if (
				spawnedInBurst >= this.burstSize ||
				this.totalSpawned >= this.maxMeteoritesToSpawn
			) {
				clearInterval(interval);
				this.isBurstSpawning = false;

				if (this.totalSpawned >= this.maxMeteoritesToSpawn) {
					this.spawnFinished = true;
				}
				return;
			}

			// Duo : on spawn 2 météorites par "tick" de burst
			const type1 = pickByWeight(this.spawnTable);
			const type2 = pickByWeight(this.spawnTable);
			this.gameManager.spawnMeteorrite(type1);
			this.gameManager.spawnMeteorrite(type2);

			spawnedInBurst += 2;
			this.totalSpawned += 2;
		}, this.burstSpacing);
	}

	handleLancerSpawn() {
		if (this.finished || this.spawnFinished) return;

		const now = performance.now();
		if (now - this.lastLancerSpawn < this.lancerDelay) return;

		if (this.totalSpawned >= this.maxMeteoritesToSpawn) {
			this.spawnFinished = true;
			return;
		}

		// Duo : 2 météorites LANCER à chaque tick
		this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
		this.gameManager.spawnMeteorrite(TYPE_METEORITE.LANCER);
		this.lastLancerSpawn = now;
		this.totalSpawned += 2;
	}

	handleGadgetSpawn() {
		if (this.finished || this.spawnFinished) return;

		const now = performance.now();
		if (now - this.lastGadgetSpawn < this.gadgetSpawnDelay) return;

		// Duo : 2 gadgets à chaque tick
		const gadgetType1 = pickByWeight(this.gadgetSpawnTable);
		const gadgetType2 = pickByWeight(this.gadgetSpawnTable);
		this.spawnGadgetByType(gadgetType1);
		this.spawnGadgetByType(gadgetType2);

		this.lastGadgetSpawn = now;
	}
}
