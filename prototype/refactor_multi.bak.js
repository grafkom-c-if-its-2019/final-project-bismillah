// import * as THREE from '../node_modules/three'

const TABLE_SIZE = { w: 120, h: 8, d: 60 }
const TABLE_LEG_POS = { x: 50, y: -15, z: 20 }
var socket = io()

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

function Player(id) {
    this.id = id
    this.score = 0
    this.racket = undefined
}

Player.prototype.createRaket = function () {
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
        })
    })
}

function GameWorld(id) {
    this.id = id
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.x = 0
    this.camera.position.y = 60
    this.camera.position.z = 100

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    // this.renderer.vr.enabled = true
    // document.body.appendChild(WEBVR.createButton(this.renderer))

    this.referee = new THREE.Group()
    this.skyBox = new THREE.Group()
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

GameWorld.prototype.createReferee = function () {
    //kepala wasit
    let headMaterial = [
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_top.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/head_back.jpg')
        })
    ]
    let refHead = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 15), headMaterial)
    refHead.name = 'refHead'
    refHead.position.set(0, 30, -60)
    refHead.castShadow = true
    refHead.lookAt(this.bola.position)
    this.referee.add(refHead)

    //badan wasit
    let bodyMaterial = [
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_top.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/body_back.jpg')
        })
    ]
    let refBody = new THREE.Mesh(new THREE.BoxGeometry(35, 25, 5), bodyMaterial)
    refBody.name = 'refBody'
    refBody.position.set(0, 10, -60)
    refBody.castShadow = true
    this.referee.add(refBody)

    //kaki wasit
    let legMaterial = [
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_right.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_left.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_bottom.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_front.jpg')
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/leg_back.jpg')
        })
    ]
    let refLeg = new THREE.Mesh(new THREE.BoxGeometry(15, 25, 5), legMaterial)
    refLeg.name = 'refLeg'
    refLeg.position.set(0, -15, -60)
    refLeg.castShadow = true
    this.referee.add(refLeg)

    this.scene.add(this.referee)
}

GameWorld.prototype.createSkyBox = function () {
    let skyBoxMaterials = [
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/posx.jpg'), side: THREE.DoubleSide
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/negx.jpg'), side: THREE.DoubleSide
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/posy.jpg'), side: THREE.DoubleSide
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/negy.jpg'), side: THREE.DoubleSide
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/posz.jpg'),side: THREE.DoubleSide
        }),
        new THREE.MeshLambertMaterial({
            map: new THREE.TextureLoader().load('assets/textures/cubemap/parliament/negz.jpg'), side: THREE.DoubleSide
        })
    ]
    let skyBoxMaterial = new THREE.Mesh(new THREE.BoxGeometry(300, 300, 300), skyBoxMaterials)
    skyBoxMaterial.position.set(0, 120, 0)
    skyBoxMaterial.name = 'skyBoxMaterial'
    this.skyBox.add(skyBoxMaterial)
    this.scene.add(this.skyBox)
}

GameWorld.prototype.createPlayers = function () {
    [1, -1].forEach(id => {
        let player = new Player(id)
        player.createRaket()
        this.scene.add(player.racket)
        this.players.push(player)
    })
}

GameWorld.prototype.initWorld = function () {
    this.createSetMeja()
    this.createLighting()
    this.createSkyBox()
    this.createReferee()
    this.createPlayers()
}

GameWorld.prototype.animate = function () {

}

GameWorld.prototype.render = function () {
    requestAnimationFrame(this.render.bind(this))
    this.players.forEach(player => {
        this.scene.remove(player.racket)
        this.scene.add(player.racket)
    })
    balls()
    handle_racket()
    this.renderer.render(this.scene, this.camera)
}

var temp

window.onload = function () {
    temp = new GameWorld(1)
    temp.initWorld()
    temp.render()
    console.log(temp)
    // let a = new Player(-1)
    // a.createRaket()
    // console.log(a.racket == undefined)
    // console.log(a)
}

var pressed_key = {
    'player_0_up' : false,
    'player_0_down' : false,
    'player_1_up' : false,
    'player_1_down' : false
}

function handle_keydown(event) {
    var key_code = event.which
    socket.emit('keydown', key_code)
    // if (key_code == 38) {
    //     pressed_key.player_0_up = true
    // }
    // else if (key_code == 40) {
    //     pressed_key.player_0_down = true
    // }
    // else if (key_code == 83) {
    //     pressed_key.player_1_down = true
    // }
    // else if (key_code == 87) {
    //     pressed_key.player_1_up = true
    // }
}

function handle_keyup(event) {
    var key_code = event.which
    socket.emit('keyup', key_code)
    // if (key_code == 38) {
    //     pressed_key.player_0_up = false
    // }
    // else if (key_code == 40) {
    //     pressed_key.player_0_down = false
    // }
    // else if (key_code == 83) {
    //     pressed_key.player_1_down = false
    // }
    // else if (key_code == 87) {
    //     pressed_key.player_1_up = false
    // }
}

socket.on('keydown', function(data) {
    var player_id = data.player_id
    var key_code = data.key_code
    if (player_id == 0) {
        if (key_code == 38) {
            pressed_key.player_0_up = true
        }
        else if (key_code == 40) {
            pressed_key.player_0_down = true
        }
    }
    else if (player_id == 1) {
        if (key_code == 38) {
            pressed_key.player_1_up = true
        }
        else if (key_code == 40) {
            pressed_key.player_1_down = true
        }
    }
})

socket.on('keyup', function(data) {
    var player_id = data.player_id
    var key_code = data.key_code
    if (player_id == 0) {
        if (key_code == 38) {
            pressed_key.player_0_up = false
        }
        else if (key_code == 40) {
            pressed_key.player_0_down = false
        }
    }
    else if (player_id == 1) {
        if (key_code == 38) {
            pressed_key.player_1_up = false
        }
        else if (key_code == 40) {
            pressed_key.player_1_down = false
        }
    }
})

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

document.addEventListener("keydown", handle_keydown, false);
document.addEventListener("keyup", handle_keyup, false)

function balls() {
    if (temp.restart == true) {
        var initial_ball_angle = (((Math.random()-0.5)*2)*360)*(Math.PI/180)
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
        if (temp.bola.position.z >= temp.players[0].racket.position.z-10 && temp.bola.position.z <= temp.players[0].racket.position.z+10) {
            temp.bolaVelocity.x *= -1.05
        }
        else {
            temp.restart = true
            temp.players[1].score += 1
        }
    }
    else if (temp.bola.position.x <= -50) {
        if (temp.bola.position.z >= temp.players[1].racket.position.z-10 && temp.bola.position.z <= temp.players[1].racket.position.z+10) {
            temp.bolaVelocity.x *= -1.05
        }
        else {
            temp.restart = true
            temp.players[0].score += 1
        }
    }

    //mindah kepala wasit
    temp.referee.children[0].lookAt(temp.bola.position)
}