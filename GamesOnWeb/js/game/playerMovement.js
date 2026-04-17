export function updatePlayerMovement(activePlayer, input, moveX, moveZ, dt, params) {
    const baseSpeed = params.baseSpeed;
    const sprintMultiplier = params.sprintMultiplier;
    const staminaDrainRate = params.staminaDrainRate;
    const staminaRegenRate = params.staminaRegenRate;
    const tackleController = params.tackleController;
    const restartState = params.restartState;
    const isRestartTaker = params.isRestartTaker;
    const sanitizeRestartDirection = params.sanitizeRestartDirection;
    const getDefaultRestartDirection = params.getDefaultRestartDirection;

    let lastDirection = params.lastDirection;
    let playerFacing = params.playerFacing;
    let previousPlayerPosition = params.previousPlayerPosition;

    const restartTakerLocked = isRestartTaker(activePlayer);

    let stamina = activePlayer.stamina;
    const maxStamina = activePlayer.maxStamina || 1;
    const isTryingToMove = (moveX !== 0 || moveZ !== 0);

    let effectiveSpeed = baseSpeed;

    if (!restartTakerLocked && isTryingToMove && input.sprint && stamina > 0.05) {
        effectiveSpeed = baseSpeed * sprintMultiplier;
        stamina -= staminaDrainRate * dt;
    } else {
        stamina += staminaRegenRate * dt;
    }

    if (stamina < 0) stamina = 0;
    if (stamina > maxStamina) stamina = maxStamina;
    activePlayer.stamina = stamina;

    let movement;

    if (restartTakerLocked) {
        movement = tackleController.updateAndMove(activePlayer, 0, 0, baseSpeed);

        // Priorite au vecteur analogique (manette) calcule dans script.js
        // puis fallback clavier si absent/neutre.
        let aimX = Number(input.restartAimX) || 0;
        let aimZ = Number(input.restartAimZ) || 0;

        if (Math.abs(aimX) < 0.001) aimX = 0;
        if (Math.abs(aimZ) < 0.001) aimZ = 0;

        if (aimX === 0 && aimZ === 0) {
            if (input.forward) aimX += 1;
            if (input.backward) aimX -= 1;
            if (input.left) aimZ += 1;
            if (input.right) aimZ -= 1;
        }

        if (aimX !== 0 || aimZ !== 0) {
            const aim = new BABYLON.Vector3(aimX, 0, aimZ);
            aim.normalize();

            lastDirection = sanitizeRestartDirection(aim, restartState);
            playerFacing = lastDirection.clone();
        } else {
            lastDirection = getDefaultRestartDirection(restartState);
            playerFacing = lastDirection.clone();
        }
    } else {
        movement = tackleController.updateAndMove(activePlayer, moveX, moveZ, effectiveSpeed);
    }

    const controlledPlayer = movement.controlledPlayer;
    const directionOpt = movement.directionOpt;

    const currentPlayerPosition = controlledPlayer.position.clone();
    const playerMoveVelocity = currentPlayerPosition.subtract(previousPlayerPosition);
    previousPlayerPosition = currentPlayerPosition;

    if (!restartTakerLocked && directionOpt) {
        lastDirection = directionOpt;
        playerFacing = lastDirection.clone();
    }

    return {
        movement,
        lastDirection,
        playerFacing,
        playerMoveVelocity,
        previousPlayerPosition,
        restartTakerLocked
    };
}
