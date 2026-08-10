#version 120
// Firebroxn - gbuffers_weather.fsh
// Rain/snow with slight blur / refraction attempt

uniform sampler2D texture;
varying vec2 texcoord;
varying vec4 glcolor;
void main() {
    vec4 color = texture2D(texture, texcoord) * glcolor;
    // Soften rain a bit
    color.a *= 0.75;
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = color;
}
