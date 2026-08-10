#version 120
// Firebroxn - gbuffers_skytextured.fsh
// Enhance sun/moon textures - make sun larger / warmer and moon slightly glow

#include "/lib/common.glsl"

uniform sampler2D texture;

varying vec2 texcoord;
varying vec4 glcolor;

void main() {
    vec4 color = texture2D(texture, texcoord) * glcolor;

    if(color.a < 0.01) discard;

    // Boost sun color to Firebroxn warm
    // Detect sun vs moon via worldTime: sun visible when sun angle high
    float sunVis = getSunVisibility();
    // The skytextured is used for both sun and moon - glcolor hints? We'll just enhance whatever is drawn

    // Make sun slightly larger? Can't scale here, but can bloom edges
    // If it's bright (sun), warm it
    float l = luma(color.rgb);
    if(l > 0.7) {
        // likely sun
        color.rgb *= vec3(1.06, 1.00, 0.88);
        color.rgb = pow(color.rgb, vec3(0.95)); // slight contrast
    } else {
        // moon - slightly cooler
        color.rgb *= vec3(0.98, 1.02, 1.08);
    }

    // Rain fades sun/moon
    color.a *= (1.0 - rainStrength * 0.65);

    /* DRAWBUFFERS:0 */
    gl_FragData[0] = color;
}
