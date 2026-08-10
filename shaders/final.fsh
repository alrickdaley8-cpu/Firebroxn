#version 120
// Firebroxn - final.fsh
// Tonemapping, color grading, vignette, film grain

#include "/lib/common.glsl"

uniform sampler2D colortex0; // final HDR scene with bloom/godrays
uniform sampler2D depthtex0;
uniform float viewWidth;
uniform float viewHeight;
uniform int isEyeInWater;

varying vec2 texcoord;

void main() {
    vec3 color = texture2D(colortex0, texcoord).rgb;

    // --- Tonemapping (Firebroxn warm cinematic) ---
    color = firebroxnTonemap(color);

    // Slight saturation boost
    float lum = luma(color);
    color = mix(vec3(lum), color, 1.08);

    // Warm lift in shadows
    float shadowLift = 0.06 * (1.0 - lum);
    color += vec3(0.04, 0.02, 0.0) * shadowLift * (1.0 - rainStrength*0.5);

    // Rain desaturation & contrast
    if(rainStrength > 0.01) {
        color = mix(color, vec3(lum), rainStrength * 0.22);
        color *= (1.0 - rainStrength * 0.08);
    }

    // Underwater tint
    if(isEyeInWater == 1) {
        color = mix(color, color * vec3(0.45, 0.75, 0.95), 0.35);
        // wobble
        vec2 uv = texcoord;
        uv.x += sin(uv.y * 20.0 + frameTimeCounter*3.0) * 0.0015;
        uv.y += cos(uv.x * 18.0 + frameTimeCounter*2.4) * 0.0015;
        // Re-sample with offset? keep simple tint
    }

    // --- Vignette ---
    float vignette = 1.0;
    {
        vec2 uv = texcoord * 2.0 - 1.0;
        float d = dot(uv, uv) * 0.18;
        vignette = 1.0 - d;
        vignette = pow(vignette, 1.35);
        vignette = clamp(vignette, 0.0, 1.0);
        // stronger in corners
        color *= vignette * 0.18 + 0.82;
    }

    // --- Film grain / dithering (subtle) ---
    {
        float grain = interleavedGradientNoise(gl_FragCoord.xy + frameTimeCounter * 0.5);
        grain = (grain - 0.5) * 0.015;
        color += grain;
        // also bayer for banding
        float bayer = bayer8(gl_FragCoord.xy) / 255.0 * 0.008;
        color += bayer - 0.004;
    }

    // --- Chromatic aberration (very subtle at edges) ---
    // Disabled for now to keep crisp

    // --- Contrast & exposure tweak ---
    // Auto-exposure simulation: brighter at night slightly lifted
    float timeOfDay = fract(worldTime / 24000.0);
    float nightBoost = smoothstep(0.75, 0.85, fract(timeOfDay + 0.25)) * smoothstep(0.85, 0.75, fract(timeOfDay + 0.45));
    // not needed, keep linear

    // Clamp and gamma correction
    color = clamp(color, 0.0, 1.0);
    // Slight s-curve contrast
    color = color * (1.08 - 0.15 * color);

    // Output to screen
    gl_FragColor = vec4(toSRGB(color), 1.0);
    // Alternative: if using linear output, skip toSRGB; but final expects sRGB
    // Most shaderpacks output linear and let Minecraft handle gamma, but we do explicit
}
