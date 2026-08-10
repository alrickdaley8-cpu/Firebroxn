#version 120
// Firebroxn - gbuffers_skybasic.vsh
// Simple sky dome pass-through

uniform mat4 gbufferModelView;
uniform mat4 gbufferProjection;

varying vec3 viewDir;
varying vec4 glcolor;

void main() {
    gl_Position = ftransform();
    glcolor = gl_Color;
    // view direction in view space
    vec4 pos = gbufferModelView * gl_Vertex;
    viewDir = normalize(pos.xyz);
    // ensure sky renders behind everything
    gl_Position.z = gl_Position.w * 0.9999;
}
