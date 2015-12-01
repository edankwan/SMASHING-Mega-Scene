

varying float vDepthOffset;

//chunk(common);
//chunk(logdepthbuf_pars_fragment);

vec4 pack_depth( const in float depth ) {

   const vec4 bit_shift = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
   const vec4 bit_mask = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );
   vec4 res = mod( depth * bit_shift * vec4( 255 ), vec4( 256 ) ) / vec4( 255 );
   res -= res.xxyz * bit_mask;
   return res;

}

void main() {

    // float d = min(1.0, length(gl_PointCoord.xy - .5) * 2.0);

    //chunk(logdepthbuf_fragment);

   #ifdef USE_LOGDEPTHBUF_EXT

       gl_FragData[ 0 ] = pack_depth( gl_FragDepthEXT );

   #else

    //chunk(skinbase_vertex);
       gl_FragData[ 0 ] = pack_depth(gl_FragCoord.z - 1.0);

   #endif

}
