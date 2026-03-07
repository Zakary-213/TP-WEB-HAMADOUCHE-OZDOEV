const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {

    const scene = new BABYLON.Scene(engine);

    scene.collisionsEnabled = true;

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        Math.PI,
        0.01,
        60,
        new BABYLON.Vector3(0,0,0),
        scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.7;

    // Terrain
    createField(scene);

    // Goals
    createGoal(scene, new BABYLON.Vector3(-50, 0, 0), Math.PI / 2);
    createGoal(scene, new BABYLON.Vector3(50, 0, 0), -Math.PI / 2);

    // Ball
    const ball = createBall(scene);
    ball.checkCollisions = true;
    ball.ellipsoid = new BABYLON.Vector3(0.7,0.7,0.7);

    // Players
    const players = [];
    const teamAColor = new BABYLON.Color3(1,0,0);

    players.push(
        createPlayer(scene,new BABYLON.Vector3(-40,0,0),teamAColor)
    );

    const player = players[0];

    let currentAnim = "idle";

    function playAnimation(name){

        if(!player.animations) return;

        if(currentAnim === name) return;

        for(let anim in player.animations){
            player.animations[anim].stop();
        }

        if(player.animations[name]){
            player.animations[name].start(true);
            currentAnim = name;
        }
    }

    player.ellipsoid = new BABYLON.Vector3(1,1,1);
    player.checkCollisions = true;

    camera.lockedTarget = player;
    camera.inputs.clear();

    // INPUT
    const input = {
        forward:false,
        backward:false,
        left:false,
        right:false
    };

    window.addEventListener("keydown",(e)=>{

        if(e.key==="z"||e.key==="Z") input.forward=true;
        if(e.key==="s"||e.key==="S") input.backward=true;
        if(e.key==="q"||e.key==="Q") input.left=true;
        if(e.key==="d"||e.key==="D") input.right=true;

    });

    window.addEventListener("keyup",(e)=>{

        if(e.key==="z"||e.key==="Z") input.forward=false;
        if(e.key==="s"||e.key==="S") input.backward=false;
        if(e.key==="q"||e.key==="Q") input.left=false;
        if(e.key==="d"||e.key==="D") input.right=false;

    });

    const speed = 0.1;

    let lastDirection = new BABYLON.Vector3(1,0,0);
    let playerFacing = new BABYLON.Vector3(1,0,0);

    let lastKickTime = 0;
    const kickCooldown = 300;

    scene.onBeforeRenderObservable.add(()=>{

        let moveX = 0;
        let moveZ = 0;

        if(input.forward) moveX+=1;
        if(input.backward) moveX-=1;
        if(input.left) moveZ+=1;
        if(input.right) moveZ-=1;

        if(moveX!==0||moveZ!==0){

            playAnimation("run");
            const length = Math.sqrt(moveX*moveX+moveZ*moveZ);
            moveX/=length;
            moveZ/=length;

            player.position.x += moveX*speed;
            player.position.z += moveZ*speed;

            lastDirection = new BABYLON.Vector3(moveX,0,moveZ);
            playerFacing = lastDirection.clone();

            if(player.model){

                const angle = Math.atan2(moveZ, moveX);
                const targetRotation = -angle;

                player.model.rotation.z = BABYLON.Scalar.Lerp(
                    player.model.rotation.z,
                    targetRotation,
                    0.15
                );

            }

        }
        else{
            playAnimation("idle");
        }

        // COLLISION JOUEUR → BALLE

        const distance = BABYLON.Vector3.Distance(
            player.position,
            ball.position
        );

        if(distance<2){

            const pushForce = 1.2;

            ball.position.x += playerFacing.x*pushForce;
            ball.position.z += playerFacing.z*pushForce;

        }

        ball.position.y = 0.75;

    });

    // KICK
    const kickButton = document.getElementById("kickButton");

    kickButton.addEventListener("click",function(){

        const force = 20;

        const startPos = ball.position.clone();

        let targetX = startPos.x + lastDirection.x*force;
        let targetZ = startPos.z + lastDirection.z*force;

        if(targetX>48) targetX=48;
        if(targetX<-48) targetX=-48;
        if(targetZ>28) targetZ=28;
        if(targetZ<-28) targetZ=-28;

        const frameRate = 60;

        const animation = new BABYLON.Animation(
            "kickAnimation",
            "position",
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [];

        keys.push({
            frame:0,
            value:startPos
        });

        keys.push({
            frame:frameRate,
            value:new BABYLON.Vector3(targetX,0.75,targetZ)
        });

        animation.setKeys(keys);

        ball.animations=[];
        ball.animations.push(animation);

        scene.beginAnimation(ball,0,frameRate,false);

        lastKickTime = Date.now();

    });

    // RESET
    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click",function(){

        scene.stopAnimation(ball);

        ball.position = new BABYLON.Vector3(0,0.75,0);
        ball.rotation = new BABYLON.Vector3(0,0,0);

    });

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function(){
    scene.render();
});

window.addEventListener("resize",function(){
    engine.resize();
});