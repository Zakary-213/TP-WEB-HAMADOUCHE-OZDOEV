class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);
    }

    aiBehavior(ball) {
        if (!ball || !ball.position) return;

        let bestPlayer = null;
        let bestScore = -Infinity;

        // direction vers le but de l'IA (elle défend à droite → attaque vers gauche)
        const goalDirection = new BABYLON.Vector3(-1, 0, 0);

        this.players.forEach(player => {

            const toBall = ball.position.subtract(player.position);
            const dist = toBall.length();

            if (dist > this.pressRadius) return;

            const dirToBall = toBall.normalize();

            // score positionnel : favorise les joueurs en face
            const frontScore = BABYLON.Vector3.Dot(dirToBall, goalDirection);

            // score final (distance + position)
            const score = -dist + frontScore * 5;

            if (score > bestScore) {
                bestScore = score;
                bestPlayer = player;
            }
        });

        this.ballChaser = bestPlayer;

        this.players.forEach(player => {

            if (player === this.ballChaser) {
                // pressing intelligent
                this.movePlayerTowards(player, ball.position);
            } else {
                // retour intelligent (pas juste ligne droite débile)
                const target = player.homePosition.clone();

                target.x += (ball.position.x - player.homePosition.x) * 0.3;
                target.z += (ball.position.z - player.homePosition.z) * 0.3;

                this.movePlayerTowards(player, target);
            }

        });
    }
}