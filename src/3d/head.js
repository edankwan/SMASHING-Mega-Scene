var settings = require('../core/settings');
var THREE = require('three');
var shaderParse = require('../helpers/shaderParse');
var glslify = require('glslify');
var fbo = require('./fbo');

var undef;

var mesh = exports.mesh = undef;
exports.init = init;
exports.update = update;
exports.useDiffuse = false;
exports.useEnv = false;
exports.normalNoise = 0.2;

var _geometry;
var _materials = {};
var _depthMaterial;

var TEXTURE_WIDTH = settings.textureWidth;
var PARTICLES_AMOUNT = settings.textureWidth * settings.textureHeight;

function init() {
    settings.headData.scale = 1/1000;
    var geometry = (new THREE.JSONLoader()).parse(settings.headData).geometry;

    var geometryFaces = geometry.faces;
    var geometryVertices = geometry.vertices;
    var geometryFaceUVs = geometry.faceVertexUvs[0];
    var areaTotal = 0;
    var areaThresholds = [];
    var face, vertex, area;
    var p0x, p0y, p0z;
    var p1x, p1y, p1z;
    var p2x, p2y, p2z;
    var v0x, v0y, v0z;
    var v1x, v1y, v1z;
    var v2x, v2y, v2z;

    for(var i = 0, len = geometryFaces.length; i < len; i++) {
        face = geometryFaces[i];
        vertex = geometryVertices[face.a];
        p0x = vertex.x;
        p0y = vertex.y;
        p0z = vertex.z;
        vertex = geometryVertices[face.b];
        p1x = vertex.x;
        p1y = vertex.y;
        p1z = vertex.z;
        vertex = geometryVertices[face.c];
        p2x = vertex.x;
        p2y = vertex.y;
        p2z = vertex.z;
        v0x = p1x - p0x;
        v0y = p1y - p0y;
        v0z = p1z - p0z;
        v1x = p2x - p0x;
        v1y = p2y - p0y;
        v1z = p2z - p0z;
        v2x = v0y * v1z - v0z * v1y;
        v2y = v0z * v1x - v0x * v1z;
        v2z = v0x * v1y - v0y * v1x;
        area = 0.5 * Math.sqrt(v2x*v2x + v2y*v2y + v2z*v2z);
        areaTotal += area;
        areaThresholds[i] = areaTotal;
    }

    // probably not good to ignore the same vertices with different normal
    // but it shouldnt look so different... so meh

    var remainder = PARTICLES_AMOUNT - geometryVertices.length;
    var areaPerParticle = areaTotal / remainder;
    var usedVertexMap = new Int8Array(geometryVertices.length);
    var vertices = new Float32Array(PARTICLES_AMOUNT * 3);
    var uvs = new Float32Array(PARTICLES_AMOUNT * 2);
    var normals = new Float32Array(PARTICLES_AMOUNT * 3);
    var index2 = 0;
    var index3 = 0;
    var uv, normal, areaThreshold, amount;

    var vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy;
    var v0, v1, v2, n0, n1, n2, uv0, uv1, uv2;

    var areaSum = 0;

    function addPoint(pointAmount,
        v0x, v0y, v0z, n0x, n0y, n0z, uv0x, uv0y,
        v1x, v1y, v1z, n1x, n1y, n1z, uv1x, uv1y,
        v2x, v2y, v2z, n2x, n2y, n2z, uv2x, uv2y) {
        if(pointAmount < 1) return 0;

        vertices[index3] = vcx = (v0x + v1x + v2x) / 3;
        vertices[index3 + 1] = vcy = (v0y + v1y + v2y) / 3;
        vertices[index3 + 2] = vcz = (v0z + v1z + v2z) / 3;
        normals[index3] = ncx = (n0x + n1x + n2x) / 3;
        normals[index3 + 1] = ncy = (n0y + n1y + n2y) / 3;
        normals[index3 + 2] = ncz = (n0z + n1z + n2z) / 3;
        index3 += 3;
        uvs[index2] = uvcx = (uv0x + uv1x + uv2x) / 3;
        uvs[index2 + 1] = uvcy = (uv0y + uv1y + uv2y) / 3;
        index2 += 2;
        pointAmount--;

        if(pointAmount % 2) {
            var d3 = ~~(pointAmount / 3);
            var f3 = pointAmount - d3 * 3;
            addPoint(d3 + (f3 > 0 ? 1: 0),
                v0x, v0y, v0z, n0x, n0y, n0z, uv0x, uv0y,
                v1x, v1y, v1z, n1x, n1y, n1z, uv1x, uv1y,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
            addPoint(d3 + (f3 > 1 ? 1: 0),
                v1x, v1y, v1z, n1x, n1y, n1z, uv1x, uv1y,
                v2x, v2y, v2z, n2x, n2y, n2z, uv2x, uv2y,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
            addPoint(d3,
                v2x, v2y, v2z, n2x, n2y, n2z, uv2x, uv2y,
                v0x, v0y, v0z, n0x, n0y, n0z, uv0x, uv0y,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
        } else {

            var d6 = ~~(pointAmount / 6);
            var f6 = pointAmount - d6 * 6;

            addPoint(d6 + (f6 > 0 ? 1: 0),
                v2x, v2y, v2z, n2x, n2y, n2z, uv2x, uv2y,
                (v2x + v0x) / 2, (v2y + v0y) / 2, (v2z + v0z) / 2, (n2x + n0x) / 2, (n2y + n0y) / 2, (n2z + n0z) / 2, (uv2x + uv0x) / 2, (uv2y + uv0y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
            addPoint(d6 + (f6 > 1 ? 1: 0),
                v0x, v0y, v0z, n0x, n0y, n0z, uv0x, uv0y,
                (v2x + v0x) / 2, (v2y + v0y) / 2, (v2z + v0z) / 2, (n2x + n0x) / 2, (n2y + n0y) / 2, (n2z + n0z) / 2, (uv2x + uv0x) / 2, (uv2y + uv0y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);

            addPoint(d6 + (f6 > 2 ? 1: 0),
                v1x, v1y, v1z, n1x, n1y, n1z, uv1x, uv1y,
                (v1x + v2x) / 2, (v1y + v2y) / 2, (v1z + v2z) / 2, (n1x + n2x) / 2, (n1y + n2y) / 2, (n1z + n2z) / 2, (uv1x + uv2x) / 2, (uv1y + uv2y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
            addPoint(d6 + (f6 > 3 ? 1: 0),
                v2x, v2y, v2z, n2x, n2y, n2z, uv2x, uv2y,
                (v1x + v2x) / 2, (v1y + v2y) / 2, (v1z + v2z) / 2, (n1x + n2x) / 2, (n1y + n2y) / 2, (n1z + n2z) / 2, (uv1x + uv2x) / 2, (uv1y + uv2y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);

            addPoint(d6 + (f6 > 4 ? 1: 0),
                v0x, v0y, v0z, n0x, n0y, n0z, uv0x, uv0y,
                (v0x + v1x) / 2, (v0y + v1y) / 2, (v0z + v1z) / 2, (n0x + n1x) / 2, (n0y + n1y) / 2, (n0z + n1z) / 2, (uv0x + uv1x) / 2, (uv0y + uv1y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
            addPoint(d6 + (f6 > 5 ? 1: 0),
                v1x, v1y, v1z, n1x, n1y, n1z, uv1x, uv1y,
                (v0x + v1x) / 2, (v0y + v1y) / 2, (v0z + v1z) / 2, (n0x + n1x) / 2, (n0y + n1y) / 2, (n0z + n1z) / 2, (uv0x + uv1x) / 2, (uv0y + uv1y) / 2,
                vcx, vcy, vcz, ncx, ncy, ncz, uvcx, uvcy);
        }

    }
    for(i = 0, len = geometryFaces.length; i < len; i++) {

        face = geometryFaces[i];

        if(!usedVertexMap[face.a]) {
            usedVertexMap[face.a] = 1;
            vertex = geometryVertices[face.a];
            vertices[index3] = vertex.x;
            vertices[index3 + 1] = vertex.y;
            vertices[index3 + 2] = vertex.z;
            normal = face.vertexNormals[0];
            normals[index3] = normal.x;
            normals[index3 + 1] = normal.y;
            normals[index3 + 2] = normal.z;
            index3 += 3;
            uv = geometryFaceUVs[i][0];
            uvs[index2] = uv.x;
            uvs[index2 + 1] = uv.y;
            index2 += 2;
        }
        if(!usedVertexMap[face.b]) {
            usedVertexMap[face.b] = 1;
            vertex = geometryVertices[face.b];
            vertices[index3] = vertex.x;
            vertices[index3 + 1] = vertex.y;
            vertices[index3 + 2] = vertex.z;
            normal = face.vertexNormals[1];
            normals[index3] = normal.x;
            normals[index3 + 1] = normal.y;
            normals[index3 + 2] = normal.z;
            index3 += 3;
            uv = geometryFaceUVs[i][1];
            uvs[index2] = uv.x;
            uvs[index2 + 1] = uv.y;
            index2 += 2;
        }
        if(!usedVertexMap[face.c]) {
            usedVertexMap[face.c] = 1;
            vertex = geometryVertices[face.c];
            vertices[index3] = vertex.x;
            vertices[index3 + 1] = vertex.y;
            vertices[index3 + 2] = vertex.z;
            normal = face.vertexNormals[2];
            normals[index3] = normal.x;
            normals[index3 + 1] = normal.y;
            normals[index3 + 2] = normal.z;
            index3 += 3;
            uv = geometryFaceUVs[i][2];
            uvs[index2] = uv.x;
            uvs[index2 + 1] = uv.y;
            index2 += 2;
        }

        areaThreshold = areaThresholds[i];
        amount = 0;
        while(((i === len - 1) || (areaSum + areaPerParticle <= areaThreshold)) && remainder > 0) {
            areaSum += areaPerParticle;
            amount++;
            remainder--;
        }
        if(amount > 0) {
            v0 = geometryVertices[face.a];
            n0 = face.vertexNormals[0];
            uv0 = geometryFaceUVs[i][0];
            v1 = geometryVertices[face.b];
            n1 = face.vertexNormals[1];
            uv1 = geometryFaceUVs[i][1];
            v2 = geometryVertices[face.c];
            n2 = face.vertexNormals[2];
            uv2 = geometryFaceUVs[i][2];
            addPoint(amount,
                v0.x, v0.y, v0.z, n0.x, n0.y, n0.z, uv0.x, uv0.y,
                v1.x, v1.y, v1.z, n1.x, n1.y, n1.z, uv1.x, uv1.y,
                v2.x, v2.y, v2.z, n2.x, n2.y, n2.z, uv2.x, uv2.y);
        }
    }

    settings.headVertexPositions = vertices;

    var position = new Float32Array(PARTICLES_AMOUNT * 3);
    var i3;
    for( i = 0; i < PARTICLES_AMOUNT; i++ ) {
        i3 = i * 3;
        position[ i3 + 0] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        position[ i3 + 1 ] = ~~(i / TEXTURE_WIDTH) / TEXTURE_WIDTH;
        position[ i3 + 2 ] = Math.random();
    }

    _geometry = new THREE.BufferGeometry();
    _geometry.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ));
    _geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ));
    _geometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ));

    var diffuseMap = (new THREE.TextureLoader()).load('images/diffuse.jpg');
    diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
    diffuseMap.format = THREE.RGBFormat;

    var material;

    var vs = shaderParse(glslify('../glsl/head.vert'));
    var fs = shaderParse(glslify('../glsl/head.frag'));

    function cloneMaterial(useDiffuse, useEnv) {
        material = _materials[(+useDiffuse << 1) + (+useEnv)] = new THREE.MeshPhongMaterial();
        material.type = 'ShaderMaterial';
        material.color.setHex(useDiffuse ? 0x777777 : 0x444444);
        material.specular.setHex(useDiffuse ? 0x222222 : 0x555555);
        material.shininess = 12;
        material.reflectivity = (!useDiffuse && useEnv) ? 0.5 : 0.25;
        material.blending = THREE.NoBlending;

        var uniforms = THREE.UniformsUtils.merge( [THREE.ShaderLib.phong.uniforms] );
        uniforms.texturePosition = {type: 't', value: undef};
        uniforms.textureDefaultPosition = {type: 't', value: undef};
        uniforms.normalNoise = {type: 'f', value: exports.normalNoise};
        material.uniforms = uniforms;
        material.vertexShader = vs;
        material.fragmentShader = fs;
        material.map = useDiffuse ? diffuseMap : undef;
        material.envMap = useEnv ? settings.envMap : undef;
    }
    for( i = 0; i < 4; i++ ) {
        cloneMaterial((i & 2) >> 1, i & 1);
    }

    mesh = exports.mesh = new THREE.Points(_geometry, material);
    mesh.customDepthMaterial = _depthMaterial = new THREE.ShaderMaterial( {
        uniforms: {
            time: { type: 'f', value: 0 },
            realCameraPosition: { type: 'v3', value: settings.cameraPosition },
            texturePosition: { type: 't', value: undef },
            textureDefaultPosition: { type: 't', value: undef }
        },
        vertexShader: shaderParse(glslify('../glsl/headDepth.vert')),
        fragmentShader: shaderParse(glslify('../glsl/headDepth.frag')),
        blending: THREE.NoBlending,
        depthTest: true,
        depthWrite: true
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    geometry.dispose();
    // var material = new THREE.MeshPhongMaterial( {
    //     color: 0x666666,
    //     specular: 0x222222,
    //     shininess: 12
    // });
    // var baseMesh = exports.baseMesh = new THREE.Mesh(geometry, material);
    // baseMesh.castShadow = true;
    // baseMesh.receiveShadow = true;
    // baseMesh.visible = false;
    // mesh.add(baseMesh);

}

function update(dt) {
    mesh.material = _materials[(+exports.useDiffuse << 1) + (+exports.useEnv)];
    mesh.material.uniforms.textureDefaultPosition.value = fbo.defaultPositionRenderTarget;
    mesh.material.uniforms.texturePosition.value = fbo.positionRenderTarget;
    mesh.material.uniforms.normalNoise.value = exports.normalNoise;
    _depthMaterial.uniforms.textureDefaultPosition.value = fbo.defaultPositionRenderTarget;
    _depthMaterial.uniforms.texturePosition.value = fbo.positionRenderTarget;

}
