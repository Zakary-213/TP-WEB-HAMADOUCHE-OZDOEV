class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);
        this.speed = 0.04; // Vitesse très lente
    }

    aiBehavior(ball) {
        // Utilise le comportement de poursuite de base de AITeam sans tirer
        super.aiBehavior(ball);
    }
}
