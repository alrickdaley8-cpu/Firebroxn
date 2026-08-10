#version 120
// Firebroxn - gbuffers_water.vsh
// Water vertex displacement + waving

#include "/lib/common.glsl"

attribute vec4 mc_Entity;
attribute vec4 mc_midTexCoord;
attribute vec4 at_tangent;

uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferProjection;

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
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord  = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor  = gl_Color;
    normal   = normalize(gl_NormalMatrix * gl_Normal);
    tangent  = normalize(gl_NormalMatrix * at_tangent.xyz);
    binormal = normalize(cross(tangent, normal) * at_tangent.w);

    float id = mc_Entity.x;
    isWater = (id == 8.0 || id == 9.0) ? 1.0 : 0.0;

    vec4 position = gbufferModelViewInverse * gl_ModelViewMatrix * gl_Vertex;
    worldPos = position.xyz + cameraPosition;

#ifdef WAVING_ENABLED
    if(isWater > 0.5) {
        // Only displace top surface (normal y > 0.5)
        vec3 worldNormal = mat3(gbufferModelViewInverse) * normal;
        if(worldNormal.y > 0.5) {
            float time = frameTimeCounter * 0.8;
            vec2 wavePos = worldPos.xz;
            float h = 0.0;
            h += sin(wavePos.x * 0.18 + time * 1.2) * 0.07;
            h += cos(wavePos.y * 0.14 + time * 0.9) * 0.07;
            h += sin(wavePos.x * 0.32 - time * 1.0 + wavePos.y * 0.12) * 0.04;
            h += sin(wavePos.x * 0.07 + wavePos.y * 0.09 + time * 0.6) * 0.10;
            // Fade with distance to avoid popping far away
            float dist = length(position.xyz);
            float fade = clamp(1.0 - dist / 90.0, 0.0, 1.0);
            position.y += h * fade;

            // Also small lateral shift for choppiness
            position.x += sin(time*0.5 + wavePos.x*0.1) * 0.02 * fade;
            position.z += cos(time*0.5 + wavePos.y*0.1) * 0.02 * fade;
        }
    }
#endif

    worldPos = position.xyz + cameraPosition;
    viewPos = (gbufferModelView * position).xyz;
    gl_Position = gbufferProjection * gbufferModelView * position;
}
