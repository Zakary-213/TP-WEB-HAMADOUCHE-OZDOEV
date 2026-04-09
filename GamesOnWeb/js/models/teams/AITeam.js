class AITeam extends Team {
    constructor(scene, name, color, meshIndex = 2) {
        super(scene, name, color, false, meshIndex);

        this.aiImplemented = true;
        this.ballChaser = null;
        this.pressRadius = 30;

        this.aiControlledPlayer = null;
        this.goalkeeperLocked = false;
        this.goalkeeperClaiming = false;

        this.goalkeeperKickCooldownUntil = 0;
        this.goalkeeperIsClearing = false;
        this.goalkeeperReleaseUntil = 0;

        this.goalkeeperPossessionStartTime = 0;
        this.goalkeeperMinHoldDuration = 1200;
        this.goalkeeperMaxHoldDuration = 2800;

        this.goalkeeperCurrentRoamTarget = null;
        this.goalkeeperNextRoamDecisionTime = 0;

        this.aiShotCharging = false;
        this.aiShotChargeStart = 0;
        this.aiShotCarrier = null;
        this.aiShotDirection = null;
        this.aiShotCurrentValue = 0;
    }

    update(ball) {
        if (!ball || !ball.position) return;

        if (updateTeamForRestart(this, ball)) return;

        this.aiControlledPlayer = null;
        this.goalkeeperLocked = false;
        this.goalkeeperClaiming = false;

        if (this.aiShotCharging) {
            this.handleAIShot(ball);
            this.updateBasePositioning(ball);
            return;
        }

        this.aiBehavior(ball);
        this.updateBasePositioning(ball);
    }

    aiBehavior(ball) {
        // override
    }

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
            if (dist < 2.0) {
                return true;
            }
        }

        return false;
    }

    updateBasePositioning(ball) {
        this.players.forEach(player => {
            if (!player) return;

            if (player === this.ballChaser) return;
            if (player === this.aiControlledPlayer) return;
            if (player.role === "GK" && this.goalkeeperLocked) return;

            let target = player.homePosition.clone();

            if (player.role === "GK") {
                target.x = player.homePosition.x;
                target.z += (ball.position.z - player.homePosition.z) * 0.2;
            }

            if (player.role === "DEF") {
                target.x += (ball.position.x - player.homePosition.x) * 0.3;
                target.z += (ball.position.z - player.homePosition.z) * 0.3;
            }

            if (player.role === "ATT") {
                target.x += (ball.position.x - player.homePosition.x) * 0.5;
                target.z += (ball.position.z - player.homePosition.z) * 0.4;
            }

            target.x = Math.max(player.minX, Math.min(player.maxX, target.x));
            target.z = Math.max(player.minZ, Math.min(player.maxZ, target.z));

            this.movePlayerTowards(player, target);
        });
    }

    
    
}