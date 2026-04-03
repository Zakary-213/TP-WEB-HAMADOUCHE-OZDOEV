class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;
        this.ballChaser = null;

        this.pressRadius = 30;
    }

    update(ball) {
        if (!ball || !ball.position) return;

        // 1. POSITIONNEMENT DE BASE (IMPORTANT)
        this.updateBasePositioning(ball);

        // 2. STRATÉGIE (appelée dans les sous-classes)
        this.aiBehavior(ball);
    }

    aiBehavior(ball) {
        // override dans AITeamHuitieme
    }

    updateBasePositioning(ball) {

        this.players.forEach(player => {

            if (!player) return;

            let target = player.homePosition.clone();

            // GK : reste dans sa cage
            if (player.role === "GK") {
                target.x = player.homePosition.x;
                target.z += (ball.position.z - player.homePosition.z) * 0.2;
            }

            // DEF : suit un peu la balle
            if (player.role === "DEF") {
                target.x += (ball.position.x - player.homePosition.x) * 0.3;
                target.z += (ball.position.z - player.homePosition.z) * 0.3;
            }

            // ATT : suit plus offensif
            if (player.role === "ATT") {
                target.x += (ball.position.x - player.homePosition.x) * 0.5;
                target.z += (ball.position.z - player.homePosition.z) * 0.4;
            }

            // clamp terrain
            target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
            target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

            // IMPORTANT : on bouge que si c’est PAS le chaser
            if (player !== this.ballChaser) {
                this.movePlayerTowards(player, target);
            }
        });
    }
}