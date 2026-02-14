/**
 * @module CollisionUtils
 * @description Boîte à outils mathématique pour la détection de collisions.
 * Contient des algorithmes optimisés pour les interactions entre différentes formes géométriques.
 */

/**
 * @class CollisionUtils
 * @description Fournit des méthodes utilitaires pour calculer les intersections entre objets.
 */
export default class CollisionUtils {

    /**
     * Détecte une collision entre un rectangle (défini par son centre) et un cercle.
     * Algorithme du point le plus proche (Clamping).
     * * @param {number} rx - Position X du centre du rectangle.
     * @param {number} ry - Position Y du centre du rectangle.
     * @param {number} rw - Largeur du rectangle.
     * @param {number} rh - Hauteur du rectangle.
     * @param {number} cx - Position X du centre du cercle.
     * @param {number} cy - Position Y du centre du cercle.
     * @param {number} r  - Rayon du cercle.
     * @returns {boolean} True si une collision est détectée.
     */
    rectCircleFromCenter(rx, ry, rw, rh, cx, cy, r) {

        // 1) Conversion du rectangle : Centre vers Coin Supérieur Gauche
        // Nécessaire pour faciliter les calculs de limites (bounding box).
        const rectX = rx - rw / 2;
        const rectY = ry - rh / 2;

        /**
         * 2) Identification du point du rectangle le plus proche du centre du cercle.
         * On "contraint" (clamp) les coordonnées du cercle à l'intérieur des limites du rectangle.
         */
        let testX = cx;
        let testY = cy;

        // Limite horizontale
        if (testX < rectX) testX = rectX;
        else if (testX > rectX + rw) testX = rectX + rw;
        
        // Limite verticale
        if (testY < rectY) testY = rectY;
        else if (testY > rectY + rh) testY = rectY + rh;

        /**
         * 3) Calcul de la distance entre le centre du cercle et ce point le plus proche.
         */
        const dx = cx - testX;
        const dy = cy - testY;

        /**
         * 4) Vérification de la collision.
         * Note : On compare les distances au carré (dx² + dy² < r²) pour éviter 
         * l'appel coûteux à la fonction Math.sqrt().
         */
        return (dx * dx + dy * dy) < r * r;
    }
}