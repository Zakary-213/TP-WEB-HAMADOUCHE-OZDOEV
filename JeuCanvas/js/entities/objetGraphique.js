export default class ObjetGraphique {
    x = 0;
    y = 0;
    image = null;
    largeur = 40;
    hauteur = 40;
    vitesse = 3;
    //hitbox = 80;
    angle = 0;
    pointsDeVie = 1;

    constructor(x, y, imagePath, largeur, hauteur, vitesse, pointsDeVie = 1) {
        this.x = x;
        this.y = y;

        if (largeur) this.largeur = largeur;
        if (hauteur) this.hauteur = hauteur;
        if (vitesse) this.vitesse = vitesse;

        // Si c'est déjà un objet Image, on l'utilise directement
        if (imagePath instanceof HTMLImageElement) {
            this.image = imagePath;
        } else {
            // Sinon, on crée une nouvelle image avec le path
            this.image = new Image();
            this.image.src = imagePath;
        }

        this.pointsDeVie = pointsDeVie;
    }

    perdreVie(valeur = 1) {
        this.pointsDeVie -= valeur;
    }

    estMort(){
        return this.pointsDeVie <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        
        if (this.image.complete && this.image.naturalWidth > 0) {
            ctx.translate(this.x, this.y);
            
            ctx.rotate(this.angle);
            
            ctx.drawImage(
                this.image,
                -this.largeur / 2,
                -this.hauteur / 2,
                this.largeur,
                this.hauteur
            );
        }
        
        ctx.restore();
    }

    move(dx, dy) {
        this.x += dx * this.vitesse;
        this.y += dy * this.vitesse;
    }
    
}
