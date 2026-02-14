
/**
 * GameManagerDuo.js
 *
 * Gestionnaire principal pour le mode Duo du jeu.
 * Centralise la logique de gestion des entités, des collisions, des dégâts, du rendu et des interactions pour deux joueurs.
 *
 * @module GameManagerDuo
 */

import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../../systems/effectsGadget.js';
import CollisionUtils from '../../systems/collisionUtils.js';
import ParticleManager from '../../systems/particles.js';
import GestionDegats from '../../systems/gestionDegats.js';
import EntityManager from './entityManager.js';



/**
 * Classe principale de gestion du mode Duo.
 * Gère les entités, les collisions, les dégâts, le rendu et la logique de jeu pour deux joueurs.
 */
export default class GameManagerDuo {
       /**
	* Initialise le gestionnaire duo.
	* @param {HTMLCanvasElement} canvas - Le canvas de rendu principal.
	* @param {Object} player - Les joueurs (structure attendue : { vaisseau1, vaisseau2 }).
	* @param {Object} assets - Les assets du jeu (images, sons, etc.).
	*/
       constructor(canvas, player, assets = {}) {
	       this.canvas = canvas;
	       this.player = player;
	       this.assets = assets;

	       // Listes d'entités du jeu (météorites, ennemis, gadgets, nuages)
	       this.meteorites = [];
	       this.ennemis = [];
	       this.gadgets = [];
	       this.cloudZones = [];
	       // Gestionnaire de particules pour les effets visuels
	       this.particles = new ParticleManager();
	       // État courant du jeu ('playing', 'gameover', etc.)
	       this.gameState = 'playing';
	       // Utilitaire de collision pour gérer les interactions
	       this.collisionUtils = new CollisionUtils();
	       // Durée d'invulnérabilité après un coup
	       this.HIT_DURATION = 600;
	       // Gestionnaire des dégâts
	       this.gestionDegats = new GestionDegats(this.HIT_DURATION);
	       // Dernière position connue du vaisseau 1 (pour certains effets)
	       this.lastVaisseauX = null;
	       this.lastVaisseauY = null;
	       // Prochaine apparition de météorite (timestamp)
	       this.nextMeteoriteSpawn = Date.now() + 1000; // première météorite dans ~1s

	       // Gestion centralisée des entités (météorites, gadgets, ennemis...)
	       this.entityManager = new EntityManager(this);

	       // Callback optionnelle quand une météorite est détruite
	       this.onMeteoriteDestroyed = null;
	       // Compteurs de météorites détruites par chaque joueur
	       this.player1DestroyedMeteorites = 0;
	       this.player2DestroyedMeteorites = 0;
       }


	       /**
		* Contraint un vaisseau à rester dans les limites du canvas.
		* @param {Object} vaisseau - Le vaisseau à contraindre.
		*/
	       clampVaisseauToCanvas(vaisseau) {
		       if (!vaisseau) return;
		       // Calcul des marges pour éviter que le vaisseau ne sorte du canvas
		       const marginX = vaisseau.largeur / 2;
		       const marginY = vaisseau.hauteur / 2;
		       vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
		       vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
	       }


	       /**
		* Met à jour les projectiles d'un vaisseau (déplacement, suppression hors-canvas).
		* @param {Object} vaisseau - Le vaisseau dont on met à jour les projectiles.
		*/
	       updateBullets(vaisseau) {
		       if (!vaisseau || !vaisseau.bullets) return;
		       // Parcours à l'envers pour pouvoir retirer les projectiles sans bug
		       for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
			       const bullet = vaisseau.bullets[i];
			       bullet.move(this.canvas.width, this.canvas.height);

			       // Suppression du projectile s'il sort du canvas et n'a plus de rebonds
			       if (bullet.estHorsCanvas(this.canvas.width, this.canvas.height) && bullet.bounces === 0) {
				       vaisseau.bullets.splice(i, 1);
			       }
		       }
	       }


	       /**
		* Met à jour l'état du jeu pour les deux joueurs (déplacements, entités, projectiles).
		* @param {Object} vaisseau1 - Vaisseau du joueur 1.
		* @param {Object} vaisseau2 - Vaisseau du joueur 2.
		* @param {number} dx1 - Déplacement horizontal joueur 1.
		* @param {number} dy1 - Déplacement vertical joueur 1.
		* @param {number} dx2 - Déplacement horizontal joueur 2.
		* @param {number} dy2 - Déplacement vertical joueur 2.
		*/
	       update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2) {
		       if (this.gameState === 'gameover') return;

		       // Déplacement et contrainte du vaisseau 1
		       if (vaisseau1) {
			       vaisseau1.moveInDirection(dx1, dy1);
			       this.clampVaisseauToCanvas(vaisseau1);
			       this.lastVaisseauX = vaisseau1.x;
			       this.lastVaisseauY = vaisseau1.y;
		       }
		       // Déplacement et contrainte du vaisseau 2
		       if (vaisseau2) {
			       vaisseau2.moveInDirection(dx2, dy2);
			       this.clampVaisseauToCanvas(vaisseau2);
			       // Pour l'instant on garde la dernière position du joueur 1
		       }

		       // Mise à jour des entités et des collisions pour les deux joueurs
		       this.entityManager.updateAll([vaisseau1, vaisseau2]);
		       if (vaisseau1) this.updateBullets(vaisseau1);
		       if (vaisseau2) this.updateBullets(vaisseau2);
	       }


	       /**
		* Met à jour l'état du jeu en mode duo (contrôles, entités, chronomètre, fin de partie).
		* @param {Object} params - Paramètres de la boucle de jeu.
		* @param {Object} params.vaisseau1 - Vaisseau du joueur 1.
		* @param {Object} params.vaisseau2 - Vaisseau du joueur 2.
		* @param {Object} params.levelManagerDuo - Gestionnaire du niveau duo.
		* @param {Object} params.keys - État des touches clavier.
		* @param {Object} params.customKeys - Touches personnalisées joueur 1.
		* @param {Object} params.customKeys2 - Touches personnalisées joueur 2.
		* @param {Function} params.setEtat - Fonction pour changer l'état du jeu.
		* @param {Object} params.ETAT - Enum des états du jeu.
		* @param {Function} params.updateBarreDeVie - Callback pour mettre à jour la barre de vie.
		* @param {HTMLElement} params.chronometre - Élément DOM du chronomètre.
		* @param {Function} params.formatTime - Fonction de formatage du temps.
		*/
	       updateGameStateDuo({
		       vaisseau1,
		       vaisseau2,
		       levelManagerDuo,
		       keys,
		       customKeys,
		       customKeys2,
		       setEtat,
		       ETAT,
		       updateBarreDeVie,
		       chronometre,
		       formatTime
	       }) {
		       // Si le gestionnaire duo est en game over, on ne fait rien
		       if (this.gameState === 'gameover') return;

		       // Joueur 1 : gestion des touches personnalisées (uniquement si le vaisseau existe encore)
		       let dx1 = 0;
		       let dy1 = 0;
		       if (vaisseau1) {
			       if (keys[customKeys.up]) dy1 = -1;
			       if (keys[customKeys.down]) dy1 = 1;
			       if (keys[customKeys.left]) dx1 = -1;
			       if (keys[customKeys.right]) dx1 = 1;
		       }

		       // Joueur 2 : gestion des touches personnalisées (fallback ZQSD) si le vaisseau existe
		       let dx2 = 0;
		       let dy2 = 0;
		       if (vaisseau2) {
			       if (keys[customKeys2.up]) dy2 = -1;
			       if (keys[customKeys2.down]) dy2 = 1;
			       if (keys[customKeys2.left]) dx2 = -1;
			       if (keys[customKeys2.right]) dx2 = 1;
		       }

		       // Mise à jour du niveau duo (spawns météorites / gadgets)
		       if (levelManagerDuo) {
			       levelManagerDuo.update();
		       }

		       // Mise à jour des entités et déplacements des deux joueurs
		       this.update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2);

		       // Mise à jour de la barre de vie si callback fourni
		       if (typeof updateBarreDeVie === 'function') {
			       updateBarreDeVie();
		       }

		       // Mise à jour du chronomètre en fonction du niveau duo courant
		       if (levelManagerDuo) {
			       const level = levelManagerDuo.getCurrentLevel();
			       if (level && chronometre && typeof formatTime === 'function') {
				       chronometre.textContent = formatTime(level.getElapsedTime());
			       }
		       }

		       // Si les deux vaisseaux sont détruits, passage en game over
		       // (la gestion de l'affichage/contrôles reste à l'extérieur)
		       if (!vaisseau1 && !vaisseau2 && typeof setEtat === 'function' && ETAT) {
			       setEtat(ETAT.GAME_OVER);
		       }
	       }


	       /**
		* Dessine tous les éléments du jeu (entités, vaisseaux, effets) sur le canvas.
		* @param {CanvasRenderingContext2D} ctx - Le contexte de rendu du canvas.
		* @param {Object} vaisseau1 - Vaisseau du joueur 1.
		* @param {Object} vaisseau2 - Vaisseau du joueur 2.
		*/
	       draw(ctx, vaisseau1, vaisseau2) {
		       ctx.save();
		       // Dessiner toutes les entités (météorites, ennemis, gadgets, nuages, particules)
		       this.entityManager.draw(ctx);

		       // Dessin du vaisseau 1 et de ses effets
		       if (vaisseau1) {
			       vaisseau1.draw(ctx);
			       drawShieldBubble(ctx, vaisseau1);
			       drawEclairBar(ctx, vaisseau1);
			       drawRafaleBar(ctx, vaisseau1);
		       }

		       // Dessin du vaisseau 2 et de ses effets
		       if (vaisseau2) {
			       vaisseau2.draw(ctx);
			       drawShieldBubble(ctx, vaisseau2);
			       drawEclairBar(ctx, vaisseau2);
			       drawRafaleBar(ctx, vaisseau2);
		       }
		       ctx.restore();
	       }

	       /**
		* Fait apparaître une météorite du type donné.
		* @param {string} type - Type de la météorite à générer.
		*/
	       spawnMeteorrite(type) {
		       this.entityManager.spawnMeteorrite(type);
	       }

	       /**
		* Fait apparaître un ennemi avec les options données.
		* @param {Object} options - Options de création de l'ennemi.
		*/
	       spawnEnnemi(options) {
		       this.entityManager.spawnEnnemi(options);
	       }

	       /**
		* Fait apparaître un gadget éclair.
		*/
	       spawnGadgetEclair() {
		       this.entityManager.spawnGadgetEclair();
	       }

	       /**
		* Fait apparaître un gadget bouclier.
		*/
	       spawnGadgetBouclier() {
		       this.entityManager.spawnGadgetBouclier();
	       }

	       /**
		* Fait apparaître un gadget miroir.
		*/
	       spawnGadgetMirroire() {
		       this.entityManager.spawnGadgetMirroire();
	       }

	       /**
		* Fait apparaître un gadget rafale.
		*/
	       spawnGadgetRafale() {
		       this.entityManager.spawnGadgetRafale();
	       }

	       /**
		* Fait apparaître un gadget cœur (vie).
		*/
	       spawnGadgetCoeur() {
		       this.entityManager.spawnGadgetCoeur();
	       }
}
