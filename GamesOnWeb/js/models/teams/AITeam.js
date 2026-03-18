class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);
        this.speed = 0.05;
        // Flag : false tant que l'IA de ce stade n'est pas implémentée
        // Mettre à true dans la sous-classe quand le comportement est codé
        this.aiImplemented = false;
    }

    update(ball) {
        super.update(ball);
        this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        // Logique désactivée pour l'instant (les joueurs IA restent immobiles)
    }
}
