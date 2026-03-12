class AITeamDemi extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 4); // meshIndex 4 pour les Demis
        this.speed = 0.08; // Rapide
    }

    aiBehavior(ball) {
        super.aiBehavior(ball);
    }
}
