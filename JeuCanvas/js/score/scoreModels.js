export function createSoloScore({ pseudo, niveaux }) {

    const totalTime = niveaux.reduce((acc, lvl) => acc + lvl.time, 0);
    const totalMeteorites = niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);

    return {
        pseudo,
        niveaux,
        totalTime,
        totalMeteorites,
        date: Date.now()
    };
}

export function createDuoScore({ joueur1, joueur2, niveauxTime }) {

    const totalTime = niveauxTime.reduce((acc, lvl) => acc + lvl.time, 0);

    const totalMeteoritesJ1 = joueur1.niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);
    const totalMeteoritesJ2 = joueur2.niveaux.reduce((acc, lvl) => acc + lvl.meteorites, 0);

    return {
        joueurs: [
            {
                pseudo: joueur1.pseudo,
                niveaux: joueur1.niveaux,
                totalMeteorites: totalMeteoritesJ1
            },
            {
                pseudo: joueur2.pseudo,
                niveaux: joueur2.niveaux,
                totalMeteorites: totalMeteoritesJ2
            }
        ],
        niveaux: niveauxTime,
        totalTime,
        totalMeteorites: totalMeteoritesJ1 + totalMeteoritesJ2,
        date: Date.now()
    };
}


