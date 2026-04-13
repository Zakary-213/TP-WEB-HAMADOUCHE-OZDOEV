function initSteeringPlayer(player) {
    if (!player) return;

    if (!player.steeringVelocity) {
        player.steeringVelocity = new BABYLON.Vector3(0, 0, 0);
    }

    if (player.maxSteeringSpeed == null) {
        player.maxSteeringSpeed = 0.07;
    }

    if (player.maxSteeringForce == null) {
        player.maxSteeringForce = 0.015;
    }
}

function getPlayerSteeringVelocity(player) {
    initSteeringPlayer(player);
    return player.steeringVelocity;
}

function seekSteering(player, target, maxSpeed = null) {
    if (!player || !target) {
        return BABYLON.Vector3.Zero();
    }

    initSteeringPlayer(player);

    const desired = target.subtract(player.position);
    desired.y = 0;

    if (desired.lengthSquared() < 0.0001) {
        return BABYLON.Vector3.Zero();
    }

    desired.normalize();

    const desiredSpeed = maxSpeed ?? player.maxSteeringSpeed;
    desired.scaleInPlace(desiredSpeed);

    const currentVelocity = player.steeringVelocity.clone();
    currentVelocity.y = 0;

    const steering = desired.subtract(currentVelocity);

    const maxForce = player.maxSteeringForce;
    if (steering.length() > maxForce) {
        steering.normalize();
        steering.scaleInPlace(maxForce);
    }

    return steering;
}

function applySteering(player, steering) {
    if (!player || !steering) return BABYLON.Vector3.Zero();

    initSteeringPlayer(player);

    player.steeringVelocity.addInPlace(steering);
    player.steeringVelocity.y = 0;

    const maxSpeed = player.maxSteeringSpeed;
    if (player.steeringVelocity.length() > maxSpeed) {
        player.steeringVelocity.normalize();
        player.steeringVelocity.scaleInPlace(maxSpeed);
    }

    if (player.steeringVelocity.lengthSquared() < 0.00001) {
        player.steeringVelocity.set(0, 0, 0);
    }

    return player.steeringVelocity.clone();
}

function resetSteeringVelocity(player) {
    if (!player) return;
    initSteeringPlayer(player);
    player.steeringVelocity.set(0, 0, 0);
}

function arriveSteering(player, target, maxSpeed = null, slowRadius = 3, stopDistance = 0.2) {
    if (!player || !target) {
        return BABYLON.Vector3.Zero();
    }

    initSteeringPlayer(player);

    const desired = target.subtract(player.position);
    desired.y = 0;

    const dist = desired.length();

    if (dist < stopDistance) {
        return BABYLON.Vector3.Zero();
    }

    if (dist < 0.0001) {
        return BABYLON.Vector3.Zero();
    }

    desired.normalize();

    const baseSpeed = maxSpeed ?? player.maxSteeringSpeed;

    let desiredSpeed = baseSpeed;
    if (dist < slowRadius) {
        desiredSpeed = baseSpeed * (dist / slowRadius);
        desiredSpeed = Math.max(desiredSpeed, 0.02);
    }

    desired.scaleInPlace(desiredSpeed);

    const currentVelocity = player.steeringVelocity.clone();
    currentVelocity.y = 0;

    const steering = desired.subtract(currentVelocity);

    const maxForce = player.maxSteeringForce;
    if (steering.length() > maxForce) {
        steering.normalize();
        steering.scaleInPlace(maxForce);
    }

    return steering;
}

function separationSteering(player, neighbors, desiredSeparation = 4.0, maxSpeed = null) {
    if (!player || !neighbors || neighbors.length === 0) {
        return BABYLON.Vector3.Zero();
    }

    initSteeringPlayer(player);

    const sum = new BABYLON.Vector3(0, 0, 0);
    let count = 0;

    neighbors.forEach(other => {
        if (!other || other === player || !other.position) return;

        const diff = player.position.subtract(other.position);
        diff.y = 0;

        const dist = diff.length();

        if (dist <= 0.0001) return;
        if (dist >= desiredSeparation) return;

        diff.normalize();

        // plus c'est proche, plus ça repousse
        diff.scaleInPlace(1 / dist);

        sum.addInPlace(diff);
        count++;
    });

    if (count === 0) {
        return BABYLON.Vector3.Zero();
    }

    sum.scaleInPlace(1 / count);

    if (sum.lengthSquared() < 0.0001) {
        return BABYLON.Vector3.Zero();
    }

    sum.normalize();

    const desiredSpeed = maxSpeed ?? player.maxSteeringSpeed;
    sum.scaleInPlace(desiredSpeed);

    const currentVelocity = player.steeringVelocity.clone();
    currentVelocity.y = 0;

    const steering = sum.subtract(currentVelocity);

    const maxForce = player.maxSteeringForce;
    if (steering.length() > maxForce) {
        steering.normalize();
        steering.scaleInPlace(maxForce);
    }

    return steering;
}