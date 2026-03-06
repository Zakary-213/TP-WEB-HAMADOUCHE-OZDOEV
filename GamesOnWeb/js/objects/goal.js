// Goals (Cages)
const createGoal = (scene, position, rotationY) => {
    // Goal Dimensions
    const goalWidth = 7.32;
    const goalHeight = 2.44;
    const goalDepth = 2;
    const postThickness = 0.2;

    // Goal Materials
    const goalPostMaterial = new BABYLON.StandardMaterial("goalPostMat", scene);
    goalPostMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White posts

    const netMaterial = new BABYLON.StandardMaterial("netMat", scene);
    netMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // Bright white
    netMaterial.alpha = 0.7; // More visible
    netMaterial.wireframe = true; 
    netMaterial.backFaceCulling = false; // Seen from both sides

    const goalGroup = new BABYLON.TransformNode("goalGroup", scene);
    goalGroup.position = position;
    goalGroup.rotation.y = rotationY;

    // Posts (Left and Right)
    const leftPost = BABYLON.MeshBuilder.CreateCylinder("leftPost", { height: goalHeight, diameter: postThickness }, scene);
    leftPost.position = new BABYLON.Vector3(-goalWidth / 2, goalHeight / 2, 0);
    leftPost.material = goalPostMaterial;
    leftPost.parent = goalGroup;

    const rightPost = BABYLON.MeshBuilder.CreateCylinder("rightPost", { height: goalHeight, diameter: postThickness }, scene);
    rightPost.position = new BABYLON.Vector3(goalWidth / 2, goalHeight / 2, 0);
    rightPost.material = goalPostMaterial;
    rightPost.parent = goalGroup;

    // Crossbar
    const crossbar = BABYLON.MeshBuilder.CreateCylinder("crossbar", { height: goalWidth + postThickness, diameter: postThickness }, scene);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position = new BABYLON.Vector3(0, goalHeight, 0);
    crossbar.material = goalPostMaterial;
    crossbar.parent = goalGroup;

    // Back Supports
    const leftBackLow = BABYLON.MeshBuilder.CreateCylinder("leftBackLow", { height: goalDepth, diameter: postThickness / 2 }, scene);
    leftBackLow.rotation.x = Math.PI / 2;
    leftBackLow.position = new BABYLON.Vector3(-goalWidth / 2, 0, -goalDepth / 2);
    leftBackLow.parent = goalGroup;

    const rightBackLow = BABYLON.MeshBuilder.CreateCylinder("rightBackLow", { height: goalDepth, diameter: postThickness / 2 }, scene);
    rightBackLow.rotation.x = Math.PI / 2;
    rightBackLow.position = new BABYLON.Vector3(goalWidth / 2, 0, -goalDepth / 2);
    rightBackLow.parent = goalGroup;

        const leftBackUp = BABYLON.MeshBuilder.CreateCylinder("leftBackUp", { height: Math.sqrt(goalDepth*goalDepth + goalHeight*goalHeight), diameter: postThickness / 2 }, scene);
        leftBackUp.rotation.x = Math.atan(goalDepth/goalHeight);
        leftBackUp.position = new BABYLON.Vector3(-goalWidth / 2, goalHeight/2, -goalDepth / 2);
        leftBackUp.parent = goalGroup;

        const rightBackUp = BABYLON.MeshBuilder.CreateCylinder("rightBackUp", { height: Math.sqrt(goalDepth*goalDepth + goalHeight*goalHeight), diameter: postThickness / 2 }, scene);
        rightBackUp.rotation.x = Math.atan(goalDepth/goalHeight);
        rightBackUp.position = new BABYLON.Vector3(goalWidth / 2, goalHeight/2, -goalDepth / 2);
        rightBackUp.parent = goalGroup;

    // Net (Using CreateGround for subdivisions to create a grid/net look in wireframe)
    // Back Net
    const netBack = BABYLON.MeshBuilder.CreateGround("netBack", { width: goalWidth, height: goalHeight, subdivisions: 15 }, scene);
    netBack.rotation.x = -Math.PI / 2;
    netBack.position = new BABYLON.Vector3(0, goalHeight / 2, -goalDepth);
    netBack.material = netMaterial;
    netBack.parent = goalGroup;

    // Left Net
    const netLeft = BABYLON.MeshBuilder.CreateGround("netLeft", { width: goalDepth, height: goalHeight, subdivisions: 10 }, scene);
    netLeft.rotation.x = -Math.PI / 2;
    netLeft.rotation.y = -Math.PI / 2;
    netLeft.position = new BABYLON.Vector3(-goalWidth / 2, goalHeight / 2, -goalDepth / 2);
    netLeft.material = netMaterial;
    netLeft.parent = goalGroup;
    
    // Right Net
    const netRight = BABYLON.MeshBuilder.CreateGround("netRight", { width: goalDepth, height: goalHeight, subdivisions: 10 }, scene);
    netRight.rotation.x = -Math.PI / 2;
    netRight.rotation.y = Math.PI / 2;
    netRight.position = new BABYLON.Vector3(goalWidth / 2, goalHeight / 2, -goalDepth / 2);
    netRight.material = netMaterial;
    netRight.parent = goalGroup;
    
    // Top Net
    const netTop = BABYLON.MeshBuilder.CreateGround("netTop", { width: goalWidth, height: goalDepth, subdivisions: 15 }, scene);
    netTop.position = new BABYLON.Vector3(0, goalHeight, -goalDepth/2);
    netTop.material = netMaterial;
    netTop.parent = goalGroup;

    return goalGroup;
};
