var settings = require('../core/settings');
var THREE = require('three');

var undef;

var glslify = require('glslify');
var shaderParse = require('../helpers/shaderParse');

var _copyShader;
var _velocityShader;
var _positionShader;
var _velocityRenderTarget;
var _velocityRenderTarget2;
var _positionRenderTarget;
var _positionRenderTarget2;

var _renderer;
var _fboMesh;
var _fboScene;
var _fboCamera;

var TEXTURE_WIDTH = exports.TEXTURE_WIDTH = settings.textureWidth;
var TEXTURE_HEIGHT = exports.TEXTURE_HEIGHT = settings.textureHeight;
var AMOUNT = exports.AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

exports.init = init;
exports.update = update;

exports.velocityUniforms = undef;

exports.positionRenderTarget = undef;
var defaultPositionRenderTarget = exports.positionRenderTarget = undef;

function init(renderer) {

    _renderer = renderer;

    var gl = _renderer.getContext();
    if ( !gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) ) {
        alert( 'No support for vertex shader textures!' );
        return;
    }
    if ( !gl.getExtension( 'OES_texture_float' )) {
        alert( 'No OES_texture_float support for float textures!' );
        return;
    }

    _fboScene = new THREE.Scene();
    _fboCamera = new THREE.Camera();
    _fboCamera.position.z = 1;

    _copyShader = new THREE.ShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texture: { type: 't', value: undef }
        },
        vertexShader: shaderParse(glslify('../glsl/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/fboThrough.frag'))
    });

    _velocityShader = new THREE.ShaderMaterial({
        uniforms: exports.velocityUniforms ={
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            mouse3d: { type: 'v3', value: new THREE.Vector3() },
            mouse3dVelocity: { type: 'v3', value: new THREE.Vector3() },
            textureDefaultPosition: { type: 't', value: undef },
            texturePosition: { type: 't', value: undef },
            textureVelocity: { type: 't', value: undef },
            isPhysicsActive: { type: 'f', value: 0 },
            mouseForce: { type: 'f', value: 0.2 },
            mouseRadius: { type: 'f', value: 120 },
            gravity: { type: 'f', value: 0.15 },
            resetAnimation: { type: 'f', value: 0 }
        },
        vertexShader: shaderParse(glslify('../glsl/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/velocity.frag')),
        blending: THREE.NoBlending,
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    _positionShader = new THREE.ShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2( TEXTURE_WIDTH, TEXTURE_HEIGHT ) },
            texturePosition: { type: 't', value: undef },
            textureDefaultPosition: { type: 't', value: undef },
            textureVelocity: { type: 't', value: undef },
            resetAnimation: { type: 'f', value: 0 }
        },
        vertexShader: shaderParse(glslify('../glsl/fbo.vert')),
        fragmentShader: shaderParse(glslify('../glsl/position.frag')),
        blending: THREE.NoBlending,
        transparent: false,
        depthWrite: false,
        depthTest: false
    });

    _fboMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), _copyShader );
    _fboScene.add( _fboMesh );

    _velocityRenderTarget = new THREE.WebGLRenderTarget( TEXTURE_WIDTH, TEXTURE_HEIGHT, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false
    });
    _velocityRenderTarget2 = _velocityRenderTarget.clone();
    _copyTexture(_createVelocityTexture(), _velocityRenderTarget);
    _copyTexture(_velocityRenderTarget, _velocityRenderTarget2);

    _positionRenderTarget = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBFormat,
        type: THREE.FloatType,
        depthWrite: false,
        depthBuffer: false,
        stencilBuffer: false
    });
    _positionRenderTarget2 = _positionRenderTarget.clone();
    defaultPositionRenderTarget = exports.defaultPositionRenderTarget = _positionRenderTarget.clone();

    _copyTexture(_createPositionTexture(), defaultPositionRenderTarget);
    _copyTexture(defaultPositionRenderTarget, _positionRenderTarget);
    _copyTexture(defaultPositionRenderTarget, _positionRenderTarget2);

}

function _updateVelocity(dt) {

    var mouse3dUniformValue = _velocityShader.uniforms.mouse3d.value;
    var mouse3dVelocityUniformValue = _velocityShader.uniforms.mouse3dVelocity.value;
    if(settings.isMouseActive && settings.isMouseVisible) {
        if(mouse3dUniformValue.z < -9000) {
            mouse3dVelocityUniformValue.set(0, 0, 0);
        } else {
            mouse3dVelocityUniformValue.copy(settings.mouse3d).sub(mouse3dUniformValue);
        }
        mouse3dUniformValue.copy(settings.mouse3d);

    } else {
        mouse3dUniformValue.set(0.0, 0.0, -9999);
    }

    _velocityShader.uniforms.isPhysicsActive.value = +settings.isPhysicsActive;

    // swap
    var tmp = _velocityRenderTarget;
    _velocityRenderTarget = _velocityRenderTarget2;
    _velocityRenderTarget2 = tmp;

    _fboMesh.material = _velocityShader;
    _velocityShader.uniforms.textureDefaultPosition.value = defaultPositionRenderTarget;
    _velocityShader.uniforms.textureVelocity.value = _velocityRenderTarget2;
    _velocityShader.uniforms.texturePosition.value = _positionRenderTarget;
    _velocityShader.uniforms.resetAnimation.value = settings.resetAnimation;
    _renderer.render( _fboScene, _fboCamera, _velocityRenderTarget );
}

function _updatePosition(dt) {

    // swap
    var tmp = _positionRenderTarget;
    _positionRenderTarget = _positionRenderTarget2;
    _positionRenderTarget2 = tmp;

    _fboMesh.material = _positionShader;
    _positionShader.uniforms.textureVelocity.value = _velocityRenderTarget;
    _positionShader.uniforms.texturePosition.value = _positionRenderTarget2;
    _positionShader.uniforms.textureDefaultPosition.value = defaultPositionRenderTarget;
    _positionShader.uniforms.resetAnimation.value = settings.resetAnimation;
    _renderer.render( _fboScene, _fboCamera, _positionRenderTarget );
}

function _copyTexture(input, output) {
    _fboMesh.material = _copyShader;
    _copyShader.uniforms.texture.value = input;
    _renderer.render( _fboScene, _fboCamera, output );
}

function _createVelocityTexture() {
    var texture = new THREE.DataTexture( new Float32Array( AMOUNT * 3 ), TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
}


function _createPositionTexture() {
    var texture = new THREE.DataTexture( settings.headVertexPositions, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBFormat, THREE.FloatType );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
}

function update(dt) {

    _updateVelocity(dt);
    _renderer.autoClearColor = false;
    _updatePosition(dt);
    _renderer.autoClearColor = true;

    exports.positionRenderTarget = _positionRenderTarget;
}


