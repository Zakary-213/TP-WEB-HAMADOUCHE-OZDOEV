export const TYPE_GADGET = {
	ECLAIR: 'eclair',      // Accélération temporaire
	BOUCLIER: 'bouclier',  // Protection contre les dégâts
	MIRROIRE: 'mirroire',  // Téléportation aléatoire
	RAFALE: 'rafale',      // Tir illimité temporaire
	COEUR: 'coeur',        // Restaure de la vie
};


export const GADGET_CONFIG = {
	[TYPE_GADGET.ECLAIR]: {
		label: 'Éclair de vitesse',   // Nom affiché
		duration: 10000,              // Durée de l'effet (ms)
		speed: 2,                     // Bonus de vitesse
	},
	[TYPE_GADGET.BOUCLIER]: {
		label: 'Bouclier',            // Nom affiché
		shield: 2,                    // Peut encaisser deux hits
	},
	[TYPE_GADGET.MIRROIRE]: {
		label: 'Mirroire',            // Nom affiché
		teleport: true,               // Téléportation aléatoire à la prise
	},
	[TYPE_GADGET.RAFALE]: {
		label: 'Rafale',              // Nom affiché
		duration: 10000,              // Durée de l'effet (ms)
		unlimitedAmmo: true,          // Tir illimité pendant l'effet
	},
	[TYPE_GADGET.COEUR]: {
		label: 'Coeur',               // Nom affiché
		heal: 1,                      // Points de vie restaurés instantanément
	},
};
