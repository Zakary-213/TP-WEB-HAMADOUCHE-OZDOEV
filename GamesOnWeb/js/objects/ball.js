// Ball
const createBall = (scene) => {
    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1.5 }, scene);
    ball.position.y = 0.75; // Half of 1.5 to sit on ground
    const ballMaterial = new BABYLON.StandardMaterial("ballMat", scene);
    ballMaterial.diffuseTexture = new BABYLON.Texture("", scene);
    ballMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5); 
    
    return ball;
};
