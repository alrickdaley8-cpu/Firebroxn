// Firebroxn - lib/common.glsl
// Shared utilities, constants and helpers
// Included by almost every shader

#ifndef COMMON_GLSL
#define COMMON_GLSL

// ---------- Global Uniforms (declared here for forward visibility) ----------
// These are provided by OptiFine/Iris; declaring here ensures functions see them before use.
// If a shader re-declares them after include, the duplicate will be removed by the shader's own guards -
// so we use conditional declaration via macro trick: only declare if not already defined.
// We rely on GLSL's ability to tolerate duplicate uniform declarations in some drivers? To be safe,
// we do NOT declare duplicates in including shaders (they should rely on this file).
// Included shaders should NOT redeclare these.
uniform float rainStrength;
uniform int worldTime;
uniform vec3 sunPosition;
uniform vec3 moonPosition;
uniform float frameTimeCounter;
uniform float near;
uniform float far;
uniform int shadowMapResolution;
uniform float shadowDistance;
uniform float eyeAltitude;
uniform vec3 cameraPosition;
uniform vec3 upPosition;

// ---------- Constants ----------
#define PI 3.14159265359
#define TAU 6.28318530718
#define INV_PI 0.31830988618
#define GOLDEN_RATIO 1.61803398875

// ---------- Feature Toggles (default ON) ----------
#ifndef SHADOWS_ENABLED
  #define SHADOWS_ENABLED
#endif
#ifndef GODRAYS_ENABLED
  #define GODRAYS_ENABLED
#endif
#ifndef WAVING_ENABLED
  #define WAVING_ENABLED
#endif
#ifndef REFLECTIONS_ENABLED
  #define REFLECTIONS_ENABLED
#endif
#ifndef BLOOM_ENABLED
  #define BLOOM_ENABLED
#endif

// Quality
#define SHADOW_SAMPLES 12
#define GODRAY_SAMPLES 12
#define BLOOM_STRENGTH 0.55

// ---------- Color Palette - Firebroxn Warm Cinematic ----------
const vec3 FIREBROXN_SUN_COLOR      = vec3(1.00, 0.92, 0.78);
const vec3 FIREBROXN_SKY_DAY_TOP    = vec3(0.28, 0.55, 0.95);
const vec3 FIREBROXN_SKY_DAY_HORIZON= vec3(0.78, 0.88, 0.98);
const vec3 FIREBROXN_SKY_SUNSET     = vec3(1.00, 0.42, 0.18);
const vec3 FIREBROXN_SKY_NIGHT_TOP  = vec3(0.015, 0.02, 0.08);
const vec3 FIREBROXN_SKY_NIGHT_HORIZON = vec3(0.06, 0.08, 0.18);
const vec3 FIREBROXN_FOG_DAY        = vec3(0.78, 0.85, 0.95);
const vec3 FIREBROXN_TORCH_COLOR    = vec3(1.00, 0.60, 0.20);
const vec3 FIREBROXN_AMBIENT_NIGHT  = vec3(0.18, 0.22, 0.45);

// ---------- Math Helpers ----------
float linearizeDepth(float depth) {
    return (2.0 * near * far) / (far + near - depth * (far - near));
}

float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 toLinear(vec3 srgb) {
    return pow(srgb, vec3(2.2));
}
vec3 toSRGB(vec3 linear) {
    return pow(linear, vec3(1.0/2.2));
}

// ACES Filmic Tonemapping (Narkowicz approximation) - warm & filmic
vec3 acesTonemap(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Slightly warmer ACES for Firebroxn look
vec3 firebroxnTonemap(vec3 color) {
    color = acesTonemap(color * 1.15);
    // warm push in highlights
    color = mix(color, color * vec3(1.04, 1.00, 0.92), luma(color) * 0.35);
    // contrast
    color = pow(color, vec3(1.02));
    return color;
}

// Hash / Noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for(int i=0; i<4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// Bayer 4x4 dithering - compatible with GLSL 120
float bayer4(vec2 p) {
    // 4x4 Bayer matrix without array - formula based
    vec2 c = mod(p, 4.0);
    // Index: 0..15
    // Use branching for compatibility
    float b = 0.0;
    if(c.x < 1.0) {
        if(c.y < 1.0) b = 0.0; else if(c.y < 2.0) b = 8.0; else if(c.y < 3.0) b = 2.0; else b = 10.0;
    } else if(c.x < 2.0) {
        if(c.y < 1.0) b = 12.0; else if(c.y < 2.0) b = 4.0; else if(c.y < 3.0) b = 14.0; else b = 6.0;
    } else if(c.x < 3.0) {
        if(c.y < 1.0) b = 3.0; else if(c.y < 2.0) b = 11.0; else if(c.y < 3.0) b = 1.0; else b = 9.0;
    } else {
        if(c.y < 1.0) b = 15.0; else if(c.y < 2.0) b = 7.0; else if(c.y < 3.0) b = 13.0; else b = 5.0;
    }
    return b / 16.0;
}
float bayer8(vec2 p) { return bayer4(p * 2.0) * 0.5 + bayer4(p) * 0.5; }
float interleavedGradientNoise(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// Shadow distortion (improves shadow map usage near player)
vec2 distortShadow(vec2 pos, float bias) {
    float dist = length(pos);
    float factor = mix(1.0, dist, 0.85);
    factor = 1.0 / factor;
    return pos * factor;
}
float distortFactor(vec2 pos) {
    float dist = length(pos);
    return mix(1.0, dist, 0.85);
}

// World time helpers (0-24000)
float getTimeOfDay() {
    // 0.0 = sunrise (0), 0.25 = noon (6000), 0.5 = sunset (12000), 0.75 = midnight (18000)
    return fract(worldTime / 24000.0);
}
float getSunVisibility() {
    float t = getTimeOfDay();
    // smooth day visibility, peaks at noon, zero at night
    float vis = smoothstep(0.75, 0.80, fract(t + 0.25)) * (1.0 - smoothstep(0.20, 0.30, fract(t + 0.25)));
    // alternative simpler: use sunAngle
    float s = clamp(dot(normalize(sunPosition), vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
    // blend with rain
    s *= (1.0 - rainStrength * 0.7);
    return s;
}
float getMoonVisibility() {
    return clamp(dot(normalize(moonPosition), vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0) * (1.0 - getSunVisibility());
}

// Fog
float fogFactorExp(float dist, float density) {
    return 1.0 - exp(-dist * density);
}
float fogFactorLinear(float dist, float start, float end) {
    return clamp((dist - start) / (end - start), 0.0, 1.0);
}

// Fresnel
float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

// Convert view space to world etc helpers are done per shader where needed

#endif
