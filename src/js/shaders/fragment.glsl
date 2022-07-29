uniform sampler2D uTexture;

varying vec2 vUv;
varying float vNoise;
uniform float uHoverState;

void main()
{
    vec4 textureColor = texture2D(uTexture, vUv);
    vec2 p = vUv;
    float x = uHoverState;
    x = smoothstep(.0,1.0,(x*2.0+p.y-1.0));
    vec4 f = mix(
        texture2D(uTexture, (p-.5)*(1.-x)+.5), 
        texture2D(uTexture, (p-.5)*x+.5), 
        x);

    gl_FragColor = f;
    gl_FragColor.rgb += .05 * vec3(vNoise);
    // gl_FragColor = vec4(1., 0., 0., 1.);
}
