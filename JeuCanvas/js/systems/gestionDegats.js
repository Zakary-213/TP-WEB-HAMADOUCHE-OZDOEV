// Classe centralisant la logique de dégâts et de protection

export default class GestionDegats {
    constructor(hitDuration = 600) {
        this.hitDuration = hitDuration;
    }

    appliquerCoup(vaisseau, gameManager) {
        // Ne pas traiter si on n'est pas en jeu
        if (!gameManager || gameManager.gameState !== "playing") return;

        // Consommer d'abord le bouclier s'il est actif
        const shieldHP = (vaisseau.shieldHP !== undefined && vaisseau.shieldHP !== null) ? vaisseau.shieldHP : 0;
        if (shieldHP > 0) {
            vaisseau.shieldHP = shieldHP - 1;
            // Coup absorbé: pas de shake, pas de perte de vie, pas de changement d'état
            return;
        }

        // Coup non absorbé: animation de hit + perte de vie
        gameManager.gameState = "hit";
        if (typeof vaisseau.startShake === 'function') {
            vaisseau.startShake();
        }
        if (typeof vaisseau.perdreVie === 'function') {
            vaisseau.perdreVie(1);
            if (gameManager.assets && gameManager.assets.life && typeof gameManager.assets.life.play === 'function') {
                gameManager.assets.life.play();
            }
        }

        // Game over si le vaisseau est mort (solo) ; en duo, il n'y a pas de setGameOver
        if (typeof vaisseau.estMort === 'function' && vaisseau.estMort()) {
            if (typeof gameManager.setGameOver === 'function') {
                gameManager.setGameOver();
            }
        }

        setTimeout(() => {
            if (typeof vaisseau.stopShake === 'function') {
                vaisseau.stopShake();
            }
            if (!gameManager.isGameOver || (typeof gameManager.isGameOver === 'function' && !gameManager.isGameOver())) {
                gameManager.gameState = "playing";
            }
        }, this.hitDuration);
    }
}
