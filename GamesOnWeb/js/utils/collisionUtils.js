// js/utils/collisionUtils.js
// Fonctions de détection de collisions (inspirées du cours, adaptées pour la 3D Babylon.js)
// Supporte les collisions 2D (plan XZ) et 3D (sphères, cylindres)

// ─────────────────────────────────────────────────────────────────────────────
// 2D — sur le plan XZ (vue de dessus, y ignoré)
// Même style que le fichier du cours
// ─────────────────────────────────────────────────────────────────────────────

// Collision cercle / cercle sur le plan XZ
// x1,z1 : centre du cercle 1, r1 : rayon
// x2,z2 : centre du cercle 2, r2 : rayon
function circleCollideXZ(x1, z1, r1, x2, z2, r2) {
    var dx = x1 - x2;
    var dz = z1 - z2;
    return (dx * dx + dz * dz) < (r1 + r2) * (r1 + r2);
}

// Collision rectangle / rectangle alignés axes (position = coin supérieur gauche)
// x1,z1 : coin haut-gauche du rect 1, w1 : largeur, h1 : profondeur (axe Z)
function rectsOverlapXZ(x1, z1, w1, h1, x2, z2, w2, h2) {
    if ((x1 > (x2 + w2)) || ((x1 + w1) < x2)) return false; // pas de chevauchement X
    if ((z1 > (z2 + h2)) || ((z1 + h1) < z2)) return false; // pas de chevauchement Z
    return true;
}

// Idem mais avec x,z au centre (plus pratique pour nos objets)
function rectsOverlapFromCenterXZ(x1, z1, w1, h1, x2, z2, w2, h2) {
    let rx1 = x1 - w1 / 2;
    let rz1 = z1 - h1 / 2;
    let rx2 = x2 - w2 / 2;
    let rz2 = z2 - h2 / 2;
    return rectsOverlapXZ(rx1, rz1, w1, h1, rx2, rz2, w2, h2);
}

// Collision cercle / rectangle aligné axes, rectangle défini par coin haut-gauche
function circRectOverlapXZ(rx, rz, rw, rh, cx, cz, r) {
    var testX = cx;
    var testZ = cz;
    if (testX < rx)        testX = rx;
    if (testX > (rx + rw)) testX = rx + rw;
    if (testZ < rz)        testZ = rz;
    if (testZ > (rz + rh)) testZ = rz + rh;
    return ((cx - testX) * (cx - testX) + (cz - testZ) * (cz - testZ)) < r * r;
}

// Idem avec le rectangle centré en (rx, rz)
function circRectOverlapFromCenterXZ(rx, rz, rw, rh, cx, cz, r) {
    let rrx = rx - rw / 2;
    let rrz = rz - rh / 2;
    return circRectOverlapXZ(rrx, rrz, rw, rh, cx, cz, r);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D — Babylon.js (Vector3)
// ─────────────────────────────────────────────────────────────────────────────

// Collision sphère / sphère en 3D
// posA, posB : BABYLON.Vector3 (centres des sphères)
// rA, rB     : rayons
function spheresCollide(posA, rA, posB, rB) {
    var dx = posA.x - posB.x;
    var dy = posA.y - posB.y;
    var dz = posA.z - posB.z;
    var distSq = dx * dx + dy * dy + dz * dz;
    var sumR = rA + rB;
    return distSq < sumR * sumR;
}

// Collision sphère / sphère uniquement sur le plan XZ (y ignoré)
// Utile pour joueur ↔ balle ou joueur ↔ joueur
function spheresCollideXZ(posA, rA, posB, rB) {
    return circleCollideXZ(posA.x, posA.z, rA, posB.x, posB.z, rB);
}

// Vérifie si un joueur (cylindre approximé par un cercle XZ) touche la balle (sphère)
// player : objet avec une propriété .position (BABYLON.Vector3)
// ball   : objet avec une propriété .position (BABYLON.Vector3)
// playerRadius : rayon de collision du joueur (défaut 1.0)
// ballRadius   : rayon de collision de la balle (défaut 0.55)
function playerTouchesBall(player, ball, playerRadius, ballRadius) {
    playerRadius = playerRadius !== undefined ? playerRadius : 1.0;
    ballRadius   = ballRadius   !== undefined ? ballRadius   : 0.55;
    if (!player || !player.position || !ball || !ball.position) return false;
    return spheresCollideXZ(player.position, playerRadius, ball.position, ballRadius);
}

// Vérifie si deux joueurs se chevauchent (pour les empêcher de se traverser)
function playersTouching(playerA, playerB, radiusA, radiusB) {
    radiusA = radiusA !== undefined ? radiusA : 1.0;
    radiusB = radiusB !== undefined ? radiusB : 1.0;
    if (!playerA || !playerA.position || !playerB || !playerB.position) return false;
    return spheresCollideXZ(playerA.position, radiusA, playerB.position, radiusB);
}

// Calcule le vecteur de séparation de A par rapport à B (A doit "être repoussé" par B)
// Retourne un BABYLON.Vector3 normalisé (ou null si positions identiques)
function separationVector(posA, posB) {
    var dx = posA.x - posB.x;
    var dz = posA.z - posB.z;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.0001) return null;
    return new BABYLON.Vector3(dx / len, 0, dz / len);
}

// Résout la collision entre deux joueurs (les repousse l'un de l'autre)
// overlap : quantité de chevauchement à corriger
function resolvePlayerCollision(playerA, playerB, radiusA, radiusB) {
    radiusA = radiusA !== undefined ? radiusA : 1.0;
    radiusB = radiusB !== undefined ? radiusB : 1.0;
    if (!playerA || !playerA.position || !playerB || !playerB.position) return;

    var dx = playerA.position.x - playerB.position.x;
    var dz = playerA.position.z - playerB.position.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    var minDist = radiusA + radiusB;

    if (dist < minDist && dist > 0.0001) {
        // Chevauchement à corriger
        var overlap = (minDist - dist) / 2;
        var nx = dx / dist; // normale de séparation
        var nz = dz / dist;

        // On repousse chaque joueur de la moitié du chevauchement
        playerA.position.x += nx * overlap;
        playerA.position.z += nz * overlap;
        playerB.position.x -= nx * overlap;
        playerB.position.z -= nz * overlap;
    }
}
