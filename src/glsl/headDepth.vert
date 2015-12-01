
uniform sampler2D textureDefaultPosition;
uniform sampler2D texturePosition;

const float EPS = 0.0001;

//chunk(common);
//chunk(morphtarget_pars_vertex);
//chunk(skinning_pars_vertex);
//chunk(logdepthbuf_pars_vertex);

void main() {

    //chunk(skinbase_vertex);

    //chunk(begin_vertex);

    vec3 pos = texture2D( texturePosition, position.xy ).xyz;
    vec3 defaultPos = texture2D( textureDefaultPosition, position.xy ).xyz;
    float offsetDistance = distance(pos, defaultPos);
    transformed = pos;

    //chunk(morphtarget_vertex);
    //chunk(skinning_vertex);
    //chunk(project_vertex);
    //chunk(logdepthbuf_vertex);

    gl_PointSize = mix(1800.0, 400.0, smoothstep(EPS, 2.0, offsetDistance)) / length( mvPosition.xyz );
}
