#version 120
// Firebroxn - gbuffers_skybasic.fsh
// Procedural sky replacement - overrides vanilla sky gradient

#include "/lib/common.glsl"
#include "/lib/sky.glsl"

uniform float wetness;
uniform int isEyeInWater;
uniform float viewWidth;
uniform float viewHeight;
uniform mat4 gbufferModelViewInverse;

varying vec3 viewDir;
varying vec4 glcolor;

void main() {
    // Vanilla sky color is in glcolor but we replace it
    vec3 sunDir = normalize(sunPosition);
    vec3 moonDir = normalize(moonPosition);

    // For skyBasic, viewDir is in view space, need world space for sky calc
    // Transform to world-ish: inverse view rotation
    // Approximate world viewDir from viewDir using gbufferModelViewInverse rotation
    mat3 viewToWorld = mat3(gbufferModelViewInverse);
    vec3 worldViewDir = normalize(viewToWorld * viewDir);
    // correct for camera tilt? use normalized

    float sunVis = getSunVisibility();
    // If eye in water, make sky darker / foggy
    if(isEyeInWater == 1) {
        gl_FragData[0] = vec4(vec3(0.06, 0.18, 0.35) * 0.6, 1.0);
        gl_FragData[1] = vec4(0.0);
        gl_FragData[2] = vec4(0.0);
        return;
    }

    vec3 sky = getSkyColor(worldViewDir, sunDir, moonDir, sunVis, getMoonVisibility(), rainStrength);

    // Vanilla fog / horizon blending - boost brightness near horizon a bit
    // glcolor contains vanilla sky gradient - we ignore but keep alpha
    float alpha = glcolor.a;
    // If glcolor is very dark (night), ensure we keep stars

    // Slight desaturation for rain
    sky = mix(sky, vec3(0.5), rainStrength * 0.05);

    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(sky, 1.0);
}
