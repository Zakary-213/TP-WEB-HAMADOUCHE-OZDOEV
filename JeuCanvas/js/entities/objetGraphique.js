/**
 * @module ObjetGraphique
 * @description Classe de base pour tous les éléments affichables du jeu.
 * Gère les propriétés physiques communes (position, dimensions, vie) et le rendu de base.
 */

export default class ObjetGraphique {
    // Propriétés par défaut (Initialisation des champs de classe)
    x = 0;
    y = 0;
    image = null;
    largeur = 40;
    hauteur = 40;
    vitesse = 3;
    angle = 0;
    pointsDeVie = 1;

    /**
     * @param {number} x - Coordonnée X (centre de l'objet).
     * @param {number} y - Coordonnée Y (centre de l'objet).
     * @param {string|HTMLImageElement} imagePath - URL de l'image ou élément Image préchargé.
     * @param {number} [largeur=40] - Largeur d'affichage.
     * @param {number} [hauteur=40] - Hauteur d'affichage.
     * @param {number} [vitesse=3] - Vitesse de déplacement de base.
     * @param {number} [pointsDeVie=1] - Résistance de l'objet.
     */
    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 1) {
        this.x = x;
        this.y = y;

        // On utilise les valeurs passées si elles existent, sinon on garde les défauts
        if (largeur) this.largeur = largeur;
        if (hauteur) this.hauteur = hauteur;
        if (vitesse) this.vitesse = vitesse;

        /**
         * Gestion flexible de l'image :
         * Supporte soit un chemin (string) soit un objet Image déjà chargé (AssetLoader).
         */
        if (imagePath instanceof HTMLImageElement) {
            this.image = imagePath;
        } else {
            this.image = new Image();
            this.image.src = imagePath;
        }

        this.pointsDeVie = pointsDeVie;
    }

    /**
     * Réduit les points de vie de l'objet.
     * @param {number} [valeur=1] - Quantité de dégâts subis.
     */
    perdreVie(valeur = 1) {
        this.pointsDeVie -= valeur;
    }

    /**
     * Vérifie si l'objet est détruit.
     * @returns {boolean} True si PV <= 0.
     */
    estMort() {
        return this.pointsDeVie <= 0;
    }
    
    /**
     * Effectue le rendu de l'image sur le canvas avec support de la rotation.
     * @param {CanvasRenderingContext2D} ctx - Le contexte 2D du canvas.
     */
    draw(ctx) {
        // On sauvegarde l'état du contexte pour ne pas affecter les autres dessins
        ctx.save();
        
        // On ne dessine que si l'image est bien chargée pour éviter les erreurs
        if (this.image.complete && this.image.naturalWidth > 0) {
            // 1. On déplace le point d'origine au centre de l'objet
            ctx.translate(this.x, this.y);
            
            // 2. On applique la rotation
            ctx.rotate(this.angle);
            
            /**
             * 3. Dessin de l'image.
             * On dessine à (-largeur/2, -hauteur/2) pour que (x, y) soit bien le CENTRE.
             */
            ctx.drawImage(
                this.image,
                -this.largeur / 2,
                -this.hauteur / 2,
                this.largeur,
                this.hauteur
            );
        }
        
        // On restaure le contexte à son état initial
        ctx.restore();
    }

    /**
     * Déplace l'objet selon un vecteur directionnel.
     * @param {number} dx - Direction sur l'axe X (-1, 0, 1).
     * @param {number} dy - Direction sur l'axe Y (-1, 0, 1).
     */
    move(dx, dy) {
        this.x += dx * this.vitesse;
        this.y += dy * this.vitesse;
    }
}