var cube, outer
var scene, camera, renderer

const TABLE_SIZE = { w: 120, h: 8, d: 60 }
const TABLE_LEG_POS = { x: 50, y: -15, z: 20 }

function init() {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.shadowMapEnabled = true
    renderer.setClearColor(0xFFFFFF)
    renderer.setSize(window.innerWidth, window.innerHeight)

    var loader = new THREE.TextureLoader()
    loader.load('assets/tennis_court_grass.jpg', function (texture) {
        var cubeGeometry = new THREE.BoxGeometry(TABLE_SIZE.w, TABLE_SIZE.h, TABLE_SIZE.d)
        var textureFace = new THREE.MeshLambertMaterial({})
        textureFace.map = texture
        var materials = [
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            textureFace,
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
        ]
        cube = new THREE.Mesh(cubeGeometry, materials)
        cube.position.set(0, 0, 0)
        cube.castShadow = true
        cube.receiveShadow = true
        scene.add(cube)
        // console.log('cube', cube)
        // console.log(cube)
    })
    var positions = [[-1, 1], [1, 1], [1, -1], [-1, -1]]
    var tableLegs = new THREE.Group()
    positions.forEach(position => {
        var tableLeg = new THREE.Mesh(
            new THREE.BoxGeometry(8, 30, 8),
            new THREE.MeshLambertMaterial({ color: 0x352421 }))
        tableLeg.castShadow = true
        tableLeg.position.set(TABLE_LEG_POS.x * position[0], TABLE_LEG_POS.y, TABLE_LEG_POS.z * position[1])
        tableLegs.add(tableLeg)
        scene.add(tableLeg)
    })

    createBorder()
    var light = new THREE.AmbientLight(0x111111, 0.2)
    scene.add(light)

    var dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.color.setHSL(0.1, 1, 0.95)
    dirLight.position.set(-1, 1.75, 1)
    dirLight.position.multiplyScalar(30)
    dirLight.castShadow = true
    scene.add(dirLight)

    var dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight2.color.setHSL(0.1, 1, 0.95)
    dirLight2.position.set(1, 1.75, 1)
    dirLight2.position.multiplyScalar(30)
    dirLight2.castShadow = true
    scene.add(dirLight2)

    camera.position.x = 0
    camera.position.y = 80
    camera.position.z = 100
    camera.lookAt(scene.position)

    document.getElementById('WebGL-output').appendChild(renderer.domElement)

    render()
}

function render() {
    requestAnimationFrame(render)
    //rotateField()
    renderer.render(scene, camera)
}

function createBorder() {
    var smaller = new THREE.Mesh(
        new THREE.BoxGeometry(TABLE_SIZE.w, TABLE_SIZE.h + 4, TABLE_SIZE.d),
        new THREE.MeshLambertMaterial({ color: 0x542a07 }))

    var bigger = new THREE.Mesh(
        new THREE.BoxGeometry(TABLE_SIZE.w + 5, TABLE_SIZE.h + 4, TABLE_SIZE.d + 5),
        new THREE.MeshLambertMaterial({ color: 0x542a07 }))

    var biggerBSP = new ThreeBSP(bigger)
    var cubeBSP = new ThreeBSP(smaller)
    var resultBSP = biggerBSP.subtract(cubeBSP)
    outer = resultBSP.toMesh()
    outer.position.set(0, 2, 0)
    outer.material = new THREE.MeshLambertMaterial({ color: 0x565243 })
    outer.geometry.computeFaceNormals()
    outer.geometry.computeVertexNormals()
    scene.add(outer)
    console.log(outer)
}

function rotateField() {
    if (!cube) {
        return;
    }
    var SPEED = 0.004
    //dice.rotation.x -= SPEED * 2;
    cube.rotation.y -= SPEED;
    // cube.rotation.z -= SPEED * 3;
}
window.onload = init