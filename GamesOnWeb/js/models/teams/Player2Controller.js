class Player2Controller {
    constructor(config) {
        this.scene = config.scene;
        this.team = config.team;
        this.opponentTeam = config.opponentTeam;
        this.ball = config.ball;
        this.tackleController = config.tackleController;

        this.isBlocked = typeof config.isBlocked === "function" ? config.isBlocked : (() => false);
        this.computeMoveAxes = typeof config.computeMoveAxes === "function" ? config.computeMoveAxes : null;
        this.isMovementLocked = typeof config.isMovementLocked === "function" ? config.isMovementLocked : (() => false);
        this.onShoot = typeof config.onShoot === "function" ? config.onShoot : null;

        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false
        };

        this.isCharging = false;
        this.chargeStart = 0;
        this.maxChargeTime = 1000;

        this.lastDirection = new BABYLON.Vector3(-1, 0, 0);
        this.playerFacing = new BABYLON.Vector3(-1, 0, 0);
        this.previousPlayerPosition = null;

        this._onKeyDown = (e) => this.handleKeyDown(e);
        this._onKeyUp = (e) => this.handleKeyUp(e);

        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
    }

    getBindings() {
        if (window.inputBindings && typeof window.inputBindings.getPlayer2Bindings === "function") {
            return window.inputBindings.getPlayer2Bindings();
        }
        if (window.inputBindings && typeof window.inputBindings.getBindings === "function") {
            return window.inputBindings.getBindings();
        }
        return {
            forward: "z",
            backward: "s",
            left: "q",
            right: "d",
            sprint: "Shift",
            shoot: "Space",
            tackle: "t",
            switchLeft: "a",
            switchRight: "e"
        };
    }

    matchesAction(event, bindValue) {
        if (!event || !bindValue) return false;
        // Comparaison par code (touches spéciales : flèches, Enter, Numpad, RShift…)
        if (event.code && String(event.code).toLowerCase() === String(bindValue).toLowerCase()) {
            return true;
        }
        // Compatibilité avec les anciennes liaisons basées sur event.key
        if (bindValue === "Space") return event.code === "Space";
        if (bindValue === "Shift") return event.key === "Shift";
        return String(event.key || "").toLowerCase() === String(bindValue).toLowerCase();
    }

    computeKickForce() {
        const elapsed = Date.now() - this.chargeStart;
        const ratio = Math.min(1, Math.max(0, elapsed / this.maxChargeTime));
        if (ratio < 0.33) return 8;
        if (ratio < 0.66) return 15;
        return 25;
    }

    handleKeyDown(event) {
        // Empêche le scroll de la page avec les flèches / Entrée
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter","NumpadDecimal","Numpad4","Numpad6"].includes(event.code)) {
            event.preventDefault();
        }

        if (this.isBlocked()) return;
        if (event.repeat) return;

        const binds = this.getBindings();
        const activePlayer = this.team ? this.team.activePlayer : null;

        if (this.matchesAction(event, binds.forward)) this.input.forward = true;
        if (this.matchesAction(event, binds.backward)) this.input.backward = true;
        if (this.matchesAction(event, binds.left)) this.input.left = true;
        if (this.matchesAction(event, binds.right)) this.input.right = true;
        if (this.matchesAction(event, binds.sprint)) this.input.sprint = true;

        if (this.matchesAction(event, binds.shoot) && !this.isCharging) {
            this.chargeStart = Date.now();
            this.isCharging = true;
        }

        if (this.matchesAction(event, binds.switchLeft) && this.team && typeof this.team.getPlayerOnSide === "function") {
            const p = this.team.getPlayerOnSide("left");
            if (p) this.team.activePlayer = p;
        }

        if (this.matchesAction(event, binds.switchRight) && this.team && typeof this.team.getPlayerOnSide === "function") {
            const p = this.team.getPlayerOnSide("right");
            if (p) this.team.activePlayer = p;
        }

        if (
            this.matchesAction(event, binds.tackle) &&
            this.tackleController &&
            typeof this.tackleController.handleKeyDown === "function" &&
            activePlayer
        ) {
            this.tackleController.handleKeyDown(event, {
                activePlayer,
                playerFacing: this.playerFacing,
                ball: this.ball,
                opponentTeam: this.opponentTeam,
                team: this.team,
                tackleKey: binds.tackle
            });
        }
    }

    handleKeyUp(event) {
        if (this.isBlocked()) return;

        const binds = this.getBindings();

        if (this.matchesAction(event, binds.forward)) this.input.forward = false;
        if (this.matchesAction(event, binds.backward)) this.input.backward = false;
        if (this.matchesAction(event, binds.left)) this.input.left = false;
        if (this.matchesAction(event, binds.right)) this.input.right = false;
        if (this.matchesAction(event, binds.sprint)) this.input.sprint = false;

        if (this.matchesAction(event, binds.shoot) && this.isCharging) {
            const force = this.computeKickForce();
            const player = this.team ? this.team.activePlayer : null;

            if (player && this.onShoot) {
                this.onShoot({
                    player,
                    direction: this.lastDirection.clone(),
                    force
                });
            }

            this.isCharging = false;
        }
    }

    update(config) {
        if (!this.team || !this.team.activePlayer) return null;

        const dt = config.dt || 0;
        const baseSpeed = config.baseSpeed || 0.07;
        const sprintMultiplier = config.sprintMultiplier || 1.8;
        const staminaDrainRate = config.staminaDrainRate || 0.35;
        const staminaRegenRate = config.staminaRegenRate || 0.25;

        const activePlayer = this.team.activePlayer;
        const moveCalculator = typeof config.computeMoveAxes === "function"
            ? config.computeMoveAxes
            : this.computeMoveAxes;

        let moveX = 0;
        let moveZ = 0;

        if (moveCalculator) {
            const move = moveCalculator(this.input) || { moveX: 0, moveZ: 0 };
            moveX = move.moveX || 0;
            moveZ = move.moveZ || 0;
        } else {
            if (this.input.forward) moveX += 1;
            if (this.input.backward) moveX -= 1;
            if (this.input.left) moveZ += 1;
            if (this.input.right) moveZ -= 1;
        }

        const isTryingToMove = moveX !== 0 || moveZ !== 0;
        const movementLocked = this.isMovementLocked(activePlayer);

        let stamina = activePlayer.stamina;
        const maxStamina = activePlayer.maxStamina || 1;
        let effectiveSpeed = baseSpeed;

        const isSprinting = !movementLocked && isTryingToMove && this.input.sprint && stamina > 0.05;

        if (isSprinting) {
            effectiveSpeed = baseSpeed * sprintMultiplier;
            stamina -= staminaDrainRate * dt;
        } else {
            stamina += staminaRegenRate * dt;
        }

        if (stamina < 0) stamina = 0;
        if (stamina > maxStamina) stamina = maxStamina;
        activePlayer.stamina = stamina;

        const movement = this.tackleController.updateAndMove(
            activePlayer,
            movementLocked ? 0 : moveX,
            movementLocked ? 0 : moveZ,
            effectiveSpeed
        );

        const controlledPlayer = movement.controlledPlayer;
        const directionOpt = movement.directionOpt;

        if (!this.previousPlayerPosition) {
            this.previousPlayerPosition = controlledPlayer.position.clone();
        }

        const currentPos = controlledPlayer.position.clone();
        const playerMoveVelocity = currentPos.subtract(this.previousPlayerPosition);
        this.previousPlayerPosition = currentPos;

        if (!movementLocked && directionOpt) {
            this.lastDirection = directionOpt.clone();
            this.playerFacing = directionOpt.clone();
        }

        return {
            controlledPlayer,
            playerFacing: this.playerFacing,
            lastDirection: this.lastDirection,
            playerMoveVelocity,
            isSprinting
        };
    }

    dispose() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
    }
}

window.Player2Controller = Player2Controller;
