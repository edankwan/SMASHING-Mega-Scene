#define PHONG

uniform sampler2D textureDefaultPosition;
uniform sampler2D texturePosition;

varying vec3 vViewPosition;

const float EPS = 0.0001;

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


#ifndef FLAT_SHADED

   varying vec3 vNormal;

#endif

//chunk(common);
//chunk(uv_pars_vertex);
//chunk(uv2_pars_vertex);
//chunk(displacementmap_pars_vertex);
//chunk(envmap_pars_vertex);
//chunk(lights_phong_pars_vertex);
//chunk(color_pars_vertex);
//chunk(morphtarget_pars_vertex);
//chunk(skinning_pars_vertex);
//chunk(shadowmap_pars_vertex);
//chunk(logdepthbuf_pars_vertex);

void main() {

    //chunk(uv_vertex);
    //chunk(uv2_vertex);
    //chunk(color_vertex);

    //chunk(beginnormal_vertex);
    //chunk(morphnormal_vertex);
    //chunk(skinbase_vertex);
    //chunk(skinnormal_vertex);
    //chunk(defaultnormal_vertex);

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

  vec3 pos = texture2D( texturePosition, position.xy ).xyz;
  vec3 defaultPos = texture2D( textureDefaultPosition, position.xy ).xyz;
  float offsetDistance = distance(pos, defaultPos);

  pos += normal * 0.5;

  transformedNormal = rotateX(transformedNormal, offsetDistance * 0.02 * sin(fract(position.z * 21321.5125)));
  transformedNormal = rotateY(transformedNormal, offsetDistance * 0.02 * sin(fract(position.z * 51211.41)));

   vNormal = normalize( transformedNormal );

#endif

    //chunk(begin_vertex);
    transformed = pos;

    //chunk(displacementmap_vertex);
    //chunk(morphtarget_vertex);
    //chunk(skinning_vertex);
    //chunk(project_vertex);
    //chunk(logdepthbuf_vertex);

   vViewPosition = - mvPosition.xyz;



    //chunk(worldpos_vertex);
    //chunk(envmap_vertex);
    //chunk(lights_phong_vertex);
    //chunk(shadowmap_vertex);

    gl_PointSize = mix(2600.0, 800.0, smoothstep(EPS, 2.0, offsetDistance)) / length( mvPosition.xyz );
}
