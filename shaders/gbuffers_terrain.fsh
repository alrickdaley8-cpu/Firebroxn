#version 120
// Firebroxn - gbuffers_terrain.fsh
// Base terrain shading with diffuse lighting, shadows will be applied in composite

#include "/lib/common.glsl"

uniform sampler2D texture;
uniform sampler2D lightmap;
uniform sampler2D normals;
uniform sampler2D specular;

uniform float alphaTestRef;

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

void main() {
    vec4 albedo = texture2D(texture, texcoord) * glcolor;

    if(albedo.a < alphaTestRef * 0.95) discard;

    // Simple normal handling - if normals texture exists, use it
    vec3 norm = normalize(normal);
    // Try to read normal map if available (OptiFine provides normals texture)
#ifdef NORMAL_MAP
    // Not enabled by default, fallback to vertex normal
#endif

    // Lightmap
    vec2 lm = lmcoord;
    // Fix lightmap range 0-1
    lm = clamp(lm, 0.0, 1.0);
    vec3 lightmapColor = texture2D(lightmap, lm).rgb;
    // Desaturate lightmap slightly for more natural look
    // but keep torch warm

    // Encode data for composite:
    // We output albedo to colortex0, normals + lightmap etc can be packed
    // For simplicity, output color * lightmap mixed, but keep HDR for composite to do shadows
    // We'll output albedo.rgb * glcolor + lightmap influence encoded in alpha? Instead pass lmcoord as is via separate buffer?
    // Simpler: output albedo to colortex0, and encode normals in colortex1, material in colortex2

    // For this pack we do deferred-ish but keep lighting in composite.
    // So gbuffers just outputs albedo and data for composite to use.

    // Apply vanilla AO from glcolor? Already baked
    // Slight foliage brightness boost
    if(isLeaves > 0.5) {
        albedo.rgb *= 1.05;
    }

    // Output
    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(albedo.rgb, albedo.a); // colortex0 HDR base
    // colortex1: normal encoded 0-1 + lmcoord
    vec3 normalEnc = norm * 0.5 + 0.5;
    gl_FragData[1] = vec4(normalEnc, 0.0); // we pack lm separately via alpha? We'll reconstruct lm in composite from texture lookup? Actually we need to pass lm
    // HACK: pack lightmap in colortex1 alpha and use spare? We'll use dedicated handling: composite will read lightmap uniform directly? No, need per-pixel sky/block light.
    // Instead we store lmcoord in colortex2
    float isFoliagePacked = isFoliage * 0.5 + isLeaves * 0.25;
    gl_FragData[2] = vec4(lm, isFoliagePacked, 1.0);

    // Optional: specular/roughness in colortex3? Not used yet, reserved
}
