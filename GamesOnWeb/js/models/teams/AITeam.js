class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;

        this.ballChaser = null;

        this.pressRadius = 30;
    }

    update(ball) {
        this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        // override dans les sous-classes
    }
}