#version 120
// Firebroxn - gbuffers_clouds.vsh
#include "/lib/common.glsl"
uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferProjection;

varying vec2 texcoord;
varying vec4 glcolor;
varying vec3 worldPos;
varying vec3 viewPos;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    glcolor = gl_Color;
    vec4 pos = gbufferModelViewInverse * gl_ModelViewMatrix * gl_Vertex;
    worldPos = pos.xyz + cameraPosition;
    // Animate clouds drift
    float time = frameTimeCounter * 0.035;
    worldPos.x += time * 4.5;
    worldPos.z += time * 1.2;
    pos.xyz = worldPos - cameraPosition;
    viewPos = (gbufferModelView * pos).xyz;
    gl_Position = gbufferProjection * gbufferModelView * pos;
}
