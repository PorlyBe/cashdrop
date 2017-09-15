/*
 *  connects to blockchair for initial transaction loading
 */
var url = "https://api.blockchair.com/bitcoin-cash";
var xhr = new XMLHttpRequest();
var newTX = true;

xhr.onreadystatechange  = function() {
	if (this.readyState == 4 && this.status == 200) {
        var obj = JSON.parse(this.responseText);
        if (newTX){
        	initTransactions(obj.data);
        	newTX = false;
        } else {
            addBlock();
        	clearTransactions(obj.tx);
        	
        }
    }
}

xhr.open('GET', 'https://porlybe.github.io/CashDrop/proxy.php?url=' + url + "/mempool/transactions?q=block_id(-1)", true);
xhr.send();

/*
 * connects to bitcoin.com cashexplorer websocket for incomming transactions
 */
var socket = io("http://cashexplorer.bitcoin.com/");
room = 'inv';
eventTX = 'tx';
eventBlock = 'block';

socket.on('connect', function() {
	socket.emit('subscribe', room);
});
socket.on(eventTX, function(data) {
	Transaction(data.valueOut, data.txid);
	// console.log("New TX: " + data.txid + " : " + data.valueOut);
});
socket.on(eventBlock, function(data) {
	// Block(data);
	xhr.open('GET', "proxy.php?url=https://cashexplorer.bitcoin.com/insight-api/block/" + data, true);
	xhr.send();
	
});


var canvas = document.querySelector("#renderCanvas");
var engine = new BABYLON.Engine(canvas, true);

var shadows = [];

var createScene = function() {
	var scene = new BABYLON.Scene(engine);
	
	// Background color
	scene.clearColor = new BABYLON.Color3.Gray();// Color3(0, 1, 0);
	scene.ambientColor = new BABYLON.Color3(1,1,1);
	
	// camera
	var camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 1, 0.8, 15, new BABYLON.Vector3(0, 0, 0), scene);
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
	var physicsPlugin = new BABYLON.OimoJSPlugin();
	scene.enablePhysics(gravityVector, physicsPlugin);
	scene.enablePhysics();	
	
	// Add Ground to scene
	var numberOfSides = 32;
	var diameter = 10;
	var ground = BABYLON.Mesh.CreateCylinder("ground", 0.5, diameter, diameter, numberOfSides, 2, scene);
	ground.position.y = -0.25;
	ground.material = groundMaterial;
	ground.receiveShadows = true;
	ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.8 }, scene);
	
	addSides(numberOfSides, diameter);
	
	coinParent = createCoin();
	
	// GUI
	setGUI();

	// shows scene debugger
	scene.debugLayer.show();
	
	//BABYLON.SceneOptimizer.OptimizeAsync(scene);

	return scene;
}; // End of createScene function

var scene = createScene();

// Materials
var coinMaterial, coinMaterialClicked, groundMaterial, sideMaterial, blockMaterial;

var coinParent;

// vars for GUI
var lastPicked, infoPlane, infoTexture, infoText, infoRect;

// lights and shadows used for the scene
function setLights(){
	var lightHem = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(0, 1, 0), scene);
	lightHem.diffuse = new BABYLON.Color3(1, 1, 1);
	lightHem.specular = new BABYLON.Color3(1, 1, 1);
	lightHem.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);
	lightHem.intensity = 0.5;

	var lightSpot = new BABYLON.SpotLight("Spot0", new BABYLON.Vector3(-7, 10, -7), new BABYLON.Vector3(0.4, -1, 0.4), 1.2, 4, scene);
	lightSpot.diffuse = new BABYLON.Color3(1, 1, 1);
	lightSpot.specular = new BABYLON.Color3(1, 1, 1);
	lightSpot.intensity = 0.5;
	
	//Add shadows
	shadows[0] = new BABYLON.ShadowGenerator(1024, lightSpot);
	shadows[0].usePoissonSampling = true;
	shadows[0].useBlurExponentialShadowMap = true;
}

// sets materials for the scene
function setMaterials(){
	// create materials
	groundMaterial = new BABYLON.StandardMaterial("ground", scene)
	sideMaterial = new BABYLON.StandardMaterial("side", scene)
	coinMaterial = new BABYLON.StandardMaterial("coin", scene);
	coinMaterialClicked = new BABYLON.StandardMaterial("coin", scene);
	blockMaterial = new BABYLON.StandardMaterial("block", scene);
	
	// set colors etc...
	groundMaterial.diffuseColor = new BABYLON.Color3(1,1,0);
	groundMaterial.specularColor = new BABYLON.Color3(1,1,0);
	
	sideMaterial.diffuseColor = new BABYLON.Color3(1,0,1);
	sideMaterial.specularColor = new BABYLON.Color3(1,0,1);
	
	var coinTexture = new BABYLON.Texture("images/coin.png", scene);
	
	//coinMaterial.diffuseColor = new BABYLON.Color3(0,1,0);
	//coinMaterial.specularColor = new BABYLON.Color3(0,1,0);
	coinMaterial.diffuseTexture = coinTexture;
	coinMaterial.specularTexture = coinTexture;
	// coinMaterial.diffuseTexture.hasAlpha = true;
	
	coinMaterialClicked.diffuseColor = new BABYLON.Color3(0.8,1,0.8);
	coinMaterialClicked.specularColor = new BABYLON.Color3(0.8,1,0.8);
	coinMaterialClicked.diffuseTexture = coinTexture;
	// coinMaterialClicked.diffuseTexture.hasAlpha = true;
	
	blockMaterial.diffuseColor = new BABYLON.Color3(1,0,0);
	blockMaterial.specularColor = new BABYLON.Color3(1,0,1);
	// blockMaterial.alpha = 0.95;
	// blockMaterial.diffuseTexture.hasAlpha = true;
}

// creates GUI controls
function setGUI(){
	infoPlane = BABYLON.Mesh.CreatePlane("plane", 3);
	infoPlane.isPickable =false;
	infoPlane.position = new BABYLON.Vector3(0,-1,0);
	
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
	
	var hudTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
// hudTexture.idealWidth = 1024;
// hudTexture.idealHeight = 768;
// hudTexture.renderAtIdealSize = true;
//	
	var createTextBox = function (text){
		var hudText = new BABYLON.GUI.TextBlock();
		// hudText.fontSize = 20;
		hudText.alpha = 0.7;
		hudText.color = "white";
		hudText.text = text;
		// hudText.width = text.length / 95;
		hudText.height = "30px";
		// hudText.textHorizontalAlignment =
		// BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
		hudText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP; 
		hudText.paddingLeft = "10px";
		hudText.paddingTop = "10px";
		// hudText.horizontalAlignment =
		// BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
		hudText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
		
		hudTexture.addControl(hudText);
		return hudText;
	}
	
	var title = createTextBox("Cash Drop");
	var subtitle = createTextBox("Bitcoin Cash Mempool Visualiser");
	subtitle.fontSize = 15;
	subtitle.top = title.height;
	
	
	var donation = createTextBox("Donate BCC: 1BEpW8LnYmBpSFpgJkhPM8Ga7Ry99MPUmE");
	donation.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	donation.paddingTop = "0px";
	donation.fontSize = 15;
	
	donation.onPointerEnterObservable.add(function() {
        donation.color = "blue";
    });
	donation.onPointerOutObservable.add(function() {
        donation.color = "white";
    });  
	
	donation.onPointerUpObservable.add(function() {
        location.href;
    });
}

// Add sides to the ground
function addSides(numberOfSides, diameter) {
	
	var innerDiameter = diameter;
	var outerDiameter = diameter + 0.1;
	var height = 2;
	
	var tess = numberOfSides;
	
	var inner = BABYLON.MeshBuilder.CreateCylinder("cone", {diameter: innerDiameter, tessellation: tess}, scene);
	//BABYLON.Mesh.CreateCylinder("inner", height, innerDiameter, innerDiameter, tess, 1, scene);
	
	var outer = BABYLON.MeshBuilder.CreateCylinder("cone", {diameter: outerDiameter, tessellation: tess}, scene);
	//BABYLON.Mesh.CreateCylinder("outer", height, outerDiameter, outerDiameter, tess, 1, scene);
		
	var innerCSG = BABYLON.CSG.FromMesh(inner);
	var outerCSG = BABYLON.CSG.FromMesh(outer);
	
	var subCSG = outerCSG.subtract(innerCSG);
	
    var newMesh = subCSG.toMesh("ground", sideMaterial, scene);
	
	//newMesh.physicsImpostor = new BABYLON.PhysicsImpostor(newMesh, BABYLON.PhysicsImpostor.MeshImpostor, { mass: 0, restitution: 0.9 }, scene);
	newMesh.position.y = 0.5;
	newMesh.receiveShadows = true;
	inner.dispose();
	outer.dispose();
	
	for (i in shadows){
		shadows[i].getShadowMap().renderList.push(newMesh);
	}
	return;
	
	//var radius = 5;
	var sides = [];
	var sideParent = BABYLON.Mesh.CreateBox("side", 0, scene);
	
	for (var pt = 0; pt < numberOfSides; pt++){
		var angle = (Math.PI/2) + (pt / numberOfSides) * 2 * Math.PI + (1/numberOfSides * Math.PI);
		
		var x = radius * Math.cos(angle);
		var z = radius * Math.sin(angle);
		var a = 1.5708 - angle;
		var side = 2 * (radius + 0.2) * Math.sin(Math.PI/numberOfSides);
		
		sides[pt] = sideParent.clone("ground");
		sides[pt].position = new BABYLON.Vector3(x, 0.5, z);
		sides[pt].scaling = new BABYLON.Vector3(0.2, 2, side);
		sides[pt].rotation.y = -angle;
		sides[pt].physicsImpostor = new BABYLON.PhysicsImpostor(sides[pt], BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);
		
		sides[pt].material = sideMaterial;
		
		sides[pt].receiveShadows = true;
		//var mergedSides = BABYLON.Mesh.MergeMeshes(sides);
		//mergedSides.name = "ground";
		// Add shadows

	}
	sideParent.dispose();
}

// add transactions that are already in the mempool
function initTransactions(data) {
	for (key in data) {
		var value = data[key].output_total / 100000000;
		var hash = data[key].hash;
		Transaction(value, hash);
	}
}

// creates a coin for transactions to instanciate
function createCoin(){
	// uv map for texture location
	var uv = [
		new BABYLON.Vector4(0, 0, 1, 1),
		new BABYLON.Vector4(0.2, 0.2, 0.2, 0.2),
		new BABYLON.Vector4(0, 0, 1, 1),
	];
	
	// Colors per surface
	var colors = [  
		new BABYLON.Color4(0, 1, 0, 0),	
		new BABYLON.Color4(1, 1, 1, 1),	
		new BABYLON.Color4(0, 1, 0, 0)
	];

	// options for coin creation
	var options = {
			height: 0.1,
			diameter: 1,
			subdivisions: 1,
			hasRings: false,
			faceUV: uv,
			faceColors: colors,
			tessellation: 32
	}
	
	// make coin and add material, physics and shadows
	coin = BABYLON.MeshBuilder.CreateCylinder("coinParent", options, scene);
	coin.material = coinMaterial;
	coin.position.y = -1;
	coin.rotation.x = 90 * Math.PI/180;
	
	coin.physicsImpostor = new BABYLON.PhysicsImpostor(coin, BABYLON.PhysicsImpostor.CylinderImpostor, { mass: 0, restitution: 0 }, scene);
	//coin.showBoundingBox = true;
	coin.receiveShadows = true;
	coin.enabled = false;
	return coin;
}

// creates new transaction/coin
function Transaction(value, txid){
	var x, y, z, w, h, ry;
	
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
	rY = Math.random() * 180;

	mesh = coinParent.clone(txid);
	mesh.enabled = true;

	
	mesh.position = new BABYLON.Vector3(x,y,z);
	mesh.scaling = new BABYLON.Vector3(w,w,w);
	
	mesh.rotation.y = rY * Math.PI/180;
	mesh.physicsImpostor.mass = 1;
	mesh.txValue = value;
	
	for (i in shadows){
		shadows[i].getShadowMap().renderList.push(mesh);
	}
}


// adds a block to the scene and then rotates it
function addBlock(){
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

// remove transactions from list when block detected
function clearTransactions(data){
	for(tx in data){
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
	
	if(pickedMesh != null && pickedMesh.name != "ground"){
		if(lastPicked != null){
			lastPicked.material = coinMaterial;
		} 
		// infoPlane.parent = pickedMesh;
		infoPlane.position.x = pickedMesh.position.x;
		infoPlane.position.z = pickedMesh.position.z;
		infoPlane.position.y = 0.6;
		
		var txVal = pickedMesh.txValue.toString();
		infoText.text = txVal;
		infoRect.width = txVal.length / 17;
		
		pickedMesh.material = coinMaterialClicked;
		lastPicked = pickedMesh;
	} else if (pickedMesh == null){
		if (lastPicked == null) 
			return;
		lastPicked.material = coinMaterial;
		infoPlane.position = new BABYLON.Vector3(0,-1,0);
		
	}
});
