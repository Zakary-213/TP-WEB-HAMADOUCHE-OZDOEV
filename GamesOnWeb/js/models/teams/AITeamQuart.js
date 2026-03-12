class AITeamQuart extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 5); 
        this.speed = 0.06; 
    }

    aiBehavior(ball) {
        super.aiBehavior(ball);
    }
}
