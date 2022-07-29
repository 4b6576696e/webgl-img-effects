// varying vec2 vUv;

// void main() {
    
//     gl_Position = modelMatrix * viewMatrix * projectionMatrix * vec4(position, 1.);

//     vUv = uv;
// }

uniform float uHoverState;
uniform float uTime;
uniform vec2 uCoord;

varying vec2 vUv;
varying float vNoise;

void main()
{
    vec3 newPosition = position;

    float dist = distance(uv, uCoord);

    float noise = sin(dist * 10. - uTime / 200.) * uHoverState;

    newPosition.z += .01 * noise;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

    vUv = uv;
    vNoise = noise;
}