# 🔌 Neon ZIP
**Par Zakary Hamadouche & Akramat Ozdoev**

## 1. 🎮 Présentation du projet

- 📌 **Neon ZIP** est un **puzzle game en 2D développé en JavaScript avec manipulation du DOM HTML** : le joueur doit tracer un chemin qui relie des chiffres dans l'ordre croissant tout en remplissant **toutes les cases** d'une grille.
- 🎯 Le cœur du projet est de proposer un gameplay de réflexion accessible mais challengeant : la contrainte de remplissage total force le joueur à planifier chaque tracé, et les obstacles viennent corser l'expérience sur les niveaux difficiles.
- 🧩 Le jeu propose plusieurs modes (solo classique, concepteur de niveau), un système de scores persistants et un chronomètre pour se dépasser à chaque partie.
- 🧪 Ce projet a été réalisé dans le cadre d'un **TP-WEB** du professeur Michel Buffa, afin de mettre en pratique la manipulation du DOM.
## 2. ✨ Fonctionnalités principales

- 🖱️ **Tracé interactif** : le joueur trace son chemin en maintenant le clic d'une case à l'autre. Il peut **revenir en arrière** en survolant l'avant-dernière case ou **raccourcir** son chemin en cliquant sur une case déjà visitée.
- 🔢 **Contrainte des numéros fixes** : certaines cases affichent un chiffre que le chemin **doit traverser dans l'ordre** (de 1 à N). Le tracé est invalide si le joueur tente de sauter un indice.
- ⏱️ **Chronomètre** : le timer démarre au premier coup de tracé et s'arrête à la victoire, permettant de mesurer et améliorer ses meilleures performances.
- 💡 **Système d'indice** : un bouton **Indice** révèle la prochaine case recommandée par la solution officielle, avec une mise en surbrillance visuelle sur la grille.

- 🎚️ **Trois niveaux de difficulté** :
	- 🟢 **Facile** : 11 indices fixes bien répartis, aucun obstacle, idéal pour débuter.
	- 🟡 **Moyen** : 8 indices avec une distance minimale entre eux, quelques zones à anticiper.
	- 🔴 **Difficile** : seulement 6 indices et des **obstacles** (cases bloquées, côtés fortuits) qui forcent à contourner une partie de la grille.

- 🧱 **Deux types d'obstacles** (mode Difficile) :
	- 🚫 **Case bloquée** : une case de la grille est inaccessible et doit être évitée par le chemin.
	- ⛔ **Côté bloqué** : un bord de case est barré, empêchant le tracé de traverser de ce côté.

- 📐 **Tailles de grille variables** : la grille peut aller de **4×4 à 10×10**, accessible via le mode Concepteur ou dynamiquement selon la difficulté.

- 🎨 **Mode Concepteur de niveau** :
	- Le joueur peut créer sa propre grille en choisissant la taille (4×4, 6×6, 8×8, 10×10).
	- Il place les chiffres de 1 à 10 par **glisser-déposer** ou par **clic** dans les cases de son choix.
	- Un bouton **Valider** vérifie (via le Worker) si le niveau est jouable, puis lance la partie directement sur le niveau conçu.

- 🏆 **Tableau de scores** : les parties terminées sont **sauvegardées sur le serveur** (API backend) et consultables depuis le menu principal, avec tri par chrono et filtre par mode (Solo / Concepteur).

## 3. 🛠️ Technologies utilisées

- 🧩 **HTML** : structure de la page, organisation des overlays (menu, victoire, concepteur) et des zones interactives (grille, palette, barre de contrôles).
- ⚙️ **JavaScript** :
	- Organisation du code en **modules ES6** (`export` / `import`) répartis en sous-dossiers thématiques (`core`, `game`, `ui`, `worker`, `obstacles`).
	- Gestion du gameplay (tracé, logique de contraintes, obstacles, conditions de victoire).
	- Utilisation d'un **Web Worker** pour générer les puzzles en arrière-plan sans bloquer l'interface.
	- Appels API (`fetch`) vers le **backend** pour sauvegarder et récupérer les scores.
- 🎨 **CSS** : mise en forme de l'interface (thème neon sombre, grille responsive, overlays animés, effets de survol).

## 4. 📥 Installation

- 🧪 **Version locale (recommandée pour les tests)** :
	- Cloner le dépôt Git sur la machine locale.
	- Lancer le serveur backend avec `npm start` depuis la racine du projet.
- 🌐 **Version en ligne** :
	- Le jeu peut également être consulté via : https://tp-web-hamadouche-ozdoev.vercel.app/Dom/.

## 5. 📂 Structure du projet

- 🧠 **js/core/** : regroupe les **données fondamentales partagées** par tous les autres modules :
	- `config.js` : gère la **taille courante de la grille** (`getGridSize`, `setGridSize`, `getTotalCells`) et la valide (entre 4 et 10).
	- `state.js` : exporte les objets mutables `gameState` (chemin, numéros, chemin solution, obstacles, temps écoulé, difficulté) et `uiState` (état du tracé, indice surligné). Ils sont partagés par référence entre les modules.

- ⚙️ **js/game/** : contient la **mécanique de jeu pure**, sans aucun effet de bord DOM :
	- `logic.js` : implémente toute la logique du tracé — détection d'adjacence, gestion des interactions cellule (démarrage, extension, retour arrière, raccourcissement), respect de l'ordre des numéros fixes, blocage par les obstacles, et conditions de victoire (`hasWon`, `hasWonAgainstTarget`).
	- `timer.js` : expose une factory `createTimer(onTick)` qui retourne un chronomètre découplé avec les méthodes `start`, `stop`, `reset` et `isRunning`. Le timer opère via getter/setter pour rester indépendant de l'état global.

- 🖥️ **js/ui/** : gère le **rendu et les interactions avec le DOM** :
	- `grid.js` : contient trois fonctions distinctes — `initGrid` qui crée les éléments DOM des cellules (point central, connecteurs directionnels, badge numérique), `renderGrid` qui met à jour l'affichage de toutes les cases selon l'état courant (path, hints, obstacles, connecteurs actifs), et `bindGridPointerEvents` qui branche les événements souris et tactile sur la grille.

- 🔧 **js/worker/** : gère la **communication avec le Web Worker** de génération :
	- `worker-client.js` : expose `createPuzzleWorker(onPuzzleReady, onError)` qui instancie le Worker, route les messages (`PUZZLE_RESULT`, `CUSTOM_LEVEL_VALIDATION_RESULT`) et fournit les méthodes `loadPuzzle(difficulty, gridSize)` et `validateCustomLevel(numbers, gridSize)` (la validation est basée sur une `Promise` avec correspondance par `requestId`).

- 🧱 **js/obstacles/** : regroupe la **hiérarchie des obstacles** via héritage de classes :
	- `Obstacle.js` : classe de base qui définit l'interface commune (`appliesToCell`, `applyToCell`, `blocksCell`, `blocksEdge`) avec des implémentations vides par défaut.
	- `BlockedCellObstacle.js` : étend `Obstacle` pour représenter une **case entièrement bloquée** — `blocksCell` retourne `true` pour l'index concerné.
	- `BlockedSideObstacle.js` : étend `Obstacle` pour représenter un **côté barré** (top, right, bottom, left) — `blocksEdge` détermine si le passage entre deux cellules adjacentes traverse ce bord.
	- `BlockedCornerObstacle.js` : variante de côté bloqué pour les coins (convertit la diagonale en côté bloqué équivalent).
	- `factory.js` : fonction `createObstacles(definitions)` qui lit les définitions brutes envoyées par le Worker (plain objects avec `type`, `index`, `side`…) et instancie la classe concrète correspondante.

- 🤖 **worker.js** *(à la racine de Dom/)* : tourne dans un **Web Worker**, hors du thread principal. Il contient :
	- La génération d'un **chemin hamiltonien aléatoire** par backtracking avec shuffle (Fisher-Yates), avec un fallback boustrophédon garanti.
	- La **sélection des indices** (hints) selon la difficulté, avec un espacement minimum en distance de Manhattan.
	- La **génération des obstacles** en mode Difficile (case bloquée et/ou côté bloqué, positionnés pour ne pas couper la solution).
	- La **validation des niveaux custom** : vérifie que les chiffres sont consécutifs depuis 1, puis recherche un chemin hamiltonien contraint via backtracking avec heuristique de degré minimum (Warnsdorff-like).

- 🌐 **index.html** : structure la page avec les overlays (menu principal, scores, concepteur, victoire), la grille de jeu, la barre d'actions et le workspace du concepteur.
- 🎨 **style.css** : thème visuel complet du jeu (variables CSS, grille responsive, connecteurs animés, overlays, badges, palette du concepteur).

## 6. 🏗️ Ce dont nous sommes fiers

- 🤖 **Le Web Worker** : déléguer la génération du puzzle à un Worker distinct était un défi technique important. Cela permet de conserver une interface **100 % fluide** pendant la résolution, même sur des grilles 10×10 avec backtracking profond.
- 🧬 **Un bon usage de l'héritage** : la hiérarchie `Obstacle → BlockedCellObstacle / BlockedSideObstacle / BlockedCornerObstacle` nous permet d'ajouter de nouveaux types d'obstacles sans toucher à la logique de rendu ni à celle de tracé — le polymorphisme (`blocksCell`, `blocksEdge`, `applyToCell`) s'occupe de tout.
- 🧩 **Une architecture modulaire claire** : avec les sous-dossiers `core`, `game`, `ui`, `worker` et `obstacles`, chaque fichier a une **responsabilité unique** et aucune dépendance circulaire. `main.js` est le seul orchestrateur ; tous les autres modules restent testables et réutilisables indépendamment.
- 🎨 **Le mode Concepteur** : offrir au joueur la possibilité de **créer et jouer ses propres niveaux**, avec une vraie validation algorithmique (faisabilité du chemin hamiltonien contraint), est la fonctionnalité dont nous sommes le plus fiers.

## 7. 🤖 Utilisation de l'IA dans le projet

- 🎨 **Design et styles CSS** : le professeur ne nous ayant pas demandé de nous concentrer sur la partie graphique, nous avons utilisé l'IA pour **proposer le design général** (thème neon sombre, mise en page, overlays, animations de connecteurs). Nous avons ensuite **adapté et intégré ces propositions** dans nos fichiers CSS, en gardant le focus du travail manuel sur la logique de jeu et l'architecture du code.
- 🤖 **Algorithme de génération de puzzle** : la génération d'un chemin hamiltonien contraint par des indices fixes est un problème assez difficile. Nous nous sommes **appuyés sur l'IA pour comprendre et structurer l'algorithme de backtracking** (avec heuristique de degré minimum inspirée de Warnsdorff), que nous avons ensuite **relu, ajusté et intégré** dans le Worker pour qu'il corresponde à nos exigences de difficulté et de performance.

## 8. 💡 Améliorations possibles

- 📱 **Support tactile complet** : améliorer la gestion du glisser-déposer sur mobile (feedback visuel du tracé en temps réel lors du `touchmove`, vibration haptique à chaque nouvelle case).
- 🌐 **Classement global** : afficher non seulement les scores du joueur connecté, mais aussi un **classement mondial** par difficulté et taille de grille, pour encourager la compétition entre joueurs.
- ⏪ **Annulation de coup** : ajouter un bouton **Undo** permettant de retirer la dernière case posée sans effacer tout le chemin, pour une expérience de jeu plus confortable.
