#version 120
// Firebroxn - gbuffers_terrain.vsh
// Waving foliage, grass, leaves, plus base transform

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
varying float isFoliage;
varying float isLeaves;
varying float blockId;

// Simple waving function
vec3 getWavingOffset(vec3 pos, float id, float time, float foliageType) {
    float windStrength = 0.5 + sin(time * 0.23) * 0.15 + sin(time * 0.55) * 0.10;
    windStrength *= (1.0 - rainStrength * 0.15); // slightly calmer in rain? or stronger? keep moderate
    windStrength += rainStrength * 0.45;

    // Different motion for grass vs leaves
    if(foliageType > 0.5) {
        // Grass / crops - sway at top
        float heightFactor = fract(pos.y + cameraPosition.y); // approximate local height
        // Use texcoord mid to know top vs bottom: passed via mc_midTexCoord? approximate via pos
        // We'll use worldPos based wave
        float waveX = sin(time * 1.35 + pos.x * 0.35 + pos.z * 0.42) * 0.18;
        float waveZ = cos(time * 0.95 + pos.x * 0.22 + pos.z * 0.31) * 0.12;
        // flutter
        waveX += sin(time * 2.8 + pos.x * 0.8) * 0.04;
        return vec3(waveX, sin(waveX*2.0)*0.02, waveZ) * windStrength * heightFactor;
    } else if(foliageType > 1.5) { // leaves
        float waveX = sin(time * 0.85 + pos.x * 0.25 + pos.y * 0.15) * 0.09;
        float waveZ = cos(time * 0.75 + pos.z * 0.28 + pos.y * 0.12) * 0.09;
        float waveY = sin(time * 0.6 + pos.x * 0.18 + pos.z * 0.18) * 0.03;
        return vec3(waveX, waveY, waveZ) * windStrength;
    }
    return vec3(0.0);
}

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord  = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor  = gl_Color;
    normal   = normalize(gl_NormalMatrix * gl_Normal);
    tangent  = normalize(gl_NormalMatrix * at_tangent.xyz);
    binormal = normalize(cross(tangent, normal) * at_tangent.w);

    blockId = 0.0;
    if(mc_Entity.x > 0.5) blockId = mc_Entity.x;

    // Identify foliage types
    // IDs: common foliage - use vanilla block IDs
    // 31: grass, 37/38: flowers, 59: wheat, 115: nether wart, 141/142: carrots/potatoes, 175: double plant
    // 18/161: leaves, 106: vine
    bool isGrass = false;
    bool isLeaf = false;
    // mc_Entity.x is block ID
    float id = mc_Entity.x;
    if(id == 31.0 || id == 37.0 || id == 38.0 || id == 59.0 || id == 115.0 || id == 141.0 || id == 142.0 || id == 175.0 || id == 83.0 || id == 104.0 || id == 105.0) isGrass = true;
    if(id == 18.0 || id == 161.0 || id == 106.0 || id == 30.0) isLeaf = true;
    // also tall grass double
    if(id == 175.0) isGrass = true;

    // Alternative: use entity check for more generic foliage (fallback to position heuristic if IDs not reliable)
    // We'll also allow manual forcing via alpha test fallback? keep simple

    isFoliage = isGrass ? 1.0 : 0.0;
    isLeaves  = isLeaf ? 1.0 : 0.0;

    vec4 position = gbufferModelViewInverse * gl_ModelViewMatrix * gl_Vertex;
    worldPos = position.xyz + cameraPosition;

#ifdef WAVING_ENABLED
    vec3 wavingPos = worldPos;
    // Grass waving - stronger at top vertices, estimate using texcoord.y vs mid
    if(isGrass) {
        float isTop = step(mc_midTexCoord.t, texcoord.t); // not perfect but works
        // simpler: wave amount by how high vertex is relative to block center
        float topFactor = clamp((texcoord.t - mc_midTexCoord.t) * 10.0, 0.0, 1.0);
        // Use worldPos for wave
        float windTime = frameTimeCounter;
        float waveX = sin(windTime * 1.35 + worldPos.x * 0.35 + worldPos.z * 0.42) * 0.35;
        float waveZ = cos(windTime * 0.95 + worldPos.x * 0.22 + worldPos.z * 0.31) * 0.25;
        waveX += sin(windTime * 2.8 + worldPos.x * 0.8) * 0.07;
        vec3 offset = vec3(waveX, sin(waveX*1.5)*0.03, waveZ) * (0.6 + rainStrength*0.5);
        // only top moves
        position.xyz += offset * topFactor * 0.18;
    } else if(isLeaf) {
        float windTime = frameTimeCounter;
        float waveX = sin(windTime * 0.85 + worldPos.x * 0.25 + worldPos.y * 0.15) * 0.10;
        float waveZ = cos(windTime * 0.75 + worldPos.z * 0.28 + worldPos.y * 0.12) * 0.10;
        float waveY = sin(windTime * 0.6 + worldPos.x * 0.18 + worldPos.z * 0.18) * 0.04;
        vec3 offset = vec3(waveX, waveY, waveZ) * (0.5 + rainStrength*0.3);
        position.xyz += offset * 0.35;
    }
    worldPos = position.xyz + cameraPosition;
#endif

    viewPos = (gbufferModelView * position).xyz;

    gl_Position = gbufferProjection * gbufferModelView * position;
    // fix for small depth offset to avoid z-fighting with leaves
    gl_Position.z -= 0.0001 * isLeaves;
}
