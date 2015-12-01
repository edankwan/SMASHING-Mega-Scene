uniform vec2 resolution;

uniform sampler2D textureVelocity;
uniform sampler2D texturePosition;
uniform sampler2D textureDefaultPosition;

const float EPS = 0.0001;

uniform float resetAnimation;

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 velocity = texture2D( textureVelocity, uv ).xyz;
    vec3 position = texture2D( texturePosition, uv ).xyz;
    vec3 defaultPosition = texture2D( textureDefaultPosition, uv ).xyz;

    position += velocity;

    position += (defaultPosition - position) * pow(smoothstep(EPS, 1.0, resetAnimation), 3.0);

    position.y = max(position.y, -200.0);

    gl_FragColor = vec4(position, 1.0);

}
