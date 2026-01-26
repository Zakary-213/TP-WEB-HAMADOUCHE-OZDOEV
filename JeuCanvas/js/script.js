import Vaisseau from './vaisseau.js';
import Meteorite from './meteorite.js';

let canvas;
let ctx;
let monVaisseau;
let meteorites = [];
let gameStarted = false;

document.querySelector('.startBoutton').addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
        document.querySelector('div.boutton').style.display = 'none';
        document.getElementById('monCanvas').classList.add('game-active');
        init();
    }
});

// Bouton Options - Redirection vers page réglages
document.querySelector('.Réglage').addEventListener('click', () => {
    window.location.href = 'html/reglage.html';
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

function init() {
    canvas = document.getElementById('monCanvas');
    ctx = canvas.getContext('2d');

    monVaisseau = new Vaisseau(
        canvas.width / 2,
        canvas.height / 2,
        './assets/img/vaisseau.png',  
        50,  
        50   
    );

    // Créer une météorite qui part du haut
    let meteorite = new Meteorite(
        Math.random() * canvas.width,  // Position X aléatoire
        -50,  // En haut du canvas (hors écran)
        './assets/img/meteorite.png',  // Image de la météorite
        40,
        40,
        2  // Vitesse de descente
    );
    meteorites.push(meteorite);

    // Écouter les touches clavier
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Lancer la boucle de jeu
    gameLoop();
}

function gameLoop() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // Déplacer et dessiner les météorites
    meteorites.forEach((meteorite, index) => {
        meteorite.descendre();
        meteorite.draw(ctx);

        // Supprimer si sortie du canvas
        if (meteorite.estHorsCanvas(canvas.height)) {
            meteorites.splice(index, 1);
        }
    });

    // Dessiner le vaisseau
    monVaisseau.draw(ctx);

    // Relancer la boucle
    requestAnimationFrame(gameLoop);
}