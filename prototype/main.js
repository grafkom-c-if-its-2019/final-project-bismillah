// import '*' as THREE from '../node_modules/three'
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

    // var plane = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshLambertMaterial({ color: 0x555555, side: THREE.DoubleSide }))
    // plane.rotateX(-0.5 * Math.PI)
    // plane.position.set(0, -35, 0)
    // plane.receiveShadow = true
    // scene.add(plane)

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
    createNaruto()
    createRaket(55, 22)
    createRaket(-55, -22)
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

function createRaket(posx, posz) {
    var mtlLoader = new THREE.MTLLoader()
    mtlLoader.load("assets/raket_red.mtl", function (materials) {
        // console.log('mtl', materials)
        materials.preload()
        var objLoader = new THREE.OBJLoader()
        objLoader.setMaterials(materials)

        objLoader.load("assets/raket_red.obj", function (obj) {
            obj.children.forEach(element => {
                element.geometry.center()
                // console.log('element', element)
                element.geometry.computeBoundingBox()
                // console.log('element befor', element.geometry.boundingBox)
            });
            obj.scale.x = 8
            obj.scale.y = 10
            obj.scale.z = 8
            obj.children.forEach(element => {
                element.geometry.computeFaceNormals()
                element.geometry.computeVertexNormals()
                element.geometry.computeBoundingBox()
            });
            obj.rotation.y = -0.5 * Math.PI
            obj.position.y = 8
            obj.position.z = posz
            obj.position.x = posx
            obj.castShadow = true
            scene.add(obj)
        })
    })
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

function createNaruto() {
    var head_materials = [
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_top.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/head_back.jpg')
        })
    ];
    head_materials = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 15), head_materials);
    head_materials.position.set(0, 30, -60)
    head_materials.castShadow = true
    scene.add(head_materials);

    var body_materials = [
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_top.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/body_back.jpg')
        })
    ];
    body_materials = new THREE.Mesh(new THREE.BoxGeometry(35, 25, 5), body_materials);
    body_materials.position.set(0, 10, -60)
    body_materials.castShadow = true
    scene.add(body_materials);

    var leg_materials = [
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_top.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture('assets/leg_back.jpg')
        })
    ];
    leg_materials = new THREE.Mesh(new THREE.BoxGeometry(15, 25, 5), leg_materials);
    leg_materials.position.set(0, -15, -60)
    leg_materials.castShadow = true
    scene.add(leg_materials);
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