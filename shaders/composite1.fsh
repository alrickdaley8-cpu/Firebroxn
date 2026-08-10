#version 120
// Firebroxn - composite1.fsh
// Bloom horizontal blur

#include "/lib/common.glsl"

uniform sampler2D colortex0; // scene HDR
uniform sampler2D colortex1; // bloom extract
uniform sampler2D colortex2; // godray mask
uniform float viewWidth;
uniform float viewHeight;

varying vec2 texcoord;

void main() {
    // Horizontal 9-tap Gaussian blur for bloom - manual unrolled for GLSL 120 compatibility
    vec2 texelSize = vec2(1.0 / viewWidth, 1.0 / viewHeight);
    float dx = texelSize.x * 2.4;

    vec3 bloom = vec3(0.0);
    bloom += texture2D(colortex1, texcoord + vec2(-4.0*dx, 0.0)).rgb * 0.05;
    bloom += texture2D(colortex1, texcoord + vec2(-3.0*dx, 0.0)).rgb * 0.09;
    bloom += texture2D(colortex1, texcoord + vec2(-2.0*dx, 0.0)).rgb * 0.12;
    bloom += texture2D(colortex1, texcoord + vec2(-1.0*dx, 0.0)).rgb * 0.15;
    bloom += texture2D(colortex1, texcoord).rgb * 0.16;
    bloom += texture2D(colortex1, texcoord + vec2( 1.0*dx, 0.0)).rgb * 0.15;
    bloom += texture2D(colortex1, texcoord + vec2( 2.0*dx, 0.0)).rgb * 0.12;
    bloom += texture2D(colortex1, texcoord + vec2( 3.0*dx, 0.0)).rgb * 0.09;
    bloom += texture2D(colortex1, texcoord + vec2( 4.0*dx, 0.0)).rgb * 0.05;

    // Keep some sharp detail
    vec3 originalBloom = texture2D(colortex1, texcoord).rgb;
    bloom = mix(originalBloom * 0.35, bloom, 0.85);

    vec3 scene = texture2D(colortex0, texcoord).rgb;
    vec3 godray = texture2D(colortex2, texcoord).rgb;

    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(scene, 1.0); // pass scene
    gl_FragData[1] = vec4(bloom, 1.0); // blurred bloom horiz
    gl_FragData[2] = vec4(godray, 1.0); // pass godray
}
