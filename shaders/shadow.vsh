#version 120
// Firebroxn - shadow.vsh
// Clean version with waving + shadow distortion

#include "/lib/common.glsl"

attribute vec4 mc_Entity;
attribute vec4 mc_midTexCoord;

uniform mat4 shadowModelView;
uniform mat4 shadowProjection;
uniform mat4 gbufferModelViewInverse;

varying vec2 texcoord;
varying vec4 glcolor;
varying float isFoliage;
varying float isWater;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glcolor = gl_Color;

    float id = mc_Entity.x;
    bool foliage = (id == 31.0 || id == 37.0 || id == 38.0 || id == 59.0 || id == 115.0 || id == 141.0 || id == 142.0 || id == 175.0 || id == 18.0 || id == 161.0 || id == 106.0 || id == 83.0);
    isFoliage = foliage ? 1.0 : 0.0;
    isWater = (id == 8.0 || id == 9.0) ? 1.0 : 0.0;

    // Base world position
    vec4 viewPos = gbufferModelViewInverse * gl_ModelViewMatrix * gl_Vertex;
    vec3 worldPos = viewPos.xyz + cameraPosition;

    vec3 offset = vec3(0.0);

#ifdef WAVING_ENABLED
    if(foliage) {
        bool isGrass = (id == 31.0 || id == 175.0 || id == 59.0 || id == 83.0 || id == 104.0 || id == 105.0);
        if(isGrass) {
            float topFactor = clamp((texcoord.t - mc_midTexCoord.t) * 12.0, 0.0, 1.0);
            float time = frameTimeCounter;
            float waveX = sin(time * 1.35 + worldPos.x * 0.35 + worldPos.z * 0.42) * 0.35;
            float waveZ = cos(time * 0.95 + worldPos.x * 0.22 + worldPos.z * 0.31) * 0.25;
            waveX += sin(time * 2.8 + worldPos.x * 0.8) * 0.07;
            offset = vec3(waveX, sin(waveX*1.5)*0.03, waveZ) * (0.6 + rainStrength*0.5) * topFactor * 0.22;
        } else {
            float time = frameTimeCounter;
            float waveX = sin(time * 0.85 + worldPos.x * 0.25 + worldPos.y * 0.15) * 0.10;
            float waveZ = cos(time * 0.75 + worldPos.z * 0.28 + worldPos.y * 0.12) * 0.10;
            float waveY = sin(time * 0.6 + worldPos.x * 0.18 + worldPos.z * 0.18) * 0.04;
            offset = vec3(waveX, waveY, waveZ) * (0.5 + rainStrength*0.3) * 0.38;
        }
    }
    if(isWater > 0.5) {
        vec3 n = normalize(gl_Normal);
        vec3 wn = mat3(gbufferModelViewInverse) * n;
        if(wn.y > 0.5) {
            float time = frameTimeCounter * 0.8;
            float h = sin(worldPos.x * 0.18 + time * 1.2)*0.07 + cos(worldPos.z * 0.14 + time * 0.9)*0.07;
            offset.y += h * 0.55;
        }
    }
#endif

    vec3 wavedWorld = worldPos + offset;
    vec4 shadowViewPos = shadowModelView * vec4(wavedWorld - cameraPosition, 1.0);
    vec4 shadowClip = shadowProjection * shadowViewPos;

    // Shadow map distortion - expands near, compresses far for better detail
    float len = length(shadowClip.xy);
    float distort = 1.0 / mix(1.0, len, 0.85);
    shadowClip.xy *= distort;

    gl_Position = shadowClip;
}
