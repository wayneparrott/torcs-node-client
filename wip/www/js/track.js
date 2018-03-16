(function() {

	// create a scene, that will hold all our elements such as objects, cameras and lights.
	var scene = new THREE.Scene();

	//add lights
	var toplight = new THREE.DirectionalLight(0xffffff, 1);
	toplight.position.set(0, 1, 0);
	scene.add(toplight);

	var ambient = new THREE.AmbientLight(0xffffff, 1);
	scene.add(ambient);

	//road
	var texture = THREE.ImageUtils.loadTexture('../img/road-rotated.jpg');
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(1, 10);

	var ROAD_SEG_WIDTH = 8;
	var ROAD_SEG_LENGTH = 50;
	var GROUND_Y = -5;
	
	var road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_SEG_WIDTH,ROAD_SEG_LENGTH),
		new THREE.MeshBasicMaterial(
			{
				color : 0xaaaaaa,
				shininess : 100,
				ambient : 0x333333,
				map : texture
			}
		)
	);
	road.rotation.x = -Math.PI / 2;
	road.position.y = 0 + GROUND_Y;
	road.position.z = 0;
	scene.add(road);
	
	var road1 = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_SEG_WIDTH,
			100),
			new THREE.MeshBasicMaterial(
				{
					color : 0xaaaaaa,
					ambient : 0x333333,
					map : texture
				}
			)
		);
		road1.rotation.x = -Math.PI / 2;
		road1.position.x = 0;
		road1.position.y = 0 + GROUND_Y;
		road1.position.z = 20;
		//scene.add(road1);
//		
		var width_segments=1, length_segments=100;
		var plane = new THREE.PlaneGeometry(ROAD_SEG_WIDTH, ROAD_SEG_LENGTH, width_segments, length_segments);

		for(var i=0; i<plane.vertices.length/2; i++) {
			  //console.log(i, i*2, i*2+1);
		    plane.vertices[2*i].x += Math.pow(2, i/20);
		    plane.vertices[2*i+1].x += Math.pow(2, i/20);
		}
		
		var road2 = new THREE.Mesh(plane,
				new THREE.MeshBasicMaterial(
					{
						color : 0xaaaaaa,
						ambient : 0x333333,
						map : texture
					}
				)
			);
			//road2.rotation.x = -Math.PI / 2;
			road2.position.x = 0;
			road2.position.y = 0 + GROUND_Y;
			road2.position.z = ROAD_SEG_LENGTH + 10;
			scene.add(road2);

		
	// create a camera, which defines where we're looking at.
	var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 250);
	camera.position.set( 0, 0, 200 );
//	camera.position.set(0, 500, 1000);
//	camera.lookAt(new THREE.Vector3(0, 0, 0));
	scene.add(camera);

	// create a render and set the size
	var renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.sortObjects = false;
	document.body.appendChild(renderer.domElement);

	//scene.add(new THREE.GridHelper(1500, 250, 0x444444, 0x444444));

	render();

	var timer = new Date().getTime() * 0.0005;
	var step = 0;
	function render() {
		// Set the camera to always point to the centre of our scene, i.e. at vector 0, 0, 0
		//camera.lookAt( scene.position );

		//camera.lookAt(new THREE.Vector3(0, 0, 0));

		// Move the camera in a circle with the pivot point in the centre of this circle...
		// ...so that the pivot point, and focus of the camera is on the centre of our scene.
		var ctimer = new Date().getTime() * 0.0005;

		//camera.position.x = Math.floor(Math.cos(timer) * 3);
		//camera.position.z = Math.sin(timer) * 100);
		var offset = (ctimer-timer);
		//console.log(offset);
		//camera.position.z -= 0.1;

		requestAnimationFrame(render);
		renderer.render(scene, camera);
	}

})();