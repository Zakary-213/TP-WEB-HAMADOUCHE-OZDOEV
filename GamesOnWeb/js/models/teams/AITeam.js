class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;
        this.ballChaser = null;

        this.pressRadius = 30;
    }

    update(ball) {
        if (!ball || !ball.position) return;

        // D'abord on choisit la stratégie / le chaser
        this.aiBehavior(ball);

        // Ensuite les autres reviennent se replacer
        this.updateBasePositioning(ball);
    }

    aiBehavior(ball) {
        // override dans AITeamHuitieme / Quart / Demi / Finale
    }

    /**
     * Possession réelle :
     * - lock temporaire après passe/tir
     * - OU la balle a bien été touchée par cette équipe
     * - ET un joueur est vraiment assez proche pour la contrôler
     */
    hasRealPossession(ball) {
        if (!ball || !ball.position) return false;

        if (performance.now() < this.teamPossessionLockUntil) {
            return true;
        }

        if (ball.lastTouchTeam !== this) {
            return false;
        }

        for (const player of this.players) {
            if (!player || !player.position) continue;

            const dist = BABYLON.Vector3.Distance(player.position, ball.position);

            // zone de vrai contrôle, plus stricte que teamHasBall()
            if (dist < 2.0) {
                return true;
            }
        }

        return false;
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

            // On ne bouge pas le chaser ici
            if (player !== this.ballChaser) {
                this.movePlayerTowards(player, target);
            }
        });
    }
}