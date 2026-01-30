import Vaisseau from './vaisseau.js';
import GameManager from './gameManager.js';
import { loadAssets } from './assetLoader.js';

let canvas;
let ctx;
let monVaisseau;
let gameManager;
let gameStarted = false;
let loadedAssets; // Déclaration de la variable
const lastKeyPress = {};
const DOUBLE_TAP_DELAY = 250; // ms

let coeurs;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.startBoutton').addEventListener('click', async () => {
        if (!gameStarted) {
            gameStarted = true;
            document.querySelector('div.boutton').style.display = 'none';
            document.getElementById('monCanvas').classList.add('game-active');
            startGame();
        }
    });

    // Bouton Options - Redirection vers page réglages
    document.querySelector('.Réglage').addEventListener('click', () => {
        window.location.href = 'html/reglage.html';
    });

    // Tableau des cœurs pour la barre de vie
    coeurs = document.querySelectorAll('.barreDeVie img');

    // Cacher les cœurs au départ
    coeurs.forEach(coeur => coeur.style.visibility = "hidden");
    
    // Charger les assets dès le démarrage
    loadAssetsOnStart();
});

// Gestion des touches pressées
let keys = {};

// Charger les touches personnalisées depuis localStorage
let customKeys = {
    up: localStorage.getItem('key_up') || '↑',
    left: localStorage.getItem('key_left') || '←',
    down: localStorage.getItem('key_down') || '↓',
    right: localStorage.getItem('key_right') || '→',
    shoot: localStorage.getItem('key_shoot') || 'Entrée'
};

// Convertir les symboles de flèches en touches réelles
function getActualKey(savedKey) {
    const keyMap = {
        '↑': 'ArrowUp',
        '↓': 'ArrowDown',
        '←': 'ArrowLeft',
        '→': 'ArrowRight',
        'Entrée': 'Enter',
        'Espace': ' '
    };
    return keyMap[savedKey] || savedKey.toLowerCase();
}

// Convertir toutes les touches personnalisées
customKeys.up = getActualKey(customKeys.up);
customKeys.left = getActualKey(customKeys.left);
customKeys.down = getActualKey(customKeys.down);
customKeys.right = getActualKey(customKeys.right);
customKeys.shoot = getActualKey(customKeys.shoot);

// Définis les assets à charger
var assetsToLoadURLs = {
    vaisseau: { url: './assets/img/vaisseau.png' },
    meteorite: { url: './assets/img/meteorite.png' },
    vie: { url: './assets/img/vie.png' },
    gameMusic: { url: './assets/audio/ingame.mp3', buffer: true, loop: true, volume: 0.5 }
};

// Charger les assets au démarrage (avant le jeu)
async function loadAssetsOnStart() {
    loadedAssets = await loadAssets(assetsToLoadURLs);
}

function startGame() {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');

    gameManager = new GameManager(canvas);

    monVaisseau = new Vaisseau(
        canvas.width / 2,
        canvas.height / 2,
        loadedAssets.vaisseau,  
        50,  
        50, 
        1.5, // Vitesse du vaisseau
        3 // Points de vie du vaisseau
    );
    updateBarreDeVie();

    // Spawn la première météorite
    gameManager.spawnMeteorrite();

    document.addEventListener('keydown', (e) => {

        if(e.repeat) return; 

        const now = performance.now();
        if (lastKeyPress[e.key] && now - lastKeyPress[e.key] < DOUBLE_TAP_DELAY) {

            let dx = 0;
            let dy = 0;

            if (e.key === customKeys.up) dy = -1;
            if (e.key === customKeys.down) dy = 1;
            if (e.key === customKeys.left) dx = -1;
            if (e.key === customKeys.right) dx = 1;

            if (dx !== 0 || dy !== 0) {
                monVaisseau.startDash(dx, dy);
            }
        }
        // on mémorise le moment de l'appui
        lastKeyPress[e.key] = now;


        keys[e.key] = true;
        if(e.key == customKeys.shoot) {
            monVaisseau.addBullet(performance.now());
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Lancer la boucle de jeu
    gameLoop();
}

async function init() {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');

    loadedAssets = await loadAssets(assetsToLoadURLs);

    gameManager = new GameManager(canvas);

    monVaisseau = new Vaisseau(
        canvas.width / 2,
        canvas.height / 2,
        loadedAssets.vaisseau,  
        50,  
        50, 
        1.5, // Vitesse du vaisseau
        3 // Points de vie du vaisseau
    );
    updateBarreDeVie();

    // Spawn la première météorite
    gameManager.spawnMeteorrite();

    document.addEventListener('keydown', (e) => {

        if(e.repeat) return; 

        const now = performance.now();
        if (lastKeyPress[e.key] && now - lastKeyPress[e.key] < DOUBLE_TAP_DELAY) {

            let dx = 0;
            let dy = 0;

            if (e.key === customKeys.up) dy = -1;
            if (e.key === customKeys.down) dy = 1;
            if (e.key === customKeys.left) dx = -1;
            if (e.key === customKeys.right) dx = 1;

            if (dx !== 0 || dy !== 0) {
                monVaisseau.startDash(dx, dy);
            }
        }
        // on mémorise le moment de l’appui
        lastKeyPress[e.key] = now;


        keys[e.key] = true;
        if(e.key == customKeys.shoot) {
            monVaisseau.addBullet(performance.now());
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Lancer la boucle de jeu
    gameLoop();
}

function gameLoop() {
    // Effacer le canvas à chaque frame
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameManager.gameState === "hit") {
        monVaisseau.draw(ctx);
        requestAnimationFrame(gameLoop);
        return;
    }

    // Calculer la direction basée sur les touches personnalisées
    let dx = 0;
    let dy = 0;

    if (keys[customKeys.up]) dy = -1;
    if (keys[customKeys.down]) dy = 1;
    if (keys[customKeys.left]) dx = -1;
    if (keys[customKeys.right]) dx = 1;

    monVaisseau.moveInDirection(dx, dy);

    // Garder le vaisseau dans les limites du canvas
    const margin = monVaisseau.largeur / 2;
    monVaisseau.x = Math.max(margin, Math.min(monVaisseau.x, canvas.width - margin));
    monVaisseau.y = Math.max(margin, Math.min(monVaisseau.y, canvas.height - margin));

    // Mettre à jour les collisions via GameManager
    gameManager.update(monVaisseau);
    updateBarreDeVie();

    // Vérifier si le vaisseau est mort
    if (monVaisseau.estMort()) {
        gameManager.setGameOver();
        alert("Game Over !");
    }

    // Dessiner les météorites
    gameManager.draw(ctx);

    // Dessiner le vaisseau
    monVaisseau.draw(ctx);

    // Mettre à jour et dessiner les bullets
    for(let i = monVaisseau.bullets.length - 1; i >= 0; i--) {        
        const bullet = monVaisseau.bullets[i];
        bullet.move();
        bullet.draw(ctx);

        if(bullet.estHorsCanvas(canvas.width, canvas.height)) {
            monVaisseau.bullets.splice(i, 1);
        }
    }

    // Relancer la boucle
    requestAnimationFrame(gameLoop);
}

function updateBarreDeVie() {
    for (let i = 0; i < coeurs.length; i++) {
        if (i < monVaisseau.pointsDeVie) {
            coeurs[i].style.visibility = "visible";
        } else {
            coeurs[i].style.visibility = "hidden";
        }
    }
}