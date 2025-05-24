// visualization/graph_3d.js
// This script requires the THREE.js library to be included in the HTML file that uses this script.
// It also expects a canvas element with id='canvas' in the HTML.

// Ensure THREE is loaded, otherwise provide a fallback or error.
if (typeof THREE === 'undefined') {
    console.error('THREE.js is not loaded. This script will not work.');
    // Optionally, you could try to load it dynamically or instruct the user.
}

function init3DGraph() {
    // Get the canvas element from the HTML.
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element with id="canvas" not found.');
        return;
    }

    // 1. Scene: The container for all 3D objects.
    var scene = new THREE.Scene();

    // 2. Camera: Defines the perspective from which the scene is viewed.
    // PerspectiveCamera(fov, aspect_ratio, near_clipping_plane, far_clipping_plane)
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15; // Adjust camera position to see the points

    // 3. Renderer: Renders the scene through the camera onto the canvas.
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true // Smooths out the edges of objects
    });
    renderer.setSize(window.innerWidth, window.innerHeight); // Set renderer size to window size
    // Optional: Set a background color for the scene
    renderer.setClearColor(0xf0f0f0); // Light gray background

    // Data points for the graph (example data)
    var dataPoints = [];
    for (var i = 0; i < 100; i++) {
        var x = (Math.random() - 0.5) * 20; // Centered around 0, range -10 to 10
        var y = (Math.random() - 0.5) * 20;
        var z = (Math.random() - 0.5) * 20;
        dataPoints.push(new THREE.Vector3(x, y, z));
    }

    // Create a buffer geometry for the scatter plot.
    var geometry = new THREE.BufferGeometry();
    const positions = [];
    dataPoints.forEach(function (point) {
        positions.push(point.x, point.y, point.z);
    });
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Material for the points (e.g., basic points material).
    var material = new THREE.PointsMaterial({ 
        color: 0x0077ff, // Blue color for points
        size: 0.3       // Size of the points
    });

    // Create the points object and add it to the scene.
    var pointsObject = new THREE.Points(geometry, material);
    scene.add(pointsObject);

    // Optional: Add AxesHelper to visualize the x, y, z axes
    var axesHelper = new THREE.AxesHelper(10); // Length of 10 units for each axis
    scene.add(axesHelper);

    // Animation loop: This will be called on every frame to re-render the scene.
    function animate() {
        requestAnimationFrame(animate); // Request the next frame

        // Optional: Add some animation (e.g., rotate the points object)
        pointsObject.rotation.x += 0.005;
        pointsObject.rotation.y += 0.005;

        renderer.render(scene, camera); // Render the scene
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    // Start the animation loop.
    animate();
}

// Call init3DGraph when the DOM is fully loaded or if THREE is available
if (typeof THREE !== 'undefined') {
   // It's good practice to ensure the DOM is ready before trying to access elements like 'canvas'
   if (document.readyState === 'loading') { // DOM not yet ready
       document.addEventListener('DOMContentLoaded', init3DGraph);
   } else { // DOM is already ready
       init3DGraph();
   }
} else {
   // Fallback or error message if THREE is not loaded
   console.error('THREE.js not found, cannot initialize 3D graph.');
   // You could add a message to the user on the page itself if desired.
   var canvasElement = document.getElementById('canvas');
   if (canvasElement) {
       var ctx = canvasElement.getContext('2d');
       if (ctx) {
           ctx.fillStyle = 'black';
           ctx.font = '16px Arial';
           ctx.fillText('Error: Could not load 3D graph component.', 10, 50);
       }
   }
}
