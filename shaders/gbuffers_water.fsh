#version 120
// Firebroxn - gbuffers_water.fsh
// Outputs water data for composite to shade with reflections & refraction

#include "/lib/common.glsl"

uniform sampler2D texture;
uniform sampler2D lightmap;
uniform sampler2D normals;
uniform float alphaTestRef;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 glcolor;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;
varying vec3 worldPos;
varying vec3 viewPos;
varying float isWater;

void main() {
    vec4 albedo = texture2D(texture, texcoord) * glcolor;

    // Water uses translucent rendering - alpha may be <1
    // For non-water (like glass, ice) that also goes through gbuffers_water, keep albedo
    vec2 lm = clamp(lmcoord, 0.0, 1.0);
    vec3 norm = normalize(normal);

    // For water we want to encode that it's water via special value in colortex1 or alpha
    // We'll output water albedo but composite will handle water specially if isWater>0.5

    // Fix: stained glass etc should not be considered water
    float waterFlag = isWater;

    // Slightly tint water albedo to be more transparent for composite
    if(waterFlag > 0.5) {
        albedo.a *= 0.75; // make slightly more translucent
        // Keep readable alpha for sorting
        if(albedo.a < 0.1) discard;
    } else {
        if(albedo.a < alphaTestRef * 0.5) discard;
    }

    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(albedo.rgb, albedo.a);
    vec3 normalEnc = norm * 0.5 + 0.5;
    gl_FragData[1] = vec4(normalEnc, waterFlag);
    gl_FragData[2] = vec4(lm, waterFlag, 1.0);
}
