# ⚽ GamesOnWeb — Foot 3D
**Par Zakary Hamadouche & Akramat Ozdoev**

## 1. 🎮 Présentation du projet

- 📌 **GamesOnWeb** est un **jeu de football 3D développé en JavaScript avec Babylon.js** : le joueur contrôle une équipe de footballeurs dans un stade entièrement modélisé en 3D, avec physique de balle, IA adverse, effets sonores et caméra broadcast style FIFA.
- 🎯 Le cœur du projet est de proposer une expérience footballistique complète : tir chargé avec jauge de puissance, dribble, tacle, gestion de l'endurance, mi-temps avec une IA adverse et des coéquipiers dotés de comportements autonomes réalistes.
- 🏟️ Le jeu propose deux grands modes (Tournoi et 1 vs 1), une sélection de skins de joueurs, un choix de stade et un tableau de scores persistant sauvegardé en base de données.
- 🧪 Ce projet a été réalisé dans le cadre du concours **GamesOnWeb** et du **TP-WEB** du professeur Michel Buffa, afin de mettre en pratique l'utilisation d'un moteur 3D dans le navigateur, la gestion de physique custom, l'architecture modulaire en JavaScript et l'intégration d'un backend.

## 2. ✨ Fonctionnalités principales

- 🕹️ **Contrôle du joueur en 3D** : déplacement fluide dans les 8 directions, sprint avec consommation d'endurance, changement de joueur actif à la volée (gauche/droite) avec switch automatique d'urgence vers le gardien en cas de danger imminent.

- ⚡ **Tir chargé avec jauge de puissance** : maintenir la touche de tir fait apparaître une jauge au sol (vert/orange/rouge) ; relâcher au bon moment déclenche un tir proportionnel à la zone visée, accompagné d'une animation de frappe procédurale sur le modèle 3D du joueur.

- 🥋 **Tacle** : le joueur peut effectuer un tacle pour intercepter la balle adverse, avec une logique réaliste qui tient compte de l'angle d'approche et de la vitesse du défenseur.

- 🔁 **Dribble vs Sprint** : le comportement de la balle change selon l'état du joueur — en marche, elle se colle devant lui (dribble FIFA) ; en sprint, elle est propulsée devant avec une poussée proportionnelle à la vitesse.

- 🏃 **Endurance** : chaque joueur dispose d'une jauge d'endurance qui se vide en sprint et se régénère au repos ou à la marche.

- ⏱️ **Déroulement d'un match complet** :
  - 🟢 **Pré-match** : cinématique d'introduction avec placement des équipes sur le terrain, intro caméra broadcast skippable.
  - ⚽ **Match en deux mi-temps** : minuterie officielle, pause à la mi-temps avec texte animé, reprise automatique.
  - 🔴 **Fin de match** : overlay de résultat avec score, buteurs et minutage des buts.

- 📽️ **Replay de but** : à chaque but, le jeu enregistre les dernières 5 secondes de jeu et rejoue la séquence en caméra broadcast, avec contrôle de vitesse de lecture.

- 📺 **Système de caméras multiples** :
  - 📡 **Broadcast** : caméra cinématique style FIFA qui suit la balle, avec zoom dynamique sur les tirs et les actions dangereuses, FOV adaptatif et shake sur les buts.
  - 🎮 **TPS** : caméra à l'épaule centrée sur le joueur actif.
  - 👁️ **FPV** : vue à la première personne depuis le joueur.

- 🤖 **Intelligence artificielle des équipes** : toutes les IA (adverses ET coéquipiers non contrôlés) reposent sur un système de **steering behaviours** :
  - 🧭 **Seek / Arrive** : le joueur fonce vers une cible (balle, zone) en décélérant progressivement à l'approche.
  - 🔮 **Intercept** : prédiction de la trajectoire de la balle pour se placer sur son chemin plutôt que de la suivre.
  - 🏃 **Flee** : repli tactique quand un adversaire est trop proche.
  - 🌀 **Wander** : déplacement semi-aléatoire pour garder les joueurs en mouvement même sans action immédiate.
  - Chaque rôle applique ces comportements différemment :
    - 🧤 **Gardien** : retourne à sa ligne, plonge vers la balle dans sa surface, dégage vers l'avant.
    - 🛡️ **Défenseurs** : pressent le porteur adverse, cherchent à intercepter et bloquent les couloirs.
    - ⚙️ **Milieux** : se démarquent, relancent le jeu, crèent des espaces par leurs déplacements.
    - ⚡ **Attaquants** : lancent des appels en profondeur, cherchent à se retrouver en position de tir.
  - Les **coéquipiers** du joueur (ceux qu'il ne contrôle pas directement) appliquent eux aussi ces comportements pour soutenir l'action : couverture, appel de balle, repositionnement après une passe.
  - La difficulté de l'IA adverse augmente progressivement selon le stade du tournoi (vitesse, agressivité, précision de l'interception).

- 🏆 **Deux modes de jeu** :
  - 🥇 **Tournoi** : enchaîner quatre stades de compétition (Huitième de finale → Quart → Demi → Finale), chacun avec une tribune différente et une IA adverse plus difficile. Un score est sauvegardé en base de données à chaque victoire.
  - ⚔️ **1 vs 1** : affrontement entre deux joueurs humains sur le même clavier ou manette, avec configuration indépendante des touches pour chaque joueur.

- 🏟️ **Quatre stades progressifs** : les matchs se déroulent dans des stades dont la taille et l'ambiance visuelle évoluent au fil de la compétition :
  - 🔵 **Huitième de finale** : stade d'entrée de tournoi, ambiance ouverte, lecture claire du jeu.
  - 🟢 **Quart de finale** : les tribunes se resserrent, chaque duel compte davantage.
  - 🟠 **Demi-finale** : atmosphère maximale, stade plus compact, la moindre erreur se paie cher.
  - 🟡 **Finale** : le cadre le plus spectaculaire — lumières, tension et style grand final. Chaque stade est modélisé avec sa propre classe de tribune et son éclairage distinct.

- 🎭 **Sélection de skin et de stade** (mode 1 vs 1) :
  - Un carousel 3D en temps réel (moteur Babylon.js dédié) permet à chaque joueur de choisir son skin parmi 10 équipes françaises (Paris, Lyon, Marseille, Bordeaux, Lille, Nantes, Toulouse, Rennes, Nice, Strasbourg), avec statistiques et description associées.
  - Un skin déjà choisi par le joueur 1 est verrouillé pour le joueur 2.
  - Le stade de jeu est sélectionnable (Huitième, Quart, Demi, Finale) avec prévisualisation thématique.

- 🎮 **Support manette** : détection et mapping automatique d'une manette de jeu (API Gamepad), avec notifications de connexion/déconnexion et configuration des boutons dans les réglages.

- ⚙️ **Réglages complets** :
  - Reconfiguration de toutes les touches clavier (Joueur 1 et Joueur 2) avec détection des conflits.
  - Réglage du volume des effets sonores via un slider dédié.
  - Sélection de la caméra active pendant le match.

- 📊 **Tableau de scores** : historique des matchs joués, consultable depuis le menu principal, avec détail des buts (équipe, minutage) et stockage persistant via une API backend.

## 3. 🛠️ Technologies utilisées

- 🧩 **HTML** : structure de la page, organisation des overlays (menu principal, sélection de skin, réglages, replay, résultat de match) et intégration de la balise `<canvas>` pour le rendu 3D.
- ⚙️ **JavaScript** :
  - Organisation du code en **modules ES6** (`export` / `import`) répartis en sous-dossiers thématiques (`game`, `input`, `models`, `objects`, `score`, `structure`, `ui`, `utils`).
  - Gestion de la physique, des collisions, de la balle, du tir et des animations procédurales.
  - Utilisations avancées de l'**API Gamepad** pour la détection des manettes.
  - Appels API (`fetch`) vers le **backend** pour sauvegarder et récupérer les scores de matchs.
- 🎨 **CSS** : mise en forme de l'interface (menu principal, overlays, carousel de skins, réglages, scoreboard) avec effets de glassmorphism et animations.
- 🟣 **Babylon.js** : moteur 3D WebGL utilisé pour le rendu des personnages, du terrain, des tribunes, de la balle et de toutes les caméras.

## 4. 📥 Installation

- 🧪 **Version locale (recommandée pour les tests)** :
  - Cloner le dépôt Git sur la machine locale.
  - Lancer le serveur backend avec `npm start` depuis la racine du projet.
- 🌐 **Version en ligne** :
  - Le jeu peut également être consulté via : https://tp-web-hamadouche-ozdoev.vercel.app/GamesOnWeb/.

## 5. 📂 Structure du projet

- 🎵 **assets/** : contient les **effets sonores** du jeu — `Sifflet.mp3` (coup de sifflet d'arbitre), `Kick.mp3` (son de tir) et `Goal.mp3` (chant de célébration de but).

- 🎨 **css/** : regroupe le fichier **`style.css`** qui couvre l'intégralité de l'interface (menu principal, overlays de skins, réglages, scoreboard 2D, écrans de résultat).

- 🎮 **js/game/** : contient la **physique et la mécanique de jeu pure**, sans rendu :
  - `ballPhysics.js` : gère la **physique de la balle** frame par frame — friction, gravité, rebonds sur les poteaux de but, animation de sortie de terrain (chute arc-balistique).
  - `goalDetection.js` : détecte le **franchissement de la ligne de but** et déclenche les événements sonores et visuels associés.
  - `playerMovement.js` : calcule et applique le **déplacement de chaque joueur** selon les inputs et les contraintes de terrain.
  - `teamSetup.js` : instancie et configure les **deux équipes** (positions, rôles : GK, DEF, MID, ATT) selon le mode de jeu et le stade.

- 🕹️ **js/input/** : gère les **entrées périphériques** :
  - `gamepadManager.js` : encapsule l'**API Gamepad** du navigateur — détection de connexion/déconnexion, lecture de l'état des boutons et des sticks, notifications visuelles et fonctions utilitaires (`getActiveGamepad`, `getPrimaryStick`, `setupGamepadNotifications`).

- 🧠 **js/models/** : contient la **logique de haut niveau** du jeu et les modèles d'IA :
  - `gameLogic.js` : regroupe toutes les fonctions de gameplay partagées — `checkBallCollision` (dribble/sprint), `kick` (tir chargé avec animation procédurale et zoom caméra), `tryStealBall` (interception), jauge de tir (`createKickGauge`, `updateKickGauge`, `computeKickPower`, `hideKickGauge`), gestion de la sortie de balle (`isBallOutOfBounds`, `startBallOutAnimation`, `updateBallOutAnimation`).
  - `restartLogic.js` : gère tous les **remises en jeu** après sortie de balle (touche, coup de pied de but, coup franc) — détermination du type de remise, position de la balle, verrouillage du joueur tireur.
  - `steeringBehaviours.js` : implémente les **comportements de direction de l'IA** (seek, arrive, flee, intercept, wander) utilisés par les joueurs adverses pour se positionner de façon réaliste.
  - `tackleLogic.js` : gère la logique complète du **tacle** — déclenchement, animation, vérification de la contact, transfert de possession, cooldown.
  - **teams/** : regroupe les **classes de modèle d'équipe** :
    - `Team.js` : classe de base pour toute équipe (positions, rôles, comportements partagés, switch de joueur, lock de possession, reset de positions).
    - `AITeam.js` : étend `Team` pour l'**équipe contrôlée par l'IA**, avec une boucle d'update qui adapte le comportement de chaque joueur selon son rôle et la position de la balle.
    - `AITeamHuitieme.js`, `AITeamQuart.js`, `AITeamDemi.js`, `AITeamFinale.js` : niveaux d'IA progressifs qui **étendent `AITeam`** avec des paramètres de difficulté croissants (agressivité, vitesse, précision).
    - `PlayerTeam.js` : étend `Team` pour l'**équipe contrôlée par le joueur 1**, avec switch automatique vers le joueur le plus proche de la balle.
    - `Player2Controller.js` : gère les **entrées et le comportement du joueur 2** en mode 1 vs 1 (touches indépendantes, tacle, tir chargé, sprint).

- 🏗️ **js/objects/** : contient les **entités 3D du jeu** et les objets visuels :
  - `player.js` : crée et initialise un **joueur 3D** (chargement du mesh GLB, positionnement, rôle, homePosition, indicateur de sélection).
  - `ball.js` : crée la **balle 3D** (sphère Babylon avec matériau et texture).
  - `goal.js` : construit un **but 3D** avec poteaux et filet, positionnement configurable pour les buts gauche et droit.
  - `cameras.js` : initialise le **trio de caméras** (TPS, FPV, Broadcast) et expose les fonctions de switch.
  - `cameraRuntime.js` : moteur de la **caméra broadcast dynamique** — cerveaux (Brain), rig et caméra avec suivi de balle, zoom sur les tirs, shake sur les buts, FOV adaptatif et interpolations douces.
  - `scoreboard3d.js` : affiche les **panneaux de score 3D** style stade au-dessus du terrain (noms des équipes, score, minuterie) via des textures dynamiques Babylon.

- 🏟️ **js/structure/** : modélise l'**environnement du stade** :
  - `field.js` : génère le **terrain de football** (pelouse avec marquages ligne centrale, surface de réparation, rond central).
  - `environnement.js` : ajoute un **environnement autour du stade** (fond, skybox, ambiance lumineuse).
  - `tribune.js` : classe de base pour une **tribune générique** (géométrie, matériaux, éclairage partagé).
  - `tribuneHuitieme.js` : tribune du **Huitième de finale** — stade le plus ouvert, ambiance bleue, capacité réduite.
  - `tribuneQuart.js` : tribune du **Quart de finale** — tribunes plus resserrées, ambiance verte intense.
  - `tribuneDemi.js` : tribune de la **Demi-finale** — stade compact, éclairage orange chaud, pression maximale.
  - `tribuneFinale.js` : tribune de la **Finale** — le plus grand et le plus spectaculaire, lumière dorée, architecture imposante.

- 🖥️ **js/ui/** : gère toute l'**interface utilisateur** hors match :
  - `mainMenu.js` : gère le **menu principal** (tiles de navigation, préview au survol, flux de sélection du mode 1 vs 1 en 4 étapes : touches J2 → skin J1 → skin J2 → choix du stade), carousel 3D temps réel des skins, gestion des indicateurs de progression et de la sauvegarde des choix dans le `localStorage`.
  - `matchFlow.js` : orchestre le **déroulement complet d'un match** (compte-à-rebours de chaque mi-temps, pause mi-temps, état de fin de match, sauvegarde du score en base).
  - `preMatchIntro.js` : gère la **séquence d'introduction** avant le coup d'envoi (placement des équipes, animations de caméra, skip au bouton).
  - `goalReplay.js` : implémente le **système de replay** — enregistrement des frames en rolling buffer, lecture accélérée, contrôle de la caméra pendant le replay.
  - `scoreboard.js` : affiche et met à jour le **scoreboard 2D** en overlay (score, timer, équipes).
  - `scoreHistory.js` : affiche l'**historique des résultats** (matchs joués, buts marqués, minutage).
  - `settings.js` : gère l'**écran de réglages** en jeu — reconfiguration des touches clavier (J1 et J2), réglage du volume, switch de caméra, pause/reprise du match.

- 🏅 **js/score/** :
  - `matchResult.js` : définit la fonction `saveScoreToDB` qui envoie le résultat du match (équipes, score, buts, mode) à l'**API backend** via `fetch`.

- 🔧 **js/utils/** : regroupe les **utilitaires transverses** :
  - `audioManager.js` : centralise la **gestion audio du match** (chargement robuste des sons avec plusieurs chemins candidats, création de `BABYLON.Sound` avec fallback `HTMLAudio`, gestion du contexte audio, réglage de volume, `playWhistle`, `playKick`, `playGoalLoop`, `stopGoal`, `stopAll`).
  - `collisionUtils.js` : utilitaires de **détection de collision** entre joueurs, balle et poteaux de but.
  - `inputBindings.js` : gère la **persistance des configurations de touches** (clavier J1, J2, gamepad) dans le `localStorage`, avec détection des conflits et export/import des bindings.
  - `teamLabels.js` : fournit les **noms d'équipes** à afficher dans le scoreboard selon les skins sélectionnés.

- 🌐 **index.html** : structure la page avec le canvas de rendu, les overlays (menu, skins, réglages, replay, résultat de match, scoreboard), les scripts Babylon.js et l'ensemble des modules JavaScript chargés dans l'ordre.
- 🎨 **css/style.css** : thème visuel complet du jeu (variables CSS, menu principal en glassmorphism, carousel de skins 3D, overlays animés, panneaux de score, responsive).

## 6. 🏗️ Ce dont nous sommes fiers

- 📡 **La caméra broadcast dynamique** : implémenter une caméra qui se comporte comme une vraie réalisation télévisée — avec zoom automatique sur les tirs, shake sur les buts et transitions douces — était le défi technique le plus ambitieux du projet. Le découpage en trois couches (Brain, Rig, Runtime) nous a permis de garder la logique séparée et facilement ajustable.
- 🤖 **Les comportements de steering des équipes** : concevoir des comportements d'équipe cohérents (seek, arrive, intercept, flee, wander) appliqués à la fois aux adverses **et** aux coéquipiers non contrôlés par le joueur — chacun avec un comportement adapté à son rôle (gardien, défenseur, milieu, attaquant) — tout en faisant progresser la difficulté de l'IA d'un stade à l'autre, est l'aspect dont nous sommes le plus satisfaits sur le plan algorithmique.
- 🎭 **Le carousel de skins 3D** : offrir un aperçu 3D en temps réel de chaque joueur pendant la sélection — avec une instance Babylon.js dédiée, un éclairage studio multi-sources et un verrouillage des skins déjà choisis — donne au menu une vraie dimension premium.

## 7. 🤖 Utilisation de l'IA dans le projet

- 🎨 **Design et styles CSS** : le professeur ne nous ayant pas demandé de nous concentrer sur la partie graphique, nous avons utilisé l'IA pour **proposer le design général** (thème sombre, glassmorphism du menu, mise en page des overlays, animations CSS). Nous avons ensuite **adapté et intégré ces propositions** dans nos fichiers, en gardant le focus du travail manuel sur la logique de jeu et l'architecture du code.
- 🤖 **Comportements de steering de l'IA** : les algorithmes classiques de steering (seek, arrive, flee, intercept) sont des concepts bien documentés mais leur intégration dans un contexte multi-joueurs avec rôles différenciés est complexe. Nous nous sommes **appuyés sur l'IA pour structurer l'approche générale** et avons ensuite **ajusté chaque paramètre** (vitesse, rayon d'influence, priorité des comportements) pour obtenir un rendu de jeu réaliste et progressive selon le stade.
- 📡 **Architecture de la caméra broadcast** : la conception d'une caméra cinématique avec plusieurs couches logiques (suivi actif, anticipation, zoom événementiel) s'inspire de ressources sur les caméras de jeux AAA. L'IA nous a aidés à **structurer le découpage Brain/Rig/Runtime** et nous avons **implementé, testé et calibré** l'ensemble des paramètres nous-mêmes.

## 8. 💡 Améliorations possibles

- 🎵 **Musique d'ambiance** : ajouter une musique de fond dans le menu et pendant le match pour renforcer l'immersion, avec un réglage de volume dédié en plus des effets sonores.
- 👥 **Mode Duo en ligne** : permettre à deux joueurs de s'affronter en réseau (WebSocket ou WebRTC), avec synchronisation de l'état de jeu côté serveur.
- ⏱️ **Prolongations** : ajouter deux mi-temps supplémentaires en cas d'égalité à la fin du temps réglementaire, avant d'envisager une décision finale.
- 🎯 **Séance de tirs au but** : implémenter un mini-mode dédié en cas d'égalité après prolongations — alternance de tirs depuis le point de penalty, avec la jauge de puissance existante et une IA gardien adaptée.
- 🃏 **Système de cartes** : introduire des avertissements (carton jaune/rouge) pour les tacles trop agressifs, avec expulsion temporaire du joueur fautif.
- 📱 **Support mobile** : adapter les contrôles à un joystick tactile virtuel pour jouer sur smartphone ou tablette sans clavier ni manette.
