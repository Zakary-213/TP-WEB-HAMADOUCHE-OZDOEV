// Gestion des effets des gadgets (Éclair, Rafale, bouclier visuel, etc.)

// Appliquer l'effet Éclair: augmente la vitesse du vaisseau et initialise la durée pour l'affichage
export function applyEclairEffect(vaisseau, options = {}) {
	const speedDelta = (options.speedDelta !== undefined && options.speedDelta !== null) ? options.speedDelta : 2;
	const durationMs = (options.durationMs !== undefined && options.durationMs !== null) ? options.durationMs : 10000;

	const currentSpeed = (vaisseau.vitesse !== undefined && vaisseau.vitesse !== null) ? vaisseau.vitesse : 0;
	vaisseau.vitesse = currentSpeed + speedDelta;

	const now = performance.now();
	const endAt = now + durationMs;
	vaisseau.eclairDuration = durationMs;
	vaisseau.eclairEndAt = endAt;

	// Revenir à la vitesse précédente à la fin et nettoyer la barre si ce timer correspond
	setTimeout(() => {
		const cur = (vaisseau.vitesse !== undefined && vaisseau.vitesse !== null) ? vaisseau.vitesse : 0;
		vaisseau.vitesse = Math.max(0, cur - speedDelta);
		if (vaisseau.eclairEndAt === endAt) {
			vaisseau.eclairEndAt = null;
		}
	}, durationMs);

	return { token: endAt };
}

// Appliquer l'effet Rafale: tir quasi illimité pendant une durée donnée
export function applyRafaleEffect(vaisseau, options = {}) {
	const durationMs = (options.durationMs !== undefined && options.durationMs !== null) ? options.durationMs : 10000;
	const newDelay = (options.newDelay !== undefined && options.newDelay !== null) ? options.newDelay : 10; // délai quasi nul

	const previousDelay = (vaisseau.delayMinBetweenBullets !== undefined && vaisseau.delayMinBetweenBullets !== null)
		? vaisseau.delayMinBetweenBullets
		: 200; // valeur de secours

	vaisseau.delayMinBetweenBullets = newDelay;

	const now = performance.now();
	const endAt = now + durationMs;
	vaisseau.rafaleDuration = durationMs;
	vaisseau.rafaleEndAt = endAt;

	setTimeout(() => {
		// Restaure le délai de tir précédent seulement si ce timer est encore le bon
		if (vaisseau.rafaleEndAt === endAt) {
			vaisseau.delayMinBetweenBullets = previousDelay;
			vaisseau.rafaleEndAt = null;
		}
	}, durationMs);

	return { token: endAt };
}

// Dessiner la barre de durée Éclair au-dessus du vaisseau
export function drawEclairBar(ctx, vaisseau) {
	const now = performance.now();
	if (vaisseau.eclairEndAt !== undefined && vaisseau.eclairEndAt !== null && vaisseau.eclairDuration) {
		const remaining = vaisseau.eclairEndAt - now;
		if (remaining > 0) {
			const frac = Math.max(0, Math.min(1, remaining / vaisseau.eclairDuration));
			const barW = 60;
			const barH = 6;
			const offsetY = 12;
			const x = vaisseau.x - barW / 2;
			const y = vaisseau.y - vaisseau.hauteur / 2 - offsetY - barH;

			ctx.save();
			ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
			ctx.fillRect(x, y, barW, barH);
			ctx.fillStyle = '#FFD700';
			ctx.fillRect(x, y, barW * frac, barH);
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, barW, barH);
			ctx.restore();
		}
	}
}

// Dessiner la barre de durée Rafale au-dessus du vaisseau (noire)
export function drawRafaleBar(ctx, vaisseau) {
	const now = performance.now();
	if (vaisseau.rafaleEndAt !== undefined && vaisseau.rafaleEndAt !== null && vaisseau.rafaleDuration) {
		const remaining = vaisseau.rafaleEndAt - now;
		if (remaining > 0) {
			const frac = Math.max(0, Math.min(1, remaining / vaisseau.rafaleDuration));
			const barW = 60;
			const barH = 6;
			const offsetY = 4; // légèrement en dessous de la barre Éclair
			const x = vaisseau.x - barW / 2;
			const y = vaisseau.y - vaisseau.hauteur / 2 - offsetY;

			ctx.save();
			ctx.fillStyle = 'rgba(50, 0, 80, 0.7)'; // fond violet sombre
			ctx.fillRect(x, y, barW, barH);
			ctx.fillStyle = '#C77DFF'; // violet vif pour la jauge
			ctx.fillRect(x, y, barW * frac, barH);
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, barW, barH);
			ctx.restore();
		}
	}
}

// Dessiner une bulle bleue autour du vaisseau quand le bouclier est actif
export function drawShieldBubble(ctx, vaisseau) {
	const shieldHP = (vaisseau.shieldHP !== undefined && vaisseau.shieldHP !== null) ? vaisseau.shieldHP : 0;
	if (shieldHP > 0) {
		const radius = Math.max(vaisseau.largeur, vaisseau.hauteur) * 0.65;
		ctx.save();
		ctx.strokeStyle = 'rgba(80, 160, 255, 0.9)';
		ctx.fillStyle = 'rgba(80, 160, 255, 0.15)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(vaisseau.x, vaisseau.y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
}

