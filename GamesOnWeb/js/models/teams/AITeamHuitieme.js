class AITeamHuitieme extends AITeam {
    constructor(scene, name, color) {
        super(scene, name, color, 2);
    }

    aiBehavior(ball) {
        if (!ball || !ball.position) return;

        const teamHasBall = this.hasRealPossession(ball);

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

        let enemyCarrier = null;
        let targetPos = ball.position.clone();

        // L'IA de droite défend le but situé vers +X
        const defendGoalDir = new BABYLON.Vector3(1, 0, 0);

        // Détecter un vrai porteur adverse
        if (
            ball.lastTouchTeam &&
            ball.lastTouchTeam !== this &&
            ball.lastKicker &&
            ball.lastKicker.position
        ) {
            const carrierDistToBall = BABYLON.Vector3.Distance(
                ball.lastKicker.position,
                ball.position
            );

            if (carrierDistToBall < 2.2) {
                enemyCarrier = ball.lastKicker;
            }
        }

        // Si l'adversaire contrôle vraiment la balle,
        // on vise un point d'interception légèrement devant lui vers notre but
        if (enemyCarrier) {
            targetPos = enemyCarrier.position.add(defendGoalDir.scale(1.8));
            targetPos.y = 0;

            // on garde le même couloir latéral que le porteur
            targetPos.z = enemyCarrier.position.z;
        }

        this.players.forEach(player => {
            if (!player || player.role === "GK") return;

            const toTarget = targetPos.subtract(player.position);
            const dist = toTarget.length();

            if (dist > this.pressRadius) return;

            let score = 0;

            // proximité générale
            score -= dist * 1.0;

            // alignement latéral avec le porteur / balle
            score -= Math.abs(player.position.z - targetPos.z) * 0.9;

            if (enemyCarrier) {
                const fromCarrierToDef = player.position.subtract(enemyCarrier.position);
                fromCarrierToDef.y = 0;

                if (fromCarrierToDef.lengthSquared() > 0.0001) {
                    fromCarrierToDef.normalize();

                    // > 0 => défenseur entre porteur et but IA
                    // < 0 => défenseur derrière le porteur
                    const goalSideDot = BABYLON.Vector3.Dot(defendGoalDir, fromCarrierToDef);

                    if (goalSideDot < -0.1) {
                        // clairement derrière : quasi disqualifié
                        score -= 1000;
                    } else if (goalSideDot < 0.15) {
                        // côté / pas idéal
                        score -= 6;
                    } else {
                        // devant / entre porteur et but
                        score += 12 + goalSideDot * 10;
                    }
                }

                // CORRECTION IMPORTANTE :
                // le joueur en face de toi a plutôt un X plus grand que le porteur
                if (player.position.x > enemyCarrier.position.x) {
                    score += 6;
                } else {
                    score -= 8;
                }
            } else {
                // balle libre
                score -= Math.abs(player.position.x - ball.position.x) * 0.35;
            }

            if (score > bestScore) {
                bestScore = score;
                bestPlayer = player;
            }
        });

        this.ballChaser = bestPlayer;

        if (this.ballChaser) {
            this.movePlayerTowards(this.ballChaser, targetPos);
        }
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

        let dir = new BABYLON.Vector3(-50, 0, 0).subtract(ballCarrier.position);

        const margin = 5;

        if (ballCarrier.position.z > 25 - margin) dir.z -= 2;
        if (ballCarrier.position.z < -25 + margin) dir.z += 2;
        if (ballCarrier.position.x < -45 + margin) dir.x += 1.5;

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

        const moveDir = dir.normalize();

        ballCarrier.facingDirection = moveDir;

        ballCarrier.move(moveDir.x, moveDir.z, 0.1);

        // SUPPORT DES AUTRES JOUEURS
        this.players.forEach(player => {

            if (player === ballCarrier) return;

            const support = player.homePosition.clone();

            support.x += (ballCarrier.position.x - player.homePosition.x) * 0.5;
            support.z += (ballCarrier.position.z - player.homePosition.z) * 0.5;

            this.movePlayerTowards(player, support);
        });
    }
}