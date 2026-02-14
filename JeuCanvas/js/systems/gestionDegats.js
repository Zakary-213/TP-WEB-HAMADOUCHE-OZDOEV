/**
 * @module GestionDegats
 * @description Classe centralisant la logique de réception des coups et de protection.
 * Gère la priorité du bouclier, la perte de points de vie et les états de transition du GameManager.
 */

/**
 * @class GestionDegats
 * @description Gère l'impact des collisions sur le vaisseau du joueur.
 */
export default class GestionDegats {
    /**
     * @param {number} [hitDuration=600] - Durée de l'état "hit" (invulnérabilité/tremblement) en ms.
     */
    constructor(hitDuration = 600) {
        this.hitDuration = hitDuration;
    }

    /**
     * Applique les conséquences d'un choc au vaisseau.
     * @param {Vaisseau} vaisseau - Le vaisseau qui subit le choc.
     * @param {GameManager} gameManager - Le gestionnaire de jeu pour modifier l'état global.
     */
    appliquerCoup(vaisseau, gameManager) {
        // Sécurité : Ne pas traiter les dégâts si le jeu est en pause ou déjà en état "hit"
        if (!gameManager || gameManager.gameState !== "playing") return;

        /**
         * Priorité au bouclier :
         * Si le vaisseau possède des charges de bouclier, on en consomme une 
         * et on annule la suite du traitement (pas de perte de PV).
         */
        const shieldHP = vaisseau.shieldHP ?? 0;
        if (shieldHP > 0) {
            vaisseau.shieldHP = shieldHP - 1;
            // Le choc est absorbé par l'énergie du bouclier
            return;
        }

        // --- Logique de dégâts réels ---

        // 1. Changement d'état pour éviter les dégâts multiples instantanés
        gameManager.gameState = "hit";

        // 2. Feedback visuel (Tremblement)
        vaisseau.startShake?.();

        // 3. Diminution de la santé et feedback sonore
        if (typeof vaisseau.perdreVie === 'function') {
            vaisseau.perdreVie(1);
            
            // Lecture du son de dégâts si disponible
            if (gameManager.assets?.life?.play) {
                gameManager.assets.life.play();
            }
        }

        // 4. Vérification de la condition de défaite (Game Over)
        if (vaisseau.estMort?.()) {
            // setGameOver est généralement utilisé en mode Solo
            gameManager.setGameOver?.();
        }

        /**
         * 5. Fin de l'état de choc.
         * Après le délai défini, on arrête le tremblement et on rend le contrôle au joueur.
         */
        setTimeout(() => {
            vaisseau.stopShake?.();

            // On ne repasse en mode "playing" que si la partie n'est pas finie
            const isGameOver = typeof gameManager.isGameOver === 'function' 
                ? gameManager.isGameOver() 
                : gameManager.isGameOver;

            if (!isGameOver) {
                gameManager.gameState = "playing";
            }
        }, this.hitDuration);
    }
}