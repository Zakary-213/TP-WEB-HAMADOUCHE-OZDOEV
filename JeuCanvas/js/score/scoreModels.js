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

export function createDuelScore({ joueur1, joueur2 }) {

    let totalDiff = 0;

    for (let i = 0; i < joueur1.manches.length; i++) {
        totalDiff += joueur1.manches[i] - joueur2.manches[i];
    }

    const winner = totalDiff >= 0 ? joueur1.pseudo : joueur2.pseudo;

    return {
        joueurs: [
            {
                pseudo: joueur1.pseudo,
                manches: joueur1.manches
            },
            {
                pseudo: joueur2.pseudo,
                manches: joueur2.manches
            }
        ],
        totalDiff,
        winner,
        date: Date.now()
    };
}
