class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;

        this.ballChaser = null;

        this.switchTolerance = 1.0;
        this.pressRadius = 30;
    }

    update(ball) {
        this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        // override
    }
}