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

    // Empêche le ballon de sortir des limites du terrain
    // Le terrain fait 100x60 (voir field.js), centré en (0,0)
    let minX = -49;
    let maxX = 49;
    const minZ = -29;
    const maxZ = 29;

    // Si le ballon est face au but (au centre sur l'axe Z), on agrandit la limite X
    if (ball.position.z > -7.5 && ball.position.z < 7.5) {
        minX = -54; // Profondeur du but (environ 4)
        maxX = 54;
    }

    if (ball.position.x < minX) ball.position.x = minX;
    if (ball.position.x > maxX) ball.position.x = maxX;
    if (ball.position.z < minZ) ball.position.z = minZ;
    if (ball.position.z > maxZ) ball.position.z = maxZ;

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

    // Direction horizontale normalisée du tir
    const dir = new BABYLON.Vector3(lastDirection.x, 0, lastDirection.z);
    if (dir.lengthSquared() === 0) {
        return;
    }
    const dirNorm = dir.normalize();

    // On utilise une physique simple : vitesse initiale proportionnelle à la force
    // L'unité correspond à des unités de terrain / seconde (le dt est géré dans script.js)
    const speed = force; // 8, 15 ou 25 selon la jauge

    if (!ball.velocity) {
        ball.velocity = new BABYLON.Vector3(0, 0, 0);
    }

    // On annule toute ancienne animation Babylon éventuellement en cours
    scene.stopAnimation(ball);

    // --- Animation procédurale de Frappe (Recul puis Frappe) ---
    if (player.model) {
        // Enregistrer la rotation de base
        const baseRotX = player.model.rotation.x; // Généralement -PI/2
        
        // Créer l'animation de recul (wind-up) puis de frappe (snap)
        const kickAnim = new BABYLON.Animation(
            "kickAnim",
            "rotation.x",
            60, // fps
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];
        // Frame 0 : position de départ
        keys.push({ frame: 0, value: baseRotX });
        // Frame 15 : Le joueur se penche en arrière pour prendre de l'élan
        keys.push({ frame: 15, value: baseRotX - 0.5 });
        // Frame 25 : Le joueur frappe violemment vers l'avant
        keys.push({ frame: 25, value: baseRotX + 0.3 });
        // Frame 40 : Retour à la position initiale
        keys.push({ frame: 40, value: baseRotX });

        kickAnim.setKeys(keys);
        
        // Ajouter une fonction d'easing (élastique/rebond) pour rendre la frappe dynamique
        const easingFunction = new BABYLON.CubicEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        kickAnim.setEasingFunction(easingFunction);

        player.model.animations.push(kickAnim);

        // Lancer l'animation
        scene.beginDirectAnimation(player.model, [kickAnim], 0, 40, false, 1.5, () => {
            // Nettoyage une fois terminé
            player.model.animations = player.model.animations.filter(a => a.name !== "kickAnim");
        });

        // La balle part au moment de la frappe (vers la frame 20-25),
        // On met un petit délai de 200ms
        setTimeout(() => {
            ball.velocity = dirNorm.scale(speed);
        }, 200);

    } else {
        // Fallback si pas de modèle
        ball.velocity = dirNorm.scale(speed);
    }
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