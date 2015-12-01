var quickLoader = require('quick-loader');
var dat = require('dat-gui');
var Stats = require('stats.js');
var css = require('dom-css');
var raf = require('raf');

var THREE = require('three');

var OrbitControls = require('./controls/OrbitControls');
var settings = require('./core/settings');

var head = require('./3d/head');
var ground = require('./3d/ground');
var vignette = require('./3d/vignette');
var lights = require('./3d/lights');
var fbo = require('./3d/fbo');

var math = require('./utils/math');
var ease = require('./utils/ease');
var mobile = require('./fallback/mobile');

var undef;
var _gui;
var _stats;

var _width = 0;
var _height = 0;

var _control;
var _camera;
var _scene;
var _renderer;
var _mouseMesh;

var _renderingGui;
var _similuationGui;
var _envGui;

var _time = 0;
var _ray = new THREE.Ray();

var _initAnimation = 0;
var _hasSetDefault = false;

var _logo;
var _footerItems;

var EPS = 0.00001;

function init() {

    if(settings.useStats) {
        _stats = new Stats();
        css(_stats.domElement, {
            position : 'absolute',
            left : '0px',
            top : '0px',
            zIndex : 2048
        });

        document.body.appendChild( _stats.domElement );
    }

    settings.mouse = new THREE.Vector2(-9999,0);
    settings.mouse3d = _ray.origin;

    _renderer = new THREE.WebGLRenderer({
        // antialias : true
    });
    _renderer.setClearColor(0x444444);
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.shadowMap.enabled = true;
    document.body.appendChild(_renderer.domElement);

    _scene = new THREE.Scene();
    _scene.fog = new THREE.FogExp2( 0x444444, 0.001 );

    _camera = new THREE.PerspectiveCamera( 45, 1, 200, 3000);
    _camera.position.set(134, 5, 800).normalize().multiplyScalar(1500);
    settings.cameraPosition = _camera.position;

    _control = new OrbitControls( _camera, _renderer.domElement );
    // _control.minDistance = 600;
    _control.maxDistance = 1500;
    _control.minPolarAngle = 0.3;
    _control.maxPolarAngle = Math.PI / 2;
    _control.noPan = true;
    _control.update();

    lights.init();
    _scene.add(lights.mesh);

    var envMap = settings.envMap = (new THREE.TextureLoader()).load('images/env.jpg');
    envMap.format = THREE.RGBFormat;
    envMap.wrapS = envMap.wrapT = THREE.MirroredRepeatWrapping;
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.magFilter = THREE.LinearFilter;
    envMap.minFilter = THREE.LinearMipMapLinearFilter;

    head.init();
    _scene.add(head.mesh);

    fbo.init(_renderer);

    ground.init();
    _scene.add(ground.mesh);

    vignette.init();
    _scene.add(vignette.mesh);

    var mouseGeometry = new THREE.IcosahedronGeometry(1, 3);
    _mouseMesh = new THREE.Mesh(mouseGeometry, new THREE.MeshPhongMaterial({
        side: THREE.BackSide,
        color: 0x999999,
        specular: 0x444444,
        shininess: 20,
        envMap: envMap,
        transparent: true,
        opacity: 0.3
    }));
    _mouseMesh.add(new THREE.Mesh(mouseGeometry, new THREE.MeshPhongMaterial({
        transparent: true,
        color: 0x999999,
        specular: 0x444444,
        shininess: 20,
        envMap: envMap,
        opacity: 0.05
    })));


    _scene.add(_mouseMesh);

    var guiFunctions = {
        resetParticles : _resetParticles
    };

    _gui = new dat.GUI();
    _renderingGui = _gui.addFolder('rendering');
    _renderingGui.add(head, 'normalNoise', 0, 1, 0.001);
    _renderingGui.add(head, 'useDiffuse').name('diffuse map');
    _renderingGui.add(head, 'useEnv').name('env map');
    _similuationGui = _gui.addFolder('similuation');
    _similuationGui.add(settings, 'isMouseVisible').name('mouse');
    _similuationGui.add(fbo.velocityUniforms.mouseRadius, 'value', 50, 300).name('mouse radius').listen();
    _similuationGui.add(fbo.velocityUniforms.mouseForce, 'value', 0.01, 0.5).name('mouse force');
    _similuationGui.add(settings, 'mouseZRatio', 0.8, 1.2).name('mouse z ratio');
    _similuationGui.add(fbo.velocityUniforms.gravity, 'value', -1, 1).name('gravity');
    _similuationGui.add(settings, 'gravityAllOnClick').name('destory on click').listen();
    _envGui = _gui.addFolder('env');
    _envGui.add(vignette.mesh, 'visible').name('vignette');
    _envGui.add(_mouseMesh, 'visible').name('mouse visibility');
    _gui.add(guiFunctions, 'resetParticles');

    if(window.screen.width > 480) {
        _renderingGui.open();
        _similuationGui.open();
        _envGui.open();
    }

    _logo = document.querySelector('.logo');
    document.querySelector('.footer').style.display = 'block';
    _footerItems = document.querySelectorAll('.footer span');

    _gui.domElement.addEventListener('mousedown', _stopPropagation);
    // _gui.domElement.addEventListener('mousemove', _stopPropagation);
    _gui.domElement.addEventListener('touchstart', _stopPropagation);
    // _gui.domElement.addEventListener('touchmove', _stopPropagation);

    window.addEventListener('resize', _onResize);
    window.addEventListener('mousedown', _onDown);
    window.addEventListener('mousemove', _onMove);
    // window.addEventListener('mouseup', _onUp);
    window.addEventListener('touchstart', _bindTouch(_onDown));
    window.addEventListener('touchmove', _bindTouch(_onMove));
    // window.addEventListener('touchend', _onUp);

    _time = Date.now();
    _onResize();
    _loop();

}

function _stopPropagation(evt) {
    evt.stopPropagation();
}

function _bindTouch(func) {
    return function (evt) {
        func(evt.changedTouches[0]);
    };
}

function _onDown(evt) {
    settings.isMouseActive = true;
    if(settings.gravityAllOnClick) {
        settings.isPhysicsActive = true;
    }
    _onMove(evt);
}

function _onMove(evt) {
    settings.mouse.x = (evt.pageX / _width) * 2 - 1;
    settings.mouse.y = -(evt.pageY / _height) * 2 + 1;
}

function _onResize() {
    _width = window.innerWidth;
    _height = window.innerHeight;

    vignette.resize(_width, _height);

    _camera.aspect = _width / _height;
    _camera.updateProjectionMatrix();
    _renderer.setSize(_width, _height);

}

function _loop() {
    var newTime = Date.now();
    raf(_loop);
    if(settings.useStats) _stats.begin();
    _render(newTime - _time);
    if(settings.useStats) _stats.end();
    _time = newTime;
}

function _resetParticles() {
    settings.resetAnimation = EPS;
    settings.isMouseActive = false;
    settings.isPhysicsActive = false;
}

function _setDefault() {
    _hasSetDefault = true;
    _resetParticles();
    settings.gravityAllOnClick = false;
    settings.isPhysicsActive = false;
}

function _render(dt) {

    var ratio, ratio2, ratio3;
    _initAnimation = Math.min(_initAnimation + dt * 0.00015, 1);

    vignette.alphaUniform.value = math.lerp(0.7, 0.3, math.unLerp(0, 0.5, _initAnimation));

    _control.maxDistance = _initAnimation === 1 ? 1500 : math.lerp(1500, 700, ease.easeOutSine(_initAnimation));
    if(_initAnimation < 1) {
        _control.object.position.y = math.lerp(800, 5, ease.easeOutSine(_initAnimation));
    }
    _control.update();

    // update mouse3d
    _camera.updateMatrixWorld();
    _ray.origin.setFromMatrixPosition( _camera.matrixWorld );
    _ray.direction.set( settings.mouse.x, settings.mouse.y, 0.5 ).unproject( _camera ).sub( _ray.origin ).normalize();
    var distance = _ray.origin.length() / Math.cos(Math.PI - _ray.direction.angleTo(_ray.origin));
    _ray.origin.add( _ray.direction.multiplyScalar(distance * settings.mouseZRatio));

    if(_initAnimation < 1) {
        ratio = ease.easeInOutBack(math.unLerp(0, 0.4, _initAnimation));
        ratio2 = math.unLerp(0.3, 0.9, _initAnimation);
        ratio3 = ease.easeOutSine(math.unLerp(0.7, 1, _initAnimation));
        _ray.origin.x = math.lerp(Math.sin(ratio2 * Math.PI * 4) * 150, _ray.origin.x, ratio3);
        _ray.origin.y = math.lerp((1 - ratio) * 400 + Math.sin(ratio2 * Math.PI * 5) * 150, _ray.origin.y, ratio3);
        _ray.origin.z = math.lerp(Math.sin(ratio2 * Math.PI * 6) * 150, _ray.origin.z, ratio3);
        fbo.velocityUniforms.mouseRadius.value = (1 - ratio) * 60 + Math.sin(ratio2 * Math.PI * 6) * 90 * ratio3 + 105;
    } else {
        if(!_hasSetDefault) {
            _setDefault();
        }
    }

    ratio = Math.min((1 - Math.abs(_initAnimation - 0.5) * 2) * 1.2, 1);
    var blur = (1 - ratio) * 10;
    _logo.style.display = ratio ? 'block' : 'none';
    if(ratio) {
        _logo.style.opacity = ratio;
        _logo.style.webkitFilter = 'blur(' + blur + 'px)';
        ratio = (0.8 + Math.pow(_initAnimation, 1.5) * 0.3);
        if(_width < 580) ratio *= 0.5;
        _logo.style.transform = 'scale3d(' + ratio + ',' + ratio + ',1)';
    }

    for(var i = 0, len = _footerItems.length; i < len; i++) {
        ratio = math.unLerp(0.5 + i * 0.01, 0.6 + i * 0.01, _initAnimation);
        _footerItems[i].style.transform = 'translate3d(0,' + ((1 - Math.pow(ratio, 3)) * 50) + 'px,0)';
    }

    if(settings.resetAnimation > 0) {
        settings.resetAnimation += dt * 0.0005;
    }
    fbo.update(dt);

    if(settings.resetAnimation > 1) {
        settings.resetAnimation = 0;
    }

    head.update(dt);

    vignette.alphaUniform.value = 0.5;
    vignette.update(dt);

    // console.log(_camera.position.x, _camera.position.y, _camera.position.z);
    var mouseRadius = fbo.velocityUniforms.mouseRadius.value;
    _mouseMesh.scale.set(mouseRadius, mouseRadius, mouseRadius);
    _mouseMesh.position.copy(_ray.origin);

    _renderer.render(_scene, _camera);
}

mobile.pass(function() {
    // quickLoader.add('images/env.jpg', {
    //     onLoad: function(img) {
    //         settings.envMapImg = img;
    //     }
    // });
    // quickLoader.add('images/diffuse.jpg', {
    //     onLoad: function(img) {
    //         settings.diffuseMapImg = img;
    //     }
    // });

    quickLoader.add('models/LeePerrySmith.json', {
        onLoad: function(data) {
            settings.headData = data;
        }
    });
    quickLoader.start(function(percent) {
        if(percent === 1) {
            init();
        }
    });
});
