class AITeamFinale extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 3); 
        this.speed = 0.1; // Très rapide (aussi rapide que le joueur !)
    }

    aiBehavior(ball) {
        super.aiBehavior(ball);
    }
}
