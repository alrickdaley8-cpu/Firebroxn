#version 120
// Firebroxn - shadow.fsh
// Shadow color handling

uniform sampler2D texture;
uniform sampler2D lightmap;

varying vec2 texcoord;
varying vec4 glcolor;
varying float isFoliage;
varying float isWater;

void main() {
    vec4 color = texture2D(texture, texcoord) * glcolor;

    // Discard transparent
    if(color.a < 0.1) discard;

    // Foliage uses alpha test with dithering for softer shadows
    if(isFoliage > 0.5) {
        float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
        if(color.a < dither * 0.8) discard;
        // Make foliage shadows slightly translucent
        color.a *= 0.6;
    }

    if(isWater > 0.5) {
        // Water shadows - tinted, translucent
        color.rgb = mix(vec3(0.20, 0.45, 0.65), color.rgb, 0.25);
        color.a *= 0.45;
        // Keep water shadow color for shadowcolor0
    }

    // For shadowcolor0 - OptiFine expects alpha encoded where water etc
    // If fully opaque, write to shadowtex0 only; translucent also writes to shadowcolor0
    // We always write color
    gl_FragData[0] = color;
}
