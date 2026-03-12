class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);
        this.speed = 0.05; // Vitesse par défaut de l'IA
    }

    update(ball) {
        super.update(ball);
        this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        // Logique désactivée pour l'instant (les joueurs IA restent immobiles)
    }
}
