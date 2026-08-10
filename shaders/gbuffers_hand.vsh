#version 120
// Firebroxn - gbuffers_hand.vsh

attribute vec4 mc_Entity;
attribute vec4 at_tangent;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 glcolor;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord  = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor  = gl_Color;
    normal   = normalize(gl_NormalMatrix * gl_Normal);
    tangent  = normalize(gl_NormalMatrix * at_tangent.xyz);
    binormal = normalize(cross(tangent, normal) * at_tangent.w);
    gl_Position = ftransform();
}
