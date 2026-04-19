# 🎮 TP-WEB — Hamadouche & Ozdoev
**Par Zakary Hamadouche & Akramat Ozdoev**
**Université Côte d'Azur — TP-WEB, Michel Buffa**

---

## 📌 Présentation du dépôt

Ce dépôt regroupe l'ensemble des projets réalisés dans le cadre du cours **TP-WEB**. Il contient trois jeux distincts développés en JavaScript pur, ainsi qu'une **infrastructure commune** (frontend d'accueil, backend Node.js/Express, base de données MongoDB) permettant l'authentification des joueurs et la persistance des scores.

| Projet | Technologie principale | Présentation |
|---|---|---|
| 🌌 **Météorite Canvas** | Canvas HTML5 | *à venir* |
| ⚽ **GamesOnWeb — Foot 3D** | Babylon.js (3D WebGL) | *à venir* |
| 🔌 **Neon ZIP** | Manipulation du DOM | [📺 Voir la vidéo](https://www.youtube.com/watch?v=2mVYGNk6eOI) |

🌐 **URL du site déployé** : https://tp-web-hamadouche-ozdoev.vercel.app

---

## 📂 Structure du dépôt

```
TP-WEB/
│
├── frontend/           → Page d'accueil commune (Hub) : portail vers les 3 jeux
│   ├── index.html      → Accueil principal avec auth (connexion / inscription)
│   ├── index.css       → Styles du hub (glassmorphism, animations)
│   ├── app.js          → Logique du hub (navigation, état de session)
│   ├── canvas.html/css/js  → Page de présentation du JeuCanvas
│   ├── dom.html/css/js     → Page de présentation de Neon ZIP
│   ├── gow.html/css/js     → Page de présentation de GamesOnWeb
│   └── assets/         → Images et ressources du hub
│
├── backend/            → Serveur Node.js/Express partagé
│   ├── models/         → Schémas Mongoose (User, Score, MatchHistory, CanvasProfile)
│   ├── controllers/    → Logique métier (auth, scores, profils, historique de matchs)
│   ├── authRoutes/     → Routes d'authentification (inscription/connexion JWT ou session)
│   └── connectDB/      → Connexion à MongoDB Atlas
│
├── api/                → Point d'entrée Vercel Serverless (Express adapter)
│   ├── index.js        → Serveur Express principal (routes, CORS, middleware)
│   └── [...path].js    → Catch-all pour Vercel
│
├── JeuCanvas/          → 🌌 Jeu Météorite Canvas (Canvas HTML5)
│   ├── index.html
│   ├── assets/         → Sons et images (vaisseaux, météorites, gadgets)
│   ├── css/
│   └── js/             → Modules : core, entities, niveaux, systems, ui, score
│
├── GamesOnWeb/         → ⚽ Jeu Football 3D (Babylon.js)
│   ├── index.html
│   ├── assets/         → Effets sonores (Sifflet, Kick, Goal)
│   ├── css/
│   ├── textures/       → Modèles 3D GLB (joueurs)
│   └── js/             → Modules : game, input, models, objects, score, structure, ui, utils
│
├── Dom/                → 🔌 Jeu Neon ZIP (DOM HTML)
│   ├── index.html
│   ├── style.css
│   ├── worker.js       → Web Worker de génération de puzzle
│   └── js/             → Modules : core, game, ui, worker, obstacles
│
├── package.json        → Dépendances Node (Express, Mongoose, bcryptjs, cors, dotenv)
├── vercel.json         → Configuration de déploiement Vercel (rewrites, redirections)
└── .env                → Variables d'environnement (MONGO_URI, secrets)
```

---

## ⚙️ Backend partagé

Le backend est un **serveur Express** connecté à une base de données **MongoDB Atlas**.

### Déploiement

| Composant | Plateforme | Rôle |
|---|---|---|
| **Frontend** (hub + jeux) | **Vercel** | Hébergement statique des pages HTML/CSS/JS avec rewrites par jeu |
| **Backend** (API REST) | **Railway** | Hébergement du serveur Node.js/Express en conteneur persistant |
| **Base de données** | **MongoDB Atlas** | Cluster cloud pour les comptes, scores et historiques de match |

Le frontend sur **Vercel** communique avec l'API hébergée sur **Railway** via des appels `fetch`. Les variables d'environnement (`MONGO_URI`, URL Railway) sont injectées au build Vercel via un fichier `runtime-config.js` généré dynamiquement par un script Node.

### Modèles de données

| Modèle | Rôle |
|---|---|
| `User` | Compte joueur (pseudo, email, mot de passe hashé avec bcrypt) |
| `Score` | Scores du jeu Neon ZIP (mode, temps, grille) |
| `MatchHistory` | Résultats des matchs GamesOnWeb (équipes, score, buts, mode) |
| `CanvasProfile` | Profil du jeu Météorite Canvas (vaisseaux achetés, or, scores solo/duo) |

### Routes principales

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `GET/POST` | `/api/scores` | Scores Neon ZIP |
| `GET/POST` | `/api/match-history` | Historique GamesOnWeb |
| `GET/POST` | `/api/canvas-profile` | Profil Météorite Canvas |

### Lancement local

```bash
npm install
npm start   
```

---

## 🎮 Les trois jeux

### 🌌 Météorite Canvas — [ReadMe détaillé](./JeuCanvas/ReadMe.md)

Space shooter 2D développé avec le **Canvas HTML5**. Le joueur pilote un vaisseau et affronte des vagues de météorites avec 3 modes de jeu (Solo, Duo, Duel), une boutique de vaisseaux, des gadgets et un système de particules.

**Technologies clés :** Canvas HTML5, modules ES6, `requestAnimationFrame`, `localStorage` puis backend MongoDB pour les profils.

---

### ⚽ GamesOnWeb — Foot 3D — [ReadMe détaillé](./GamesOnWeb/ReadMe.md)

Jeu de football 3D développé avec **Babylon.js**. Physique de balle, IA basée sur les steering behaviours, caméra broadcast dynamique, mode Tournoi (4 stades) et mode 1 vs 1 avec sélection de skins et manette.

**Technologies clés :** Babylon.js, API Gamepad, ES6 modules, backend MongoDB pour les scores.

---

### 🔌 Neon ZIP — [ReadMe détaillé](./Dom/ReadMe.md)

Puzzle game 2D de tracé de chemin développé avec la **manipulation du DOM HTML**. Génération de puzzles via Web Worker, trois niveaux de difficulté, mode Concepteur, obstacles et tableau de scores.

**Technologies clés :** DOM HTML, Web Worker, modules ES6, backend MongoDB pour les scores.

---

## 👥 Partie personnelle — Qui a fait quoi

### Répartition globale

**Zakary Hamadouche — 50% | Akramat Ozdoev — 50%**

On a vraiment travaillé main dans la main sur les trois projets du début à la fin. Il n'y a pas eu un projet porté par l'un ou l'autre — on s'est réparti les tâches de manière complémentaire à chaque fois.

---

### 🌐 Hub & Infrastructure commune

**Zakary** :
- Tout le **backend** : serveur Express, routes API, contrôleurs, modèles Mongoose, connexion MongoDB Atlas, déploiement sur **Railway**, gestion des variables d'environnement et génération du `runtime-config.js`.

**Akramat** :
- Tout le **frontend du hub** : page d'accueil (design, animations, glassmorphism), pages de présentation de chaque jeu (`canvas.html`, `dom.html`, `gow.html`), logique de connexion/inscription côté client, navigation entre les jeux.

---

### 🌌 Météorite Canvas

**Zakary** :
- Design général de l'interface et des menus (CSS, mise en page, animations)
- Système de particules (à l'impact, à l'explosion des météorites)
- Déplacement du vaisseau (physique, fluidité, dash)
- Ennemis finaux qui tirent des projectiles
- Système de réglages (remapping des touches, volumes)
- Certains gadgets (Éclair, Rafale…)
- Effets sonores et gestion audio
- Gestion des collisions
- Mode Duel (1 vs 1) et Mode Duo (2 joueurs)
- Intégration des scores avec le backend (MongoDB)

**Akramat** :
- Les différents types de vaisseaux (Classique, SPLIT, Spread, Ricochet) et leurs comportements de tir
- Système de vies et de game over
- Boutique de vaisseaux (interface, achat, équipement)
- Certains gadgets (Bouclier, Miroir, Cœur…)
- Scores en localStorage et affichage du tableau de scores

---

### ⚽ GamesOnWeb — Foot 3D

**Zakary** :
- Conception et modélisation de tous les stades (terrain, cages, poteaux, tribunes des 4 stades)
- Logique du mode Tournoi (progression Huitième → Quart → Demi → Finale)
- Sprint et tacle
- Support manette (API Gamepad, configuration des boutons)
- Mode 1 vs 1 complet (Carousel de skins 3D en temps réel, sélection du stade, flux de configuration)
- Paramètres en jeu (remapping touches J1/J2, volume, switch caméra)
- Gestion audio (sons de tir, de but, de sifflet, fallback HTMLAudio)
- Système de replay après chaque but
- Overlays de fin de match et de mi-temps
- Intro cinématique de début de match
- Design du menu principal (glassmorphism, preview au survol)
- Logique complète des scores (sauvegarde en base, historique)
- Toutes les caméras (Broadcast dynamique avec Brain/Rig/Runtime, TPS, FPV)

**Akramat** :
- IA des adversaires et des coéquipiers (steering behaviours : seek, arrive, intercept, flee, wander) avec comportements différenciés par rôle
- Remises en jeu (touches, corners, coups de pied de but)
- Détection et validation des buts
- Système de tir (mécanique, jauge de puissance, animation procédurale)
- Changement de joueur actif (switch automatique et manuel)
- Chargement et affichage des personnages 3D (fichiers GLB, placement par poste sur le terrain)

---

### 🔌 Neon ZIP

**Zakary** :
- Toute la logique de jeu (tracé du chemin, contraintes d'ordre des numéros, conditions de victoire)
- Web Worker (génération hamiltonienne par backtracking, sélection des indices, génération des obstacles)
- Architecture modulaire (`core`, `game`, `worker`, `obstacles`)

**Akramat** :
- Tout le frontend (rendu DOM de la grille, animations, connecteurs directionnels, overlays, menu, timer, système d'indices)
- Interface du mode Concepteur (glisser-déposer, validation de niveau)
- Affichage du tableau de scores

---

## 💪 Ce qui nous a posé le plus de difficultés

### 🌌 Météorite Canvas

La principale difficulté a été le **mode Duo sur le même clavier** : gérer deux joueurs simultanément avec des touches distinctes, sans que les événements clavier de l'un n'interfèrent avec l'autre, a demandé beaucoup de refactorisation de la couche d'input. Le **système de particules** était aussi un premier contact avec une gestion d'objets animés à haute fréquence sur le canvas, on a dû structurer un `ParticleManager` propre pour éviter les fuites mémoire et les ralentissements.

### ⚽ GamesOnWeb — Foot 3D

Sans conteste le projet le plus ambitieux. Plusieurs difficultés majeures :

- **La caméra broadcast dynamique** : faire bouger une caméra de façon naturelle (suivi de balle, zoom sur les tirs, shake sur les buts) sans qu'elle parte dans tous les sens était vraiment dur. On a dû créer une architecture en trois couches (Brain, Rig, Runtime) et calibrer des dizaines de paramètres d'interpolation pour que ça ressemble à une vraie diffusion TV.
- **Les steering behaviours** : l'intégration dans un contexte multi-joueurs avec des rôles différents (gardien qui protège sa cage, attaquant qui fait des appels, milieu qui se démarque) a nécessité beaucoup d'ajustements. Les valeurs de rayon d'influence et de pondération des comportements ont été testées et retestées.
- **La physique de la balle** : gérer le dribble (balle collée), le sprint (balle propulsée), les rebonds sur les poteaux et l'animation de sortie de terrain (chute parabolique) avec une physique entièrement custom (sans moteur physique Babylon) était techniquement délicat.
- **La compatibilité audio** : les navigateurs bloquent l'audio sans interaction utilisateur. On a dû implémenter un système de chargement avec plusieurs chemins candidats et un fallback HTMLAudio pour que les sons fonctionnent dans tous les contextes de déploiement.

### 🔌 Neon ZIP

La difficulté principale était l'**algorithme de génération du puzzle hamiltonien** : trouver un chemin qui passe par toutes les cases d'une grille 10×10 en respectant des indices fixes est un problème NP-difficile. On a utilisé un backtracking avec une heuristique de type Warnsdorff (degré minimum) pour que la génération reste rapide même sur les grandes grilles. Le déporter dans un **Web Worker** a été une bonne décision car les premières versions bloquaient complètement l'interface pendant la résolution.

---

## 💡 Pourquoi ces jeux ?

### 🌌 Météorite Canvas — *le choix évident*

On cherchait un jeu d'arcade qui exploite vraiment l'espace 2D, avec du mouvement, des projections et de l'action, et on a pensé directement aux space shooters qu'on avait l'habitude de croiser sur les bornes d'arcade. C'est un genre qu'on aimait jouer, donc ça nous a donné envie d'aller plus loin que le basique, d'où les multiples types de météorites, les gadgets, les vaisseaux spéciaux et les trois modes de jeu.

### ⚽ GamesOnWeb — Foot 3D — *la passion avant tout*

On est tous les deux de grands fans de football et de FIFA. Quand le concours GamesOnWeb a été annoncé, on s'est dit que faire un jeu de foot en 3D dans le navigateur pouvait être original tout en étant ce qu'on aime. Ce qui rendait le projet encore plus motivant : on se faisait souvent des remarques en jouant à FIFA sur des comportements bizarres de l'IA ou la façon dont la caméra se déplace. Le fait de se retrouver côté développeur pour recoder ces mêmes mécaniques nous a permis de comprendre pourquoi certaines choses sont plus difficiles qu'elles n'y paraissent depuis le côté joueur. C'était une vraie satisfaction de voir nos propres implémentations de steering, de caméra broadcast ou de physique de balle se rapprocher de ce qu'on voyait dans un jeu AAA.

### 🔌 Neon ZIP — *un puzzle avec une vraie logique*

Pour le projet DOM, on voulait un jeu qui exploite réellement la manipulation du DOM plutôt que de faire un simple dessiner/déplacer basique. On cherchait un jeu de grille avec une vraie contrainte algorithmique derrière. On connaissait déjà le jeu de tracé de chemin (du type *Flow Free*) et on a trouvé que sa variante avec remplissage total de la grille imposait une réflexion réelle au joueur. Ça nous permettait aussi d'implémenter un vrai algorithme de génération de puzzle (hamiltonien contraint), ce qui était plus challengeant et plus enrichissant que de partir sur quelque chose de trop simple.
