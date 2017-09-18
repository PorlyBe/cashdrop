"use strict";
// *************************************************************************************************************
// CONNECT TO BITCOIN.COM CASHEXPLORER WEBSOCKET FOR INCOMMING TRANSACTIONS & INITIATE NEW BLOCK FOUND SEQUENCE
// *************************************************************************************************************
var xhr = new XMLHttpRequest();
var socket = io("https://bitcoincash.blockexplorer.com/");

xhr.onreadystatechange  = function() {
	if (this.readyState == 4 && this.status == 200) {
        var obj = JSON.parse(this.responseText);
        addBlock();
        setTimeout(clearTransactions(obj.tx), 1000);
    }
}

socket.on('connect', function() {
	socket.emit('subscribe', "inv");
});

socket.on("tx", function(data) {
	Transaction(data.valueOut, data.txid);
});

socket.on("block", function (data) {
	xhr.open('GET', "https://bitcoincash.blockexplorer.com/api/block/" + data, true);
	xhr.send();
	
});

var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

var shadows = []; // array for shadows

// ******************************
// INITIAL CREATION OF THE SCENE
// ******************************
var createScene = function() {
	var scene = new BABYLON.Scene(engine);
	
	// create skybox & skybox material
    var skybox = BABYLON.Mesh.CreateBox("skyBox", 100.0, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skybox.position.y = -10;
    skybox.renderingGroupId = 0;
    skybox.infiniteDistance = true;
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/textures/skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.material = skyboxMaterial;
    
	// create camera
	var camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 4.75, 1.3, 15, new BABYLON.Vector3(0, -1, 0), scene);
	camera.lowerBetaLimit = 0.1;
	camera.upperBetaLimit = (Math.PI / 2) * 0.9;
	camera.lowerRadiusLimit = 5;
	camera.upperRadiusLimit = 30;
	camera.wheelPrecision = 30;
	camera.pinchPrecision = 30;
	camera.attachControl(canvas, true);

	// lights
	setLights();

	// Create and set Materials
	setMaterials();
	
	// physics
	var gravityVector = new BABYLON.Vector3(0,-9.81, 0);
	var physicsPlugin = new BABYLON.CannonJSPlugin();
	scene.enablePhysics(gravityVector, physicsPlugin);
	scene.enablePhysics();	
	
	// Add Ground to scene
	var numberOfSides = 32;
    var diameter = 10;

	ground = BABYLON.Mesh.CreateCylinder("ground", 0.5, diameter, diameter, numberOfSides, 1, scene);
    ground.position.y = -2;
    groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0);
    groundMaterial.reflectionTexture = new BABYLON.MirrorTexture("mirror", 512, scene, true); //Create a mirror texture
    groundMaterial.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -5.75, 0, -10.0);
    groundMaterial.reflectionTexture.renderList = [skybox];
    groundMaterial.reflectionTexture.level = 0.1;
    ground.receiveShadows = true;
    ground.material = groundMaterial;
	ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.8 }, scene);

    // add sides to the ground
    addSides(numberOfSides, diameter);

    // create coinparent for cloning
	coinParent = createCoin();
	
	// create UI for coin click info
	setGUI();

    // set sound
    soundDrop = new BABYLON.Sound("soundDrop", "assets/sounds/drop.wav", scene);

    // shows scene debugger
    //BABYLON.DebugLayer.InspectorURL = "https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js";
	//scene.debugLayer.show();
	
    BABYLON.SceneOptimizer.OptimizeAsync(scene, OptimizerOptions(), null, null);

	return scene;
}; // End of createScene function


var coinMaterial, coinMaterialClicked, groundMaterial, sideMaterial, blockMaterial, edgeMaterial; // materials
var coinParent, ground; // global meshes
var lastPicked, infoPlane, infoTexture, infoText, infoRect; // vars for GUI
var soundDrop;

// *********************
//  SCENE OPTIMISATION
// *********************
var OptimizerOptions = function () {
    var result = new BABYLON.SceneOptimizerOptions(30, 2000); // limit 30 FPS min here

    var priority = 0;
    result.optimizations.push(new BABYLON.ShadowsOptimization(priority));
    result.optimizations.push(new BABYLON.LensFlaresOptimization(priority));

    // Next priority
    priority++;
    result.optimizations.push(new BABYLON.PostProcessesOptimization(priority));
    result.optimizations.push(new BABYLON.ParticlesOptimization(priority));

    // Next priority
    priority++;
    result.optimizations.push(new BABYLON.TextureOptimization(priority, 256));

    // Next priority
    priority++;
    result.optimizations.push(new BABYLON.RenderTargetsOptimization(priority));

    // Next priority
    priority++;
    result.optimizations.push(new BABYLON.HardwareScalingOptimization(priority, 4));

    return result;
}
// creates the scene
var scene = createScene();


// ********************
//  LIGHTING & SHADOWS
// ********************
function setLights() {
    // hemispheric light
	var lightHem = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(0, 1, 0), scene);
	lightHem.diffuse = new BABYLON.Color3(1, 1, 1);
	lightHem.specular = new BABYLON.Color3(1, 1, 1);
	lightHem.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);
	lightHem.intensity = 0.5;
    // directional light
    var lightDir = new BABYLON.DirectionalLight("Directional", new BABYLON.Vector3(0, -5, -10), scene);
    lightDir.diffuse = new BABYLON.Color3(1, 1, 1);
    lightDir.specular = new BABYLON.Color3(1, 1, 1);
    lightDir.intensity = 0.5;
    // shadows
    shadows[0] = new BABYLON.ShadowGenerator(1024, lightDir);
    shadows[0].useBlurExponentialShadowMap = true;
    shadows[0].setTransparencyShadows = true;
}

// ************************
//  MATERIALS AND TEXTURES
// ************************
function setMaterials() {
    var coinTexture = new BABYLON.Texture("assets/textures/coin.png", scene);

    // initialise materials
    groundMaterial = new BABYLON.StandardMaterial("ground", scene);
    edgeMaterial = new BABYLON.StandardMaterial("edge", scene);
    sideMaterial = new BABYLON.StandardMaterial("side", scene);
	coinMaterial = new BABYLON.StandardMaterial("coin", scene);
	coinMaterialClicked = new BABYLON.StandardMaterial("coinClicked", scene);
	blockMaterial = new BABYLON.StandardMaterial("block", scene);
	
    //  edge of ground
    edgeMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
    edgeMaterial.specularColor = new BABYLON.Color3(1, 1, 0);

    // sides
    sideMaterial.emissiveColor = new BABYLON.Color3(0.1, 0, 0.1);
    sideMaterial.alpha = 0.1;
    sideMaterial.opacityFresnelParameters = new BABYLON.FresnelParameters();
    sideMaterial.opacityFresnelParameters.leftColor = BABYLON.Color3.White();
    sideMaterial.opacityFresnelParameters.rightColor = BABYLON.Color3.Black();
    sideMaterial.hasAlpha = true;
    sideMaterial.useSpecularOverAlpha = true;

    // coin and coin clicked
	coinMaterial.diffuseTexture = coinTexture;
    coinMaterial.specularTexture = coinTexture;
    coinMaterial.emissiveColor = new BABYLON.Color3(0, 0.2, 0);

	coinMaterialClicked.diffuseColor = new BABYLON.Color3(0.8,1,0.8);
	coinMaterialClicked.specularColor = new BABYLON.Color3(0.8,1,0.8);
	coinMaterialClicked.diffuseTexture = coinTexture;

    // block
	blockMaterial.diffuseColor = new BABYLON.Color3(1,0,0);
	blockMaterial.specularColor = new BABYLON.Color3(1,0,1);
}

// *******************
//  TRANSACTION INFO
// *******************
function setGUI(){
	infoPlane = BABYLON.Mesh.CreatePlane("plane", 3);
	infoPlane.isPickable = false;
    infoPlane.position = new BABYLON.Vector3(0, -3, 0);
    infoPlane.visibility = 0;

	infoPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
	infoTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(infoPlane,1024,1024,false);
	
	infoRect = new BABYLON.GUI.Rectangle();
	infoRect.height = 0.1;
	infoRect.cornerRadius = 20;
	infoRect.background = "gray";
	infoRect.alpha = 0.5;
	infoRect.parent = infoPlane;
	
	infoText = new BABYLON.GUI.TextBlock();
	infoText.fontSize = 100;
	infoText.alpha = 0.7;
	infoText.color = "white";
	
	infoTexture.addControl(infoRect);	
	infoTexture.addControl(infoText);
}

// ****************************************************
//  CONSTRUCTS SIDES OF THE BOWL FOR LOOKS AND PHYSICS
// ****************************************************
function addSides(numberOfSides, diameter) {

    // constructive solid geometry from cylinders for the sides
	var innerDiameter = diameter;
	var outerDiameter = diameter + 0.1;
	var height = 1;
    var inner = BABYLON.MeshBuilder.CreateCylinder("cone", { height: height, diameter: innerDiameter, tessellation: numberOfSides }, scene);
    var outer = BABYLON.MeshBuilder.CreateCylinder("cone", { height: height, diameter: outerDiameter, tessellation: numberOfSides }, scene);
	var innerCSG = BABYLON.CSG.FromMesh(inner);
    var outerCSG = BABYLON.CSG.FromMesh(outer);
	var subCSG = outerCSG.subtract(innerCSG);
    var newMesh = subCSG.toMesh("sides", sideMaterial, scene);

    newMesh.position.y = -1.25;
    newMesh.material = sideMaterial;

    // creates edge around the ground to prevent weird mirror effect
    var newMeshBottom = newMesh.clone("edge");
    newMeshBottom.material = edgeMaterial;
    newMeshBottom.scaling.y = 0.5;
    newMeshBottom.position.y = -2;

    // dispose the temporary meshes
	inner.dispose();
	outer.dispose();

    // adds sides to grounds mirror render list
    groundMaterial.reflectionTexture.renderList.push(newMesh);

    // construct the sides for physics
	var radius = diameter / 2;
	var sides = [];
	var sideParent = BABYLON.Mesh.CreateBox("side", 0, scene);
	
	for (var pt = 0; pt < numberOfSides; pt++){
		var angle = (Math.PI/2) + (pt / numberOfSides) * 2 * Math.PI + (1/numberOfSides * Math.PI);
		var x = radius * Math.cos(angle);
		var z = radius * Math.sin(angle);
		var a = 1.5708 - angle;
		var side = diameter * Math.sin(Math.PI/numberOfSides);

		sides[pt] = sideParent.clone("sides");
		sides[pt].position = new BABYLON.Vector3(x, -1, z);
		sides[pt].scaling = new BABYLON.Vector3(0.05, 1.5, side);
		sides[pt].rotation.y = -angle;
		sides[pt].physicsImpostor = new BABYLON.PhysicsImpostor(sides[pt], BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
        sides[pt].visibility = 0;
        sides[pt].isPickable = false;
    }
    // dispose of the side parent as no longer needed
	sideParent.dispose();
}

// *****************************
//  CREATE INITIAL TRANSACTIONS
// *****************************
function initTransactions(data) {
	for (var key in data) {
		var value = data[key].output_total / 100000000;
		var hash = data[key].hash;
		Transaction(value, hash);
	}
}

// *****************************************************
// CREATE PARENT COIN FOR CLONING WITH NEW TRANSACTIONS
// *****************************************************
function createCoin(){
	// uv map for texture location
	var uv = [new BABYLON.Vector4(0, 0, 1, 1), new BABYLON.Vector4(0.2, 0.2, 0.2, 0.2), new BABYLON.Vector4(0, 0, 1, 1)];
	
	// Colors per surface
	var colors = [new BABYLON.Color4(0, 1, 0, 0), new BABYLON.Color4(1, 1, 1, 1), new BABYLON.Color4(0, 1, 0, 0)];

	// options for coin creation
	var options = {
			height: 0.1,
			diameter: 1,
			subdivisions: 1,
			hasRings: false,
			faceUV: uv,
			faceColors: colors,
			tessellation: 16
	}
	
	// make coin and add material, physics and shadows
	var coin = BABYLON.MeshBuilder.CreateCylinder("coinParent", options, scene);
	coin.material = coinMaterial;
	coin.position.y = -3;
	coin.rotation.x = 90 * Math.PI/180;
	
	coin.physicsImpostor = new BABYLON.PhysicsImpostor(coin, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0, restitution: 0.1 }, scene);
	//coin.showBoundingBox = true;
	coin.receiveShadows = true;
    coin.enabled = false;
    coin.visibility = 0;
	return coin;
}

// ***************************************************
//  CLONES PARENT COIN AND POSITIONS/ROTATES NEW COIN
// ***************************************************
function Transaction(value, txid) {
	var x, y, z, w, h, rY, mesh;
	
	// initial random location of coin before they drop
	x = -2 + Math.random() * 4;
	z = -2 + Math.random() * 4;
	y = 5 + Math.random() * 10;

	// diameter of coin depending on size of value
	if (value < 1) {
		w = .2;
	} else if (value >= 1 && value < 10) {
		w = .4;
	} else if (value >= 10 && value < 50) {
		w = .6;
	} else if (value >= 50 && value < 100) {
		w = .8;
	} else if (value >= 100 && value < 200) {
		w = 1;
	} else if (value >= 200 && value < 500){
		w = 1.2;
	} else if (value >= 500 && value < 1000){
		w = 1.4;
	} else {
		w = 1.6;
	}

	// coin height
	h = w / 8;

	// initial rotation
	rY = Math.random() * Math.PI;

	mesh = coinParent.clone(txid);
    mesh.enabled = true;
    mesh.visibility = 1;
	mesh.position = new BABYLON.Vector3(x,y,z);
	mesh.scaling = new BABYLON.Vector3(w,w,w);
	mesh.rotation.y = rY;
	mesh.physicsImpostor.mass = 1;
    mesh.txValue = value;
    mesh.collided = true;
	
	for (var i in shadows){
		shadows[i].getShadowMap().renderList.push(mesh);
    }

    mesh.physicsImpostor.registerOnPhysicsCollide(ground.physicsImpostor, function (main, collided) {
        if (mesh.collided == true) {
            soundDrop.play();
            mesh.collided = false;
        }
    });

    // add coin to ground mirror render list
    groundMaterial.reflectionTexture.renderList.push(mesh);
}

// *****************************
//  CREATE BLOCK AND ANIMATE IT
// *****************************
function addBlock() {
	var block = BABYLON.Mesh.CreateBox("block", 6.5, scene);
	block.material = blockMaterial;
	block.position.y = -6;
	
	var animationBox = new BABYLON.Animation("blockAnimation", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT );
	var keys = [];

	keys.push({frame: 0, value: 0});
	keys.push({frame: 120, value: 8.0});
	
	animationBox.setKeys(keys);
	
	block.animations = [];
	block.animations.push(animationBox);
	
	var animation = scene.beginAnimation(block, 0, 120, false, 1, true);

	animation.onAnimationEnd = function () {
		animation.animationStarted = false;
		block.dispose();
	}
	BABYLON.Animation.CreateAndStartAnimation('blockMove', block, 'position.y', 60, 120, -6, 8, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
	
}

// *************************************************
//  CLEAR TRANSACTIONS THAT ARE INCLUDED IN A BLOCK
// *************************************************
function clearTransactions(data) {
	for(var tx in data){
		if (scene.getMeshByName(data[tx])){
			scene.getMeshByName(data[tx]).dispose(true);
		}
	}
}

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function() {
	scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function() {
	engine.resize();
});

// when user clicks on a coin
window.addEventListener("click", function(){
	var pickResult = scene.pick(scene.pointerX, scene.pointerY);
	var pickedMesh = pickResult.pickedMesh;

    if (pickedMesh.name == "ground" || pickedMesh.name == "sides" || pickedMesh.name == "edge") {
        return;
    } else if (pickedMesh.name == "skyBox" || pickedMesh == lastPicked) {
		if (lastPicked == null) 
			return;
        lastPicked.material = coinMaterial;
        lastPicked = null;
        infoPlane.visibility = 0;		
	} else {
		if(lastPicked != null){
			lastPicked.material = coinMaterial;
        }
		// infoPlane.parent = pickedMesh;
		infoPlane.position.x = pickedMesh.position.x;
		infoPlane.position.z = pickedMesh.position.z;
        infoPlane.position.y = -1;
        infoPlane.visibility = 1;

		var txVal = pickedMesh.txValue.toString();
		infoText.text = txVal;
		infoRect.width = txVal.length / 17;
		
		pickedMesh.material = coinMaterialClicked;
		lastPicked = pickedMesh;
    } 
});
