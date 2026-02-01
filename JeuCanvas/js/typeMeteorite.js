export const TYPE_METEORITE = {
    NORMAL: 'normal',
    DYNAMITE: 'dynamite',
    ECLATS: 'eclats',
    LANCER: 'lancer',
    COSTAUD: 'costaud',
    NUAGE: 'nuage'
};

export const METEORITE_CONFIG = {
  [TYPE_METEORITE.NORMAL]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 40,
    hauteur: 40,
    vitesse: 0.2,
    pv: 1,
  },

  [TYPE_METEORITE.DYNAMITE]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 40,
    hauteur: 40,
    vitesse: 0.5,
    pv: 1,
    explodeAfterMs: 5000, 
    explosionRadius: 140,
  },

  [TYPE_METEORITE.ECLATS]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 40,
    hauteur: 40,
    vitesse: 0.2,
    pv: 1,
  },

  [TYPE_METEORITE.LANCER]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 40,
    hauteur: 40,
    vitesse: 0.7,
    pv: 1,
  },

  [TYPE_METEORITE.COSTAUD]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 50,
    hauteur: 50,
    vitesse: 0.12,
    pv: 5,
  },


  [TYPE_METEORITE.NUAGE]: {
    imagePath: './assets/img/meteorite.png',
    largeur: 50,
    hauteur: 50,
    vitesse: 0.2,
    pv: 1,
    cloudRadius: 190,
    cloudDurationMs: 4000,
  }
};