# ☄️ Météorite canvas
**Par Zakary Hamadouche & Akramat Ozdoev**

## 1. 🎮 Présentation du projet

- 📌 **Météorite canvas** est un **space shooter en 2D développé en JavaScript avec le canvas HTML5** : le joueur contrôle un vaisseau spatial et affronte des vagues de météorites et d’ennemis dans un environnement entièrement dessiné et animé sur le canvas.
- 🎯 Le cœur du projet est de proposer un gameplay arcade dynamique : esquive, tir, dash, gestion de plusieurs types de météorites et utilisation de gadgets permettent au joueur de progresser au fil des niveaux.
- 🌌 Le jeu intègre plusieurs modes (solo, duo, duel), une boutique de vaisseaux aux comportements variés ainsi qu’un système de réglages (touches et audio) pour adapter l’expérience au joueur.
- 🧪 Ce projet a été réalisé dans le cadre du module **TP-WEB** du professeur Michel Buffa, afin de mettre en pratique la manipulation du canvas, la gestion des collisions, l’organisation du code en modules JavaScript et la conception d’une petite architecture de jeu.

## 2. ✨ Fonctionnalités principales

- 🕹️ **Contrôle du vaisseau nerveux** : le joueur peut déplacer son vaisseau librement, tirer sur les météorites et utiliser un **dash** pour esquiver les situations critiques.
- 🎛️ **Touches 100 % configurables** : toutes les commandes (déplacement, tir, dash…) peuvent être **reparamétrées dans le menu Réglages** pour s’adapter aux préférences du joueur.
- 🔊 **Réglage audio dynamique** : dans Réglages, il est possible d’ajuster séparément le **volume des effets sonores** et de la **musique**.

- 🛒 **Boutique de vaisseaux** : le joueur peut débloquer et sélectionner différents vaisseaux, chacun avec son gameplay :
	- 🚀 **Classique** : vaisseau de base, équilibré et fiable.
	- 💥 **SPLIT** : des tirs qui se **divisent à l’impact** pour nettoyer l’écran.
	- 📡 **Spread** : un tir **double** pour couvrir plus de zone.
	- 🎯 **Ricochet** : des balles qui **rebondissent sur le canvas**, idéales pour atteindre les zones difficiles.

- 🌌 **Trois modes de jeu** :
	- 🧍‍♂️ **Solo** : le joueur dispose de **3 vies** pour enchaîner 3 niveaux :
		- Niveau 1 : **survivre 1 minute** sans mourir.
		- Niveau 2 : **détruire 30 météorites** sans perdre toutes ses vies.
		- Niveau 3 : affronter un **vaisseau ennemi** tout en gérant les météorites qui apparaissent près du vaisseau.
	- 🤝 **Duo** : permet de jouer à **2 joueurs sur le même clavier**, avec des touches dédiées pour le deuxième joueur ; les niveaux sont similaires au solo mais **tous les paramètres sont doublés**.
	- ⚔️ **Duel** : un mode **1 vs 1**, où le premier à **3 points** gagne, avec des gadgets qui peuvent renverser la partie à tout moment.

- ☄️ **Variété de météorites** :
	- 🔹 **Normale** : se détruit en **un seul tir**.
	- 💣 **Dynamite** : explose après un certain temps, mieux vaut ne pas rester à côté.
	- 🧩 **Éclats** : se **divise en deux petites météorites** à la destruction.
	- 🛰️ **Lancer** : un drone qui **suit le vaisseau du joueur** avant de s’arrêter.
	- 🧱 **Costaud** : encaisse **5 tirs** avant d’exploser.
	- 🌫️ **Nuage** : explose et crée une **zone qui bloque la visibilité** pendant un moment.

- 🧩 **Gadgets pour survivre plus longtemps** :
	- ⚡ **Éclair** : augmente la **vitesse du vaisseau pendant 10 s**.
	- 🛡️ **Bouclier** : permet d’**encaisser 2 impacts** de météorites.
	- 🪞 **Mirroir** : téléporte le vaisseau **aléatoirement** sur le canvas — parfois salvateur, parfois dangereux.
	- 🔫 **Rafale** : pendant **10 s**, le joueur peut **spammer les tirs** pour arroser l’écran.
	- ❤️ **Cœur** : rend une **vie perdue** si le joueur n’est pas déjà au maximum.

## 3. 🛠️ Technologies utilisées

- 🧩 **HTML** : structure de la page et intégration de la balise **canvas** pour l’affichage du jeu.
- ⚙️ **JavaScript** :
	- Organisation du code en **différents modules** (core, entities, niveaux, systems, ui, etc.).
	- Gestion du gameplay (contrôles, collisions, projectiles, météorites, gadgets…).
	- Utilisation du **localStorage** pour **sauvegarder des informations côté client** (les scores et les réglages).
- 🎨 **CSS** : mise en forme de l’interface (menus, boutique, réglages) et habillage général du jeu.

## 4. 📥 Installation

- 🧪 **Version locale (recommandée pour les tests)** :
	- Cloner le dépôt Git sur la machine locale.
- 🌐 **Version en ligne** :
	- Le jeu peut également être consulté via : .

- ## 8. 📂 Structure du projet

- 📁 **assets/** : contient l’ensemble des médias du jeu, c’est-à-dire les fichiers **audio** (musique et effets sonores) ainsi que les **images** utilisées pour les différentes météorites, gadgets, vaisseaux, etc.

- 🎨 **css/** : regroupe tous les fichiers de **style** du site (mise en forme de la boutique, du menu principal, des différents écrans d’interface, etc.).

- 🧠 **js/core/** : correspond au **cœur logique du jeu**, structuré en **modules ES6** avec `export` et `import` pour séparer clairement les responsabilités. On y trouve notamment :
	- le dossier **helpers/** qui contient des fonctions utilitaires, par exemple :
		- `assetsConfig.js` qui regroupe la **configuration de tous les assets** (chemins des images, des sons, association des fichiers aux types de météorites, de gadgets, de vaisseaux, etc.).
		- `audioHelpers.js` qui centralise la **gestion de l’audio** (chargement des sons, lecture des effets sonores, gestion de la musique en fonction des réglages).
	- le dossier **managers/** qui regroupe les gestionnaires principaux du jeu, notamment :
		- `entityManager.js` qui s’occupe de la **création, mise à jour et suppression** des entités (joueur, ennemis, météorites, projectiles, gadgets…).
		- `gameManager.js` qui orchestre le **déroulement global d’une partie** (boucle de jeu, progression, transitions entre états).
		- `gameManagerDuo.js` qui gère la logique spécifique au **mode duo** (deux joueurs, entrées clavier distinctes, gestion partagée des objectifs).
		- `gameManagerDuel.js` qui gère la logique du **mode duel 1 vs 1** (comptage des points, manches, conditions de victoire).
	- `assetLoader.js` qui centralise le **chargement des ressources** (images, sons) avant le lancement de la partie.
	- `ecouteur.js` qui gère les **écouteurs d’événements** (clavier, interactions utilisateur).
	- `gameHud.js` pour l’affichage des **informations de jeu** (scores, vies, etc.).
	- `gameState.js` qui décrit et met à jour l’**état global de la partie**.
	- `script.js` qui initialise le jeu sur la page et coordonne les différents modules.
	- `ui.js` pour la gestion de l’**interface utilisateur** (menus, boutons, navigation).

- 🧱 **js/entities/** : regroupe toutes les **entités du jeu**, c’est-à-dire les objets qui apparaissent et interagissent sur le canvas :
	- `objetGraphique.js` : classe de base pour les **objets dessinés** sur le canvas (position, taille, affichage). Les entités graphiques en héritent via `extends` et appellent le constructeur parent.
	- `vaisseau.js` : modèle général de **vaisseau**, dérivé d’`objetGraphique`, qui factorise le comportement commun des vaisseaux (déplacement, points de vie, tir de base).
	- `player.js` : spécialisation de **vaisseau jouable** (hérite de `vaisseau`) avec la gestion des entrées clavier, du dash et des vies du joueur.
	- `ennemi.js` : autre spécialisation de `vaisseau` pour représenter les **vaisseaux ennemis** contrôlés par le jeu.
	- `meteorite.js` : entité de **météorite** qui hérite également d’`objetGraphique` et gère les différents types (points de vie, comportement à la collision) en s’appuyant sur la configuration définie dans les fichiers de types.
	- `bullet.js` : représente les **projectiles** tirés par les vaisseaux, eux aussi dérivés d’`objetGraphique`.
	- `gadget.js` : décrit les **gadgets** ramassables et leur effet une fois activés.
	- le dossier **types** qui contient :
		- `typeVaisseau.js` : définition des **différents types de vaisseaux** (classique, SPLIT, Spread, Ricochet) et de leurs caractéristiques.
		- `typeMeteorite.js` : définition des **différents types de météorites** (normale, dynamite, éclats, lancer, costaud, nuage…).
		- `typeGadget.js` : définition des **différents types de gadgets** (éclair, bouclier, miroir, rafale, cœur…).
        
- 🌄 **js/niveaux/** : gère la **progression des niveaux** et les règles propres à chaque mode de jeu :
	- `niveau.js` : classe de base pour tous les **niveaux**, avec les méthodes `start()`, `update()`, le suivi du temps écoulé et l’état terminé. Les niveaux concrets l’**étendent** via `extends Niveau` et réutilisent la logique commune.
	- le dossier **solo/** qui contient :
		- `levelManagerSolo.js` : classe `LevelManager` qui orchestre la **succession des niveaux solo** (démarrage du premier niveau, transitions, passage au niveau suivant, collecte des données de fin de niveau et enregistrement des scores en solo/duo).
		- `niveau1.js`, `niveau2.js`, `niveau3.js` : classes de niveaux solo qui **étendent `Niveau`** et redéfinissent `start()` / `update()` pour appliquer des règles différentes (survie pendant un temps donné, destruction d’un nombre de météorites, affrontement d’un vaisseau ennemi, etc.).
	- le dossier **duo/** qui contient :
		- `niveau1Duo.js`, `niveau2Duo.js`, `niveau3Duo.js` : variantes **duo** des niveaux qui **étendent elles aussi `Niveau`**, mais avec des paramètres adaptés au jeu à deux (rythme de spawn doublé, spawns multiples de météorites et de gadgets, collecte de statistiques par joueur).
	- `tour.js` : classe `Tour` qui gère les **manches (rounds)** du mode duel (numéro de tour, vainqueur du tour, message associé, réinitialisation entre les manches).
	- `duel.js` : script qui s’appuie sur `Tour` et sur `GameManagerDuel` pour mettre en place le **mode duel 1 vs 1** (création des deux vaisseaux, mise à jour de l’état de la manche, attribution des points, détection du gagnant à 3 points, relance des tours).

- 🧾 **js/score/** : gère la **modélisation, le tri et la persistance des scores** en utilisant le `localStorage` du navigateur :
	- `scoreModels.js` : définit les **modèles de données** pour les scores solo et duo (`createSoloScore`, `createDuoScore`) en calculant les temps totaux et le nombre total de météorites détruites à partir des niveaux terminés.
	- `scoreStorage.js` : encapsule l’accès au **localStorage** (`getAllScores`, `saveAllScores`, `clearAllScores`) et garantit une structure de données cohérente (tableaux `solo` et `duo`).
	- `scoreManager.js` : fournit des fonctions de **haut niveau** pour ajouter, récupérer et nettoyer les scores (`addSoloScore`, `addDuoScore`, `getScores`, etc.) en appliquant un tri (meilleurs temps) et une limite de résultats, tout en s’appuyant sur les modèles et le stockage.

- ⚙️ **js/systems/** : rassemble les **systèmes transverses** qui appliquent les règles de jeu et les effets visuels :
	- `collisionUtils.js` : utilitaires de **collision** (par exemple détection cercle/rectangle) utilisés par les entités et les gestionnaires.
	- `gestionDegats.js` : classe `GestionDegats` qui centralise la **logique des dégâts et de la protection** (prise en compte du bouclier, perte de vie, changement d’état de jeu, déclenchement des sons, détection du game over).
	- `effectsGadget.js` : gère les **effets visuels et temporels des gadgets** (Éclair, Rafale, bouclier) en modifiant temporairement les propriétés du vaisseau et en dessinant les barres de durée ou la bulle de bouclier.
	- `meteoriteEffects.js` : associe les **types de météorites** à des palettes de couleurs et d’images, et déclenche les **effets de particules** appropriés à l’impact ou à l’explosion.
	- `particles.js` : définit les classes `Particle` et `ParticleManager` pour créer, mettre à jour et dessiner des **effets de particules** (impacts, explosions) avec différentes formes, couleurs et durées.
	- `random.js` : fournit la fonction `pickByWeight`, un **helper de tirage aléatoire pondéré** utilisé notamment pour choisir les types de météorites et de gadgets à faire apparaître.
    
- 🖥️ **js/ui/** : regroupe la **logique d’interface utilisateur** liée aux menus de boutique et de réglages :
	- `boutique.js` : contient la classe `Boutique`, qui définit le **catalogue de vaisseaux** (types, noms, descriptions, prix) et gère l’achat/équipement via le joueur, ainsi que la classe `BoutiqueUI`, qui met à jour l’**interface visuelle de la boutique** (carousel de vaisseaux, boutons, affichage de l’or, état « équipé »).
	- `reglage.js` : gère l’**écran de réglages** :
		- configuration des touches pour le joueur 1 et le joueur 2 (écoute des pressions de touches, vérification des conflits, sauvegarde dans le `localStorage`) ;
		- réglage du **volume de la musique** et des **effets sonores** via des sliders, avec affichage des valeurs.

## 9. 💡 Améliorations possibles

- 🗄️ **Backend pour les scores** : remplacer le stockage local (`localStorage`) par une **API backend** capable d’enregistrer et de servir les scores au format JSON (classement persistant côté serveur, meilleur partage des résultats entre joueurs).
- 🚀 **Sélection avancée des vaisseaux en multijoueur** : permettre à chaque joueur de **choisir son vaisseau** (type de tir, capacités) dans les modes **Duo** et **Duel**, avant le lancement de la partie.
