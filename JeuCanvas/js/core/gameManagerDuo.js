import { drawEclairBar, drawShieldBubble, drawRafaleBar } from '../systems/effectsGadget.js';



export default class GameManagerDuo {
	constructor(canvas) {
		this.canvas = canvas;
	}

	clampVaisseauToCanvas(vaisseau) {
		if (!vaisseau) return;
		const marginX = vaisseau.largeur / 2;
		const marginY = vaisseau.hauteur / 2;
		vaisseau.x = Math.max(marginX, Math.min(vaisseau.x, this.canvas.width - marginX));
		vaisseau.y = Math.max(marginY, Math.min(vaisseau.y, this.canvas.height - marginY));
	}

	updateBullets(vaisseau) {
		if (!vaisseau || !vaisseau.bullets) return;
		for (let i = vaisseau.bullets.length - 1; i >= 0; i--) {
			const bullet = vaisseau.bullets[i];
			bullet.move(this.canvas.width, this.canvas.height);

			if (bullet.estHorsCanvas(this.canvas.width, this.canvas.height) && bullet.bounces === 0) {
				vaisseau.bullets.splice(i, 1);
			}
		}
	}


	update(vaisseau1, vaisseau2, dx1, dy1, dx2, dy2) {
		if (vaisseau1) {
			vaisseau1.moveInDirection(dx1, dy1);
			this.clampVaisseauToCanvas(vaisseau1);
			this.updateBullets(vaisseau1);
		}
		if (vaisseau2) {
			vaisseau2.moveInDirection(dx2, dy2);
			this.clampVaisseauToCanvas(vaisseau2);
			this.updateBullets(vaisseau2);
		}
	}

	draw(ctx, vaisseau1, vaisseau2) {
		if (vaisseau1) {
			vaisseau1.draw(ctx);
			drawShieldBubble(ctx, vaisseau1);
			drawEclairBar(ctx, vaisseau1);
			drawRafaleBar(ctx, vaisseau1);
		}

		if (vaisseau2) {
			vaisseau2.draw(ctx);
			drawShieldBubble(ctx, vaisseau2);
			drawEclairBar(ctx, vaisseau2);
			drawRafaleBar(ctx, vaisseau2);
		}
	}
}

