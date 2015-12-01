#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
uniform float normalNoise;

//chunk(common);
//chunk(color_pars_fragment);
//chunk(uv_pars_fragment);
//chunk(uv2_pars_fragment);
//chunk(map_pars_fragment);
//chunk(alphamap_pars_fragment);
//chunk(aomap_pars_fragment);
//chunk(lightmap_pars_fragment);
//chunk(emissivemap_pars_fragment);
//chunk(envmap_pars_fragment);
//chunk(fog_pars_fragment);
//chunk(bsdfs);
//chunk(lights_pars);
//chunk(lights_phong_pars_fragment);
//chunk(shadowmap_pars_fragment);
//chunk(bumpmap_pars_fragment);
//chunk(normalmap_pars_fragment);
//chunk(specularmap_pars_fragment);
//chunk(logdepthbuf_pars_fragment);

vec3 rotateY(vec3 v, float x)
{
    return vec3(
        cos(x)*v.x - sin(x)*v.z,
        v.y,
        sin(x)*v.x + cos(x)*v.z
    );
}

vec3 rotateX(vec3 v, float x)
{
    return vec3(
        v.x,
        v.y*cos(x) - v.z*sin(x),
        v.y*sin(x) + v.z*cos(x)
    );
}

vec3 rotateZ(vec3 v, float x)
{
    return vec3(
        v.x*cos(x) - v.y*sin(x),
        v.x*sin(x) + v.y*cos(x),
        v.z
    );
}

#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)
#pragma glslify: random = require(glsl-random)

void main() {

    float d = min(1.0, length(gl_PointCoord.xy - .5) * 2.0);

   vec4 diffuseColor = vec4( diffuse, opacity );
   ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
   vec3 totalEmissiveLight = emissive;

    //chunk(logdepthbuf_fragment);
    //chunk(map_fragment);
    //chunk(color_fragment);
    //chunk(alphamap_fragment);
    //chunk(alphatest_fragment);
    //chunk(specularmap_fragment);
    //chunk(normal_fragment);


    normal = rotateZ(normal, (random(gl_PointCoord.xy + 2.0) - 0.5) * normalNoise);
    normal = rotateY(normal, (random(gl_PointCoord.yx) - 0.5) * normalNoise);
    normal = normalize(normal);

    //chunk(emissivemap_fragment);
    //chunk(shadowmap_fragment);

    #ifdef USE_SHADOWMAP
    // for ( int i = 0; i < NUM_SHADOWS; i ++ ) {

    // }
    #endif

    // accumulation
    //chunk(lights_phong_fragment);
    //chunk(lights_template);
    //_chunk(lightmap_fragment);

    // modulation
    //chunk(aomap_fragment);

    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveLight;

    //chunk(envmap_fragment);
    //chunk(linear_to_gamma_fragment);

    //chunk(fog_fragment);



   gl_FragColor = vec4( outgoingLight, diffuseColor.a );

}
