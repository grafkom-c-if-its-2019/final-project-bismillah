const TABLE_SIZE = { w: 120, h: 8, d: 60 }
const TABLE_LEG_POS = { x: 50, y: -15, z: 20 }


// import { OrbitControls } from './libs/OrbitControls.js';

function promisifyLoader(loader, onProgress) {
    function promiseLoader(url) {
        return new Promise((resolve, reject) => {
            loader.load(url, resolve, onProgress, reject);
        })
    }
    return {
        originalLoader: loader,
        load: promiseLoader,
    }
}

var font
function loadFont() {
    let loader = new THREE.FontLoader()
    loader.load('assets/fonts/helvetiker_bold.typeface.json', loaded => {
        font = loaded
    })
}
loadFont()

function Player(id) {
    this.id = id
    this.score = 0
    this.racket = undefined
    // this.scoreMesh = undefined
}

Player.prototype.setScoreMesh = function (scene) {
    let material = new THREE.MeshLambertMaterial({ color: 0xffffff })
    let scoreStr = this.score.toString()

    let textGeom = new THREE.TextGeometry(scoreStr, {
        font: font,
        size: 10,
        height: 2,
        bevelEnabled: false,
    })
    let scoreMesh = new THREE.Mesh(textGeom, material)
    scoreMesh.position.x = this.id * 55
    scoreMesh.position.y = 30
    try {
        scene.remove(this.scoreMesh)
    } catch (error) {

    }
    this.scoreMesh = scoreMesh
    scene.add(this.scoreMesh)
}

Player.prototype.createRaket = function (callback) {
    this.racket = new THREE.Mesh(new THREE.CylinderGeometry(1,1,20,32), new THREE.MeshPhongMaterial({color: 0x6977d8}))
    this.racket.position.set(60,10,0);
    this.racket.rotation.z = -20
    this.racket.rotation.x = 0
    callback(this.racket)
}

function GameWorld(id) {
    this.id = id
    this.scene = new THREE.Scene()
   
    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
    this.camera.position.set( 85, 100, 65 );
    //400, 200,0  default view
    //85, 100,65   dramatic view
    // this.camera.position.x = 0
    // // this.camera.position.y = 200
    // // this.camera.position.z = 0
    // this.camera.position.y = 60
    // this.camera.position.z = 130
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.mejaGroup = new THREE.Group()
    this.players = []

    var loader = new THREE.CubeTextureLoader();
    loader.setPath('assets/textures/');
    var textureCube = loader.load(['sideX.jpg','sideX.jpg','sideY.jpg','sideY.jpg','sideZ.jpg','sideZ.jpg']);

    this.block1 = new THREE.Mesh(new THREE.BoxGeometry(5,5,20), new THREE.MeshPhongMaterial({color: 0xffffff, envMap: textureCube}))
    this.block1.position.set(-20,6,0);
    this.scene.add(this.block1);

    this.block2 = new THREE.Mesh(new THREE.BoxGeometry(5,5,20), new THREE.MeshPhongMaterial({color: 0xffffff, envMap: textureCube}))
    this.block2.position.set(20,6,0);
    this.scene.add(this.block2);

    this.hole = new THREE.Mesh(new THREE.CylinderGeometry(3,3,1,32), new THREE.MeshPhongMaterial({color: 0x000000}))
    this.hole.position.set(-40,4,0);
    this.scene.add(this.hole);

    this.bola = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshPhongMaterial({ color: 0xffffff }))
    this.bola.castShadow = false
    this.bola.position.set(49, 6, 0)

    this.scene.add(this.bola)
    this.bolaVelocity = new THREE.Vector3()
    this.restart = true

    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

    this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    this.controls.dampingFactor = 0.05;

    this.controls.screenSpacePanning = false;

    this.controls.minDistance = 100;
    this.controls.maxDistance = 500;

    this.controls.maxPolarAngle = Math.PI / 2;

    this.camera.lookAt(this.scene.position)
    document.getElementById('WebGL-output')
            .appendChild(this.renderer.domElement)
}



GameWorld.prototype.createLighting = function () {
    let light = new THREE.AmbientLight(0x111111, 0.2)
    this.scene.add(light)

    let dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.color.setHSL(0.1, 1, 0.95)
    dirLight.position.set(-1, 1.75, 1)
    dirLight.position.multiplyScalar(30)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    let dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight2.color.setHSL(0.1, 1, 0.95)
    dirLight2.position.set(1, 1.75, 1)
    dirLight2.position.multiplyScalar(30)
    dirLight2.castShadow = true
    this.scene.add(dirLight2)

    let poinlight = new THREE.PointLight(0xffffff, 0.8, 600, 2)
    poinlight.position.set(0, 0, 0)
    this.scene.add(poinlight)
}

GameWorld.prototype.createSetMeja = function () {
    // buat bagian meja utama (ada map lapangan)
    let loader = new THREE.TextureLoader()
    loader.load('assets/golf.jpg', (texture) => {
        let mainMejaGeom = new THREE.BoxGeometry(TABLE_SIZE.w, TABLE_SIZE.h, TABLE_SIZE.d)
        let textureFace = new THREE.MeshLambertMaterial({})
        textureFace.map = texture
        let materials = [
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            textureFace,
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
            new THREE.MeshLambertMaterial({ color: 0x565243 }),
        ]
        let meja = new THREE.Mesh(mainMejaGeom, materials)
        meja.position.set(0, 0, 0)
        meja.castShadow = true
        meja.receiveShadow = true
        meja.name = 'mejaUtama'
        this.mejaGroup.add(meja)
    })

    // buat tepian meja
    let smaller = new THREE.Mesh(
        new THREE.BoxGeometry(TABLE_SIZE.w, TABLE_SIZE.h + 4, TABLE_SIZE.d),
        new THREE.MeshLambertMaterial({ color: 0x542a07 }))

    let bigger = new THREE.Mesh(
        new THREE.BoxGeometry(TABLE_SIZE.w + 5, TABLE_SIZE.h + 4, TABLE_SIZE.d + 5),
        new THREE.MeshLambertMaterial({ color: 0x542a07 }))

    let biggerBSP = new ThreeBSP(bigger)
    let cubeBSP = new ThreeBSP(smaller)
    let resultBSP = biggerBSP.subtract(cubeBSP)
    let border = resultBSP.toMesh()
    border.position.set(0, 2, 0)
    border.material = new THREE.MeshLambertMaterial({ color: 0x565243 })
    border.geometry.computeFaceNormals()
    border.geometry.computeVertexNormals()
    border.name = 'tepianMeja'
    this.mejaGroup.add(border)

    this.scene.add(this.mejaGroup)
}

GameWorld.prototype.createPlayers = function () {
    [1].forEach(id => {
        // let player = new Player(id)
        let player = new Player(id)
        player.createRaket((racket) => {
            this.scene.add(racket)
        })
        // player.setScoreMesh(this.scene)
        this.players.push(player)
    })
}

GameWorld.prototype.initWorld = function () {
    this.createSetMeja()
    this.createLighting()
    this.createPlayers()
}

GameWorld.prototype.animate = function () {
    requestAnimationFrame( animate );

    this.controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    this.renderer.render( this.scene, this.camera );
    //render();
}

GameWorld.prototype.render = function () {
    requestAnimationFrame(this.render.bind(this))
    balls()
    this.renderer.render(this.scene, this.camera)
}

var temp

window.onload = function () {
    temp = new GameWorld(1)
    temp.initWorld()
    temp.render()
    // console.log(temp)
}

var pressed_key = {
    'player_1_up': false,
    'player_1_down': false,
    'change_env': false
}

function handle_keydown(event) {
    var key_code = event.which
    if (key_code == 32) {
        if(temp.isStart == false){
            temp.isStart = true
        }
        else{
            temp.isStart = false
        }
    }
    else if (key_code == 82){
        restart()
    }
}

document.addEventListener("keydown", handle_keydown, false);

var bounce = new Audio('assets/sound/Ping_Pong_Ball_Hit.mp3');
var buzz = new Audio('assets/sound/buzz.mp3');

function restart(){
    var initial_ball_angle = (((Math.random() - 0.5) * 2) * 360) * (Math.PI / 180)
    temp.bolaVelocity.x = Math.cos(initial_ball_angle)
    temp.bolaVelocity.z = Math.sin(initial_ball_angle)
    temp.bola.position.x = 49
    temp.bola.position.z = 0
    temp.restart = false
    temp.isStart = false
}


function balls() {
    if (temp.restart == true) {
        restart()
    }

    if(temp.isStart == true){

        temp.bola.position.x += temp.bolaVelocity.x
        temp.bola.position.z += temp.bolaVelocity.z

    }
    else
    {
        var initial_ball_angle = (((Math.random() - 0.5) * 2) * 360) * (Math.PI / 180)
        temp.bolaVelocity.x = Math.cos(initial_ball_angle)
        temp.bolaVelocity.z = Math.sin(initial_ball_angle)
    }

  //pantulan bola ketika nabrak tepi atau penghalang
    if (temp.bola.position.z >= 25 || temp.bola.position.z <= -25) 
    {
        bounce.pause()
        temp.bolaVelocity.z *= -1
        bounce.play()
    }
    if (temp.bola.position.x >= 50 || temp.bola.position.x <= -50) 
    {
        bounce.pause()
        temp.bolaVelocity.x *= -1
        bounce.play()
    }
    if (temp.bola.position.x >= 15.5 && temp.bola.position.x < 24.5)
    {
        if(temp.bola.position.z <= 12 && temp.bola.position.z > 10 || temp.bola.position.z <= -10 && temp.bola.position.z > -12)
        {
            temp.bolaVelocity.z *= -1
        }

        if(temp.bola.position.z <= 10 && temp.bola.position.z >= -10)
        {
            temp.bolaVelocity.x *= -1
        }
    }
    if (temp.bola.position.x >= -24.5 && temp.bola.position.x <= -15.5)
    {
        if(temp.bola.position.z <= 12 && temp.bola.position.z > 10 || temp.bola.position.z <= -10 && temp.bola.position.z > -12)
        {
            temp.bolaVelocity.z *= -1
        }

        if(temp.bola.position.z <= 10 && temp.bola.position.z >= -10)
        {
            temp.bolaVelocity.x *= -1
        }
    }
       //apabila bola masuk ke dalem lobang
    // posisi lobang -40, 6, 0
    if(temp.bola.position.x <= -39 && temp.bola.position.y >=6 && temp.bola.position.z >= 0 && temp.bola.position.z <=  3)
    {
        buzz.pause()
        restart()
        buzz.play()
    }
}