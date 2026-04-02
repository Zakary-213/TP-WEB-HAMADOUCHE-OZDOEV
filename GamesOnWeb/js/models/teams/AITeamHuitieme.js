class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);
    }

    aiBehavior(ball) {
        if (!ball || !ball.position) return;

        const teamHasBall = this.teamHasBall(ball);

        if (teamHasBall) {
            this.attackBehavior(ball);
        } else {
            this.defenseBehavior(ball);
        }
    }

    // -----------------------
    // DEFENSE
    // -----------------------
    defenseBehavior(ball) {

        let bestPlayer = null;
        let bestScore = -Infinity;

        const goalDirection = new BABYLON.Vector3(-1, 0, 0);

        this.players.forEach(player => {

            const toBall = ball.position.subtract(player.position);
            const dist = toBall.length();

            if (dist > this.pressRadius) return;

            const dirToBall = toBall.normalize();
            const frontScore = BABYLON.Vector3.Dot(dirToBall, goalDirection);

            const score = -dist + frontScore * 5;

            if (score > bestScore) {
                bestScore = score;
                bestPlayer = player;
            }
        });

        this.ballChaser = bestPlayer;

        this.players.forEach(player => {

            if (player === this.ballChaser) {
                this.movePlayerTowards(player, ball.position);
            } else {
                const target = player.homePosition.clone();

                target.x += (ball.position.x - player.homePosition.x) * 0.3;
                target.z += (ball.position.z - player.homePosition.z) * 0.3;

                this.movePlayerTowards(player, target);
            }

        });
    }

    // -----------------------
    // ATTACK
    // -----------------------
    attackBehavior(ball) {

        let ballCarrier = null;
        let bestDist = Infinity;

        this.players.forEach(player => {
            const dist = BABYLON.Vector3.Distance(player.position, ball.position);

            if (dist < bestDist) {
                bestDist = dist;
                ballCarrier = player;
            }
        });

        if (!ballCarrier) return;

        // direction vers le but (gauche)
        let dir = new BABYLON.Vector3(-50, 0, 0).subtract(ballCarrier.position);

        // -----------------------
        // ÉVITER LES BORDS
        // -----------------------
        const margin = 5;

        if (ballCarrier.position.z > 25 - margin) {
            dir.z -= 2;
        }
        if (ballCarrier.position.z < -25 + margin) {
            dir.z += 2;
        }

        if (ballCarrier.position.x < -45 + margin) {
            dir.x += 1.5;
        }

        // -----------------------
        // ÉVITER LES JOUEURS
        // -----------------------
        this.opponents.forEach(opponent => {

            const toOpponent = opponent.position.subtract(ballCarrier.position);
            const dist = toOpponent.length();

            if (dist < 8) {
                const avoid = ballCarrier.position.subtract(opponent.position);
                avoid.normalize();

                dir.addInPlace(avoid.scale(3));
            }
        });

        dir.normalize();

        // avancer avec la balle
        // direction normalisée
        const moveDir = dir.normalize();

        // stocke la direction pour la balle
        ballCarrier.facingDirection = moveDir;

        // mouvement
        ballCarrier.move(moveDir.x, moveDir.z, 0.1);

        // -----------------------
        // SUPPORT DES AUTRES JOUEURS
        // -----------------------
        this.players.forEach(player => {

            if (player === ballCarrier) return;

            const support = player.homePosition.clone();

            support.x += (ballCarrier.position.x - player.homePosition.x) * 0.5;
            support.z += (ballCarrier.position.z - player.homePosition.z) * 0.5;

            this.movePlayerTowards(player, support);
        });
    }
}