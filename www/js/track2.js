 (function () {

        // create a scene, that will hold all our elements such as objects, cameras and lights.
        var scene = new THREE.Scene();

        // create a camera, which defines where we're looking at.
        var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 3000 );
	    camera.position.set( 0, 500, 1000 );
		camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
        scene.add(camera);

        // create a render and set the size
        var renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.sortObjects = false;
        document.body.appendChild( renderer.domElement );

        scene.add( new THREE.GridHelper( 1500, 250, 0x444444, 0x444444 ) );
        
        render();

        var step = 0;
        function render() {
             // Set the camera to always point to the centre of our scene, i.e. at vector 0, 0, 0
            //camera.lookAt( scene.position );
 
 camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

            // Move the camera in a circle with the pivot point in the centre of this circle...
            // ...so that the pivot point, and focus of the camera is on the centre of our scene.
            var timer = new Date().getTime() * 0.0005;
            
            camera.position.x = Math.floor(Math.cos( timer ) * 1500);
            camera.position.z = Math.floor(Math.sin( timer ) * 1200);

            requestAnimationFrame(render);
            renderer.render(scene, camera);
        }

    })();
 
 
 