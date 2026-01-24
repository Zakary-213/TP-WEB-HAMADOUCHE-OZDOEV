import Vaisseau from './vaisseau.js';
import Meteorite from './meteorite.js';
import CollisionUtils from './collisionUtils.js';


let canvas;
let ctx;
let monVaisseau;
let meteorites = [];
let gameStarted = false;
const collisionUtils = new CollisionUtils();

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
        0.2  // Vitesse de descente
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

    // Calculer la direction basée sur les touches flèches
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp']) dy = -1;
    if (keys['ArrowDown']) dy = 1;
    if (keys['ArrowLeft']) dx = -1;
    if (keys['ArrowRight']) dx = 1;

    monVaisseau.moveInDirection(dx, dy);

    // Garder le vaisseau dans les limites du canvas
    const margin = monVaisseau.largeur / 2;
    monVaisseau.x = Math.max(margin, Math.min(monVaisseau.x, canvas.width - margin));
    monVaisseau.y = Math.max(margin, Math.min(monVaisseau.y, canvas.height - margin));

    // Déplacer et dessiner les météorites
    meteorites.forEach((meteorite, index) => {
        meteorite.descendre();
        meteorite.draw(ctx);

        // Test de collision avec le vaisseau (central)
        const collision = collisionUtils.rectCircleFromCenter(
            monVaisseau.x,         // centre X du vaisseau
            monVaisseau.y,         // centre Y du vaisseau
            monVaisseau.largeur,   // largeur du vaisseau
            monVaisseau.hauteur,   // hauteur du vaisseau

            meteorite.x,           // centre X de la météorite
            meteorite.y,           // centre Y de la météorite
            meteorite.largeur / 2  // rayon de la météorite
        );

        if (collision) 
        {
            console.log("💥 COLLISION DÉTECTÉE");
        }

        // Supprimer si sortie du canvas
        if (meteorite.estHorsCanvas(canvas.height)) {
            meteorites.splice(index, 1);
        }
    });

    // Dessiner le vaisseau
    monVaisseau.draw(ctx);

    /**********            **************/
    // 🔍 DEBUG : hitbox du vaisseau
    drawVaisseauHitbox(ctx, monVaisseau);

    // Déplacer et dessiner les météorites
    meteorites.forEach((meteorite) => {
        meteorite.descendre();
        meteorite.draw(ctx);

        // 🔍 DEBUG : hitbox de la météorite
        drawMeteoriteHitbox(ctx, meteorite);
    });
    /**********            **************/

    // Relancer la boucle
    requestAnimationFrame(gameLoop);
}

function drawVaisseauHitbox(ctx, vaisseau) {
    ctx.save();

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    // conversion centre → coin supérieur gauche
    const x = vaisseau.x - vaisseau.largeur / 2;
    const y = vaisseau.y - vaisseau.hauteur / 2;

    ctx.strokeRect(
        x,
        y,
        vaisseau.largeur,
        vaisseau.hauteur
    );

    ctx.restore();
}

function drawMeteoriteHitbox(ctx, meteorite) {
    ctx.save();

    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
        meteorite.x,                  // centre X
        meteorite.y,                  // centre Y
        meteorite.largeur / 2,         // rayon
        0,
        Math.PI * 2
    );
    ctx.stroke();

    ctx.restore();
}
