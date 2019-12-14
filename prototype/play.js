// import * as THREE from '../node_modules/three'

const TABLE_SIZE = { w: 120, h: 8, d: 60 }
const TABLE_LEG_POS = { x: 50, y: -15, z: 20 }

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
    this.scoreMesh = undefined
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
    let mtlLoader = new THREE.MTLLoader()
    mtlLoader.load('assets/raket_red.mtl', materials => {
        materials.preload()
        let objLoader = new THREE.OBJLoader()
        objLoader.setMaterials(materials)
        objLoader.load('assets/raket_red.obj', obj => {
            obj.children.forEach(element => {
                element.geometry.center()
                element.geometry.computeBoundingBox()
            })
            obj.scale.x = 8
            obj.scale.y = 10
            obj.scale.z = 8
            obj.children.forEach(element => {
                element.geometry.computeFaceNormals()
                element.geometry.computeVertexNormals()
                element.geometry.computeBoundingBox()
            })
            obj.rotation.y = -0.5 * Math.PI
            obj.position.y = 8
            obj.position.z = 0
            obj.position.x = this.id * 55
            obj.castShadow = true
            this.racket = obj
            this.racket.children[0].material.shininess = 10
            callback(this.racket)
        })
    })
}


function GameWorld(id) {
    this.id = id
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.x = 0
    this.camera.position.y = 200
    this.camera.position.z = 0

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.mejaGroup = new THREE.Group()
    this.players = []

    this.bola = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshPhongMaterial({ color: 0x0000FF }))
    this.bola.castShadow = false
    this.bola.position.set(0, 6, 0)
    this.scene.add(this.bola)
    this.bolaVelocity = new THREE.Vector3()
    this.restart = true

    this.camera.lookAt(this.scene.position)
    document.getElementById('WebGL-output').appendChild(this.renderer.domElement)
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
    loader.load('assets/tennis_court_grass.jpg', (texture) => {
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

    // buat kaki meja
    let positions = [[-1, 1], [1, 1], [1, -1], [-1, -1]]
    positions.forEach(position => {
        let tableLeg = new THREE.Mesh(
            new THREE.BoxGeometry(8, 30, 8),
            new THREE.MeshLambertMaterial({ color: 0x352421 }))
        tableLeg.castShadow = true
        tableLeg.position.set(TABLE_LEG_POS.x * position[0], TABLE_LEG_POS.y, TABLE_LEG_POS.z * position[1])
        tableLeg.name = `kakiMeja${position[0]}${position[1]}`
        this.mejaGroup.add(tableLeg)
    })
    this.scene.add(this.mejaGroup)
}


GameWorld.prototype.createPlayers = function () {
    [1, -1].forEach(id => {
        let player = new Player(id)
        player.createRaket((racket) => {
            this.scene.add(racket)
        })
        player.setScoreMesh(this.scene)
        this.players.push(player)
    })
}

GameWorld.prototype.initWorld = function () {
    this.createSetMeja()
    this.createLighting()
    this.createPlayers()
}

GameWorld.prototype.animate = function () {

}

GameWorld.prototype.render = function () {
    requestAnimationFrame(this.render.bind(this))
    balls()
    handle_racket()
    handle_env_status()
    this.renderer.render(this.scene, this.camera)
}

var temp

window.onload = function () {
    temp = new GameWorld(1)
    temp.initWorld()
    temp.render()
    console.log(temp)
}

var pressed_key = {
    'player_0_up': false,
    'player_0_down': false,
    'player_1_up': false,
    'player_1_down': false,
    'change_env': false
}

function handle_keydown(event) {
    var key_code = event.which
    if (key_code == 38) {
        pressed_key.player_0_up = true
    }
    else if (key_code == 40) {
        pressed_key.player_0_down = true
    }
    else if (key_code == 83) {
        pressed_key.player_1_down = true
    }
    else if (key_code == 87) {
        pressed_key.player_1_up = true
    }
    else if (key_code == 32) {
        pressed_key.change_env = true
    }
}

function handle_keyup(event) {
    var key_code = event.which
    if (key_code == 38) {
        pressed_key.player_0_up = false
    }
    else if (key_code == 40) {
        pressed_key.player_0_down = false
    }
    else if (key_code == 83) {
        pressed_key.player_1_down = false
    }
    else if (key_code == 87) {
        pressed_key.player_1_up = false
    }
}

var env_status = 1

function handle_racket() {
    var speed = 1
    if (pressed_key.player_0_up == true && temp.players[0].racket.position.z >= -22) {
        temp.players[0].racket.position.z -= speed
    }
    if (pressed_key.player_0_down == true && temp.players[0].racket.position.z <= 22) {
        temp.players[0].racket.position.z += speed
    }
    if (pressed_key.player_1_up == true && temp.players[1].racket.position.z >= -22) {
        temp.players[1].racket.position.z -= speed
    }
    if (pressed_key.player_1_down == true && temp.players[1].racket.position.z <= 22) {
        temp.players[1].racket.position.z += speed
    }
}

function handle_env_status() 
{
    if (pressed_key.change_env == true) {
        if (env_status == 3) {
            env_status = 1
        }
        else {
            env_status += 1
        }
        pressed_key.change_env = false
    }
}

document.addEventListener("keydown", handle_keydown, false);
document.addEventListener("keyup", handle_keyup, false)

var bounce = new Audio('assets/sound/Ping_Pong_Ball_Hit.mp3');
var buzz = new Audio('assets/sound/buzz.mp3');

function balls() {
    if (temp.restart == true) {
        var initial_ball_angle = (((Math.random() - 0.5) * 2) * 360) * (Math.PI / 180)
        temp.bolaVelocity.x = Math.cos(initial_ball_angle)
        temp.bolaVelocity.z = Math.sin(initial_ball_angle)
        temp.bola.position.x = 0
        temp.bola.position.z = 0
        temp.restart = false
    }
    temp.bola.position.x += temp.bolaVelocity.x
    temp.bola.position.z += temp.bolaVelocity.z

    //cek apakah bola nabrak tepi, kalau iya pantulkan
    if (temp.bola.position.z >= 25 || temp.bola.position.z <= -25) {
        temp.bolaVelocity.z *= -1
    }

    //cek gol dan raket
    if (temp.bola.position.x >= 50) {
        if (temp.bola.position.z >= temp.players[0].racket.position.z - 10 && temp.bola.position.z <= temp.players[0].racket.position.z + 10) {
            temp.bolaVelocity.x *= -1.05
            bounce.pause();
            bounce.currentTime = 0;
            bounce.play();
        }
        else {
            buzz.pause();
            buzz.currentTime = 0;
            buzz.play();
            temp.restart = true
            temp.players[1].score += 1
            temp.players[1].setScoreMesh(temp.scene)
        }
    }
    else if (temp.bola.position.x <= -50) {
        if (temp.bola.position.z >= temp.players[1].racket.position.z - 10 && temp.bola.position.z <= temp.players[1].racket.position.z + 10) {
            temp.bolaVelocity.x *= -1.05
            bounce.pause();
            bounce.currentTime = 0;
            bounce.play();
        }
        else {
            buzz.pause();
            buzz.currentTime = 0;
            buzz.play();
            temp.restart = true
            temp.players[0].score += 1
            temp.players[0].setScoreMesh(temp.scene)
        }
    }
}