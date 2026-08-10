#version 120
// Firebroxn - gbuffers_entities.fsh

#include "/lib/common.glsl"

uniform sampler2D texture;
uniform sampler2D lightmap;
uniform float alphaTestRef;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 glcolor;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;
varying vec3 worldPos;
varying vec3 viewPos;

void main() {
    vec4 albedo = texture2D(texture, texcoord) * glcolor;
    if(albedo.a < alphaTestRef) discard;
    vec2 lm = clamp(lmcoord, 0.0, 1.0);
    vec3 norm = normalize(normal);

    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(albedo.rgb, albedo.a);
    gl_FragData[1] = vec4(norm*0.5+0.5, 0.0);
    gl_FragData[2] = vec4(lm, 0.0, 1.0);
}
