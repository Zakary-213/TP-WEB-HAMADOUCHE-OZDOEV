export default class ObjetGraphique {
    x = 0;
    y = 0;
    image = null;
    largeur = 40;
    hauteur = 40;
    vitesse = 3;
    //hitbox = 80;
    angle = 0;

    constructor(x, y, imagePath, largeur, hauteur, vitesse) {
        this.x = x;
        this.y = y;

        if (largeur) this.largeur = largeur;
        if (hauteur) this.hauteur = hauteur;
        if (vitesse) this.vitesse = vitesse;

        this.image = new Image();
        this.image.src = imagePath;
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
