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

function createKickGauge(scene){

    const gauge = BABYLON.MeshBuilder.CreatePlane(
        "kickGauge",
        {width:3,height:0.6},
        scene
    );

    // orienter vers le sol
    gauge.rotation.x = Math.PI/2;

    const mat = new BABYLON.StandardMaterial("gaugeMat",scene);

    const texture = new BABYLON.DynamicTexture(
        "gaugeTexture",
        {width:256,height:64},
        scene
    );

    texture.hasAlpha = false;
    texture.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
    mat.disableLighting = true;
    mat.emissiveTexture = texture;
    mat.backFaceCulling = false;

    gauge.material = mat;

    gauge.isVisible = false;

    const cursor = BABYLON.MeshBuilder.CreateBox(
        "cursor",
        {width:0.08,height:0.6,depth:0.1},
        scene
    );

    cursor.parent = gauge;

    gauge.cursor = cursor;
    gauge.texture = texture;

    gauge.renderingGroupId = 2;
    gauge.cursor.renderingGroupId = 2;

    gauge.position.y = 0.05;

    return gauge;
}

function drawGaugeColors(gauge){

    const ctx = gauge.texture.getContext();

    const w = 256;
    const h = 64;

    ctx.clearRect(0,0,w,h);

    // fond noir (bordure)
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,w,h);

    const border = 8;

    // fond intérieur blanc
    ctx.fillStyle = "white";
    ctx.fillRect(border,border,w-border*2,h-border*2);

    const zoneWidth = (w-border*2)/3;

    // zones couleur
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(border,border,zoneWidth,h-border*2);

    ctx.fillStyle = "#fb923c";
    ctx.fillRect(border+zoneWidth,border,zoneWidth,h-border*2);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(border+zoneWidth*2,border,zoneWidth,h-border*2);

    // séparateurs noirs
    ctx.fillStyle = "black";
    ctx.fillRect(border+zoneWidth-2,border,4,h-border*2);
    ctx.fillRect(border+zoneWidth*2-2,border,4,h-border*2);

    gauge.texture.update();
}

function positionGauge(gauge, player, direction){

    const offset = 2;

    const dir = direction.normalize();

    const pos = player.position.subtract(dir.scale(offset));

    gauge.position.x = pos.x;
    gauge.position.z = pos.z;
    gauge.position.y = 0.1;

    const angle = Math.atan2(dir.x,dir.z);

    gauge.rotation.y = angle;
}

function updateKickGauge(gauge, player, direction, time){

    positionGauge(gauge,player,direction);

    const speed = 3;

    if(!gauge.started){
        gauge.startTime = time;
        gauge.started = true;
    }

    const value = (Math.sin((time - gauge.startTime)*speed - Math.PI/2)+1)/2;
    
    const gaugeWidth = 3;
    gauge.cursor.position.x = (value-0.5)*gaugeWidth;

    gauge.currentValue = value;

    gauge.isVisible = true;
    gauge.cursor.isVisible = true;
}

function computeKickPower(gauge){

    const value = gauge.currentValue;

    if(value < 0.33)
        return 8; // vert

    if(value < 0.66)
        return 15; // orange

    return 25; // rouge
}

function hideKickGauge(gauge){

    gauge.isVisible = false;
    gauge.cursor.isVisible = false;

    gauge.started = false;
}