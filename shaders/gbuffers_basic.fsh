#version 120
uniform sampler2D texture;
uniform sampler2D lightmap;
uniform float alphaTestRef;
varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 glcolor;
varying vec3 normal;
void main() {
    vec4 albedo = texture2D(texture, texcoord) * glcolor;
    if(albedo.a < alphaTestRef * 0.5) discard;
    vec2 lm = clamp(lmcoord, 0.0, 1.0);
    vec3 n = normalize(normal);
    /* DRAWBUFFERS:012 */
    gl_FragData[0] = albedo;
    gl_FragData[1] = vec4(n*0.5+0.5, 0.0);
    gl_FragData[2] = vec4(lm, 0.0, 1.0);
}
