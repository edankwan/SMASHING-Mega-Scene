uniform vec2 resolution;
uniform vec3 mouse3d;
uniform vec3 mouse3dVelocity;
uniform float isPhysicsActive;
uniform float resetAnimation;

uniform float mouseForce;
uniform float mouseRadius;
uniform float gravity;

uniform sampler2D textureVelocity;
uniform sampler2D texturePosition;
uniform sampler2D textureDefaultPosition;

const float EPS = 0.0001;

#pragma glslify: random = require(glsl-random)

void main() {

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 velocity = texture2D( textureVelocity, uv ).xyz;
    vec3 defaultPosition = texture2D( textureDefaultPosition, uv ).xyz;
    vec3 position = texture2D( texturePosition, uv ).xyz;

    float positionOffset = distance(position, defaultPosition);

    float toMouseStrength = length(position - mouse3d) /mouseRadius;
    toMouseStrength = step(-1.0, -toMouseStrength);

    if(position.y + velocity.y < -199.0) {
        float strength = abs(velocity.y) * 0.2;
        velocity.y *= -0.4 - random(uv + 2.0) * 0.2;
        velocity.x += (random(position.xy + strength) - 0.5);
        velocity.z += (random(position.zy) - 0.5);
        velocity.xz *= strength;
    } else {
        velocity.xz *= 0.99;
        velocity.y -= step(EPS, positionOffset + isPhysicsActive) * ( (1.0 - (defaultPosition.y + 200.0) / 500.0) + random(defaultPosition.xy)) * gravity;
    }

    velocity += (normalize(position - mouse3d) + mouse3dVelocity * 0.2) * pow(toMouseStrength, 2.0) * (1.0 + random(vec2(position.x + position.y, position.z)) * 0.3) * mouseForce;
    velocity *= 1.0 - step(EPS, resetAnimation);

    gl_FragColor = vec4(velocity, 1.0);

}
