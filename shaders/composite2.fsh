#version 120
// Firebroxn - composite2.fsh
// Vertical blur + bloom combine + godray blend

#include "/lib/common.glsl"

uniform sampler2D colortex0; // scene
uniform sampler2D colortex1; // h-blurred bloom
uniform sampler2D colortex2; // godray
uniform float viewWidth;
uniform float viewHeight;

varying vec2 texcoord;

void main() {
    vec2 texelSize = vec2(1.0 / viewWidth, 1.0 / viewHeight);
    float dy = texelSize.y * 2.4;

    // Vertical blur - manual unrolled for GLSL 120
    vec3 bloom = vec3(0.0);
    bloom += texture2D(colortex1, texcoord + vec2(0.0, -4.0*dy)).rgb * 0.05;
    bloom += texture2D(colortex1, texcoord + vec2(0.0, -3.0*dy)).rgb * 0.09;
    bloom += texture2D(colortex1, texcoord + vec2(0.0, -2.0*dy)).rgb * 0.12;
    bloom += texture2D(colortex1, texcoord + vec2(0.0, -1.0*dy)).rgb * 0.15;
    bloom += texture2D(colortex1, texcoord).rgb * 0.16;
    bloom += texture2D(colortex1, texcoord + vec2(0.0,  1.0*dy)).rgb * 0.15;
    bloom += texture2D(colortex1, texcoord + vec2(0.0,  2.0*dy)).rgb * 0.12;
    bloom += texture2D(colortex1, texcoord + vec2(0.0,  3.0*dy)).rgb * 0.09;
    bloom += texture2D(colortex1, texcoord + vec2(0.0,  4.0*dy)).rgb * 0.05;

    vec3 scene = texture2D(colortex0, texcoord).rgb;
    vec3 godray = texture2D(colortex2, texcoord).rgb;

    // Combine bloom - additively with adjustable strength
    float bloomStrength = BLOOM_STRENGTH * (1.0 - rainStrength * 0.25);
    vec3 withBloom = scene + bloom * bloomStrength;

    // Godray add
    float godrayStrength = 0.55;
    vec3 godrayColor = vec3(1.0, 0.92, 0.72) * godrayStrength;
    withBloom += godray * godrayColor * 0.85;

    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(withBloom, 1.0);
}
