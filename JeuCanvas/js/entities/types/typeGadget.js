// Définition des types de gadgets et de leurs configurations

export const TYPE_GADGET = {
	ECLAIR: 'eclair',
	BOUCLIER: 'bouclier',
	MIRROIRE: 'mirroire',
	RAFALE: 'rafale',
	COEUR: 'coeur',
};

// Configuration des gadgets (effets, durées, intensités)
export const GADGET_CONFIG = {
	[TYPE_GADGET.ECLAIR]: {
		label: 'Éclair de vitesse',
		duration: 10000, // 10s
		speed: 2, // +2 de vitesse
	},

	[TYPE_GADGET.BOUCLIER]: {
		label: 'Bouclier',
		shield: 2, // 2 PV de bouclier
	},

	[TYPE_GADGET.MIRROIRE]: {
		label: 'Mirroire',
		teleport: true, // TP aléatoire à la prise
	},

	[TYPE_GADGET.RAFALE]: {
		label: 'Rafale',
		duration: 10000, // 10s
		unlimitedAmmo: true, // tir illimité
	},

	[TYPE_GADGET.COEUR]: {
		label: 'Coeur',
		heal: 1, // +1 PV instantané
	},
};
