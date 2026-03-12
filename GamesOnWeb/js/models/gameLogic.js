function checkBallCollision(player, ball, playerFacing) {
    const distance = BABYLON.Vector3.Distance(
        player.position,
        ball.position
    );

    if (distance < 2) {
        const pushForce = 1.2;
        ball.position.x += playerFacing.x * pushForce;
        ball.position.z += playerFacing.z * pushForce;
    }

    ball.position.y = 0.75;
}

function kick(scene, ball, player, lastDirection, force) {
    const distance = BABYLON.Vector3.Distance(
        player.position,
        ball.position
    );

    if (distance > 3) {
        return;
    }

    const startPos = ball.position.clone();

    let targetX = startPos.x + lastDirection.x * force;
    let targetZ = startPos.z + lastDirection.z * force;

    // Boundaries check
    if (targetX > 48) targetX = 48;
    if (targetX < -48) targetX = -48;
    if (targetZ > 28) targetZ = 28;
    if (targetZ < -28) targetZ = -28;

    const frameRate = 60;

    const animation = new BABYLON.Animation(
        "kickAnimation",
        "position",
        frameRate,BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [];

    keys.push({
        frame: 0,
        value: startPos
    });

    keys.push({
        frame: frameRate,
        value: new BABYLON.Vector3(targetX, 0.75, targetZ)
    });

    animation.setKeys(keys);

    ball.animations = [];
    ball.animations.push(animation);

    scene.beginAnimation(ball, 0, frameRate, false);
}
