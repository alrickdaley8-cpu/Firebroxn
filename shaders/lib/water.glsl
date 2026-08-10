// Firebroxn - lib/water.glsl
// Water shading: Fresnel, waves, reflections

#ifndef WATER_GLSL
#define WATER_GLSL

// Gerstner-like wave normal
vec3 waterNormal(vec2 pos, float time) {
    // Two wave layers at different scales/speeds
    vec2 p = pos * 0.08;
    float t = time * 0.9;

    float h1 = sin(p.x * 1.0 + t * 1.2) * 0.5 + cos(p.y * 0.8 + t * 0.9) * 0.5;
    float h2 = sin(p.x * 1.7 - t * 1.0 + p.y * 0.6) * 0.35;
    float h3 = sin(p.x * 0.5 + p.y * 1.3 + t * 0.7) * 0.25;

    float h = h1 + h2 + h3;

    // Derivatives for normal
    float ddx = cos(p.x * 1.0 + t * 1.2) * 1.0 * 0.5
              + cos(p.x * 1.7 - t * 1.0 + p.y * 0.6) * 1.7 * 0.35
              + cos(p.x * 0.5 + p.y * 1.3 + t * 0.7) * 0.5 * 0.25;
    float ddy = -sin(p.y * 0.8 + t * 0.9) * 0.8 * 0.5
              + cos(p.x * 1.7 - t * 1.0 + p.y * 0.6) * 0.6 * 0.35
              + cos(p.x * 0.5 + p.y * 1.3 + t * 0.7) * 1.3 * 0.25;

    ddx *= 0.08;
    ddy *= 0.08;

    vec3 n = normalize(vec3(-ddx, 1.0, -ddy));
    // blend with up normal based on distance (less waves far)
    return n;
}

float waterWaveHeight(vec2 pos, float time) {
    vec2 p = pos * 0.08;
    float t = time * 0.9;
    return sin(p.x + t*1.2)*0.12 + cos(p.y*0.8 + t*0.9)*0.12 + sin(p.x*1.7 - t + p.y*0.6)*0.08;
}

// Specular for water
float waterSpecular(vec3 viewDir, vec3 lightDir, vec3 normal, float roughness) {
    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float shininess = mix(512.0, 32.0, roughness);
    return pow(NdotH, shininess) * (shininess * 0.08 + 0.2);
}

vec3 waterColorShallow = vec3(0.22, 0.55, 0.68);
vec3 waterColorDeep    = vec3(0.06, 0.18, 0.42);
vec3 waterColorTropic  = vec3(0.10, 0.55, 0.52); // for warm biomes blend (unused but reserved)

vec3 getWaterColor(float depth, vec3 skyReflection, float fresnel, vec3 viewDir, vec3 lightDir, float shadow) {
    // depth 0=shallow to 1=deep (linearized)
    vec3 base = mix(waterColorShallow, waterColorDeep, clamp(depth*1.8, 0.0, 1.0));
    // subtle absorption
    base *= (0.9 + shadow * 0.12);
    // reflection mix
    vec3 reflected = skyReflection * (0.8 + 0.4 * pow(max(dot(-viewDir, vec3(0,1,0)),0.0),2.0));
    // Firebroxn warm tint in shallow water at sunset
    float sunsetWarm = smoothstep(0.2, 0.6, dot(lightDir, vec3(0,1,0))) * (1.0 - rainStrength*0.7);
    base = mix(base, base * vec3(1.1, 0.95, 0.85) + vec3(0.04, 0.02, 0.0), sunsetWarm * 0.15 * (1.0 - depth));
    return mix(base, reflected, fresnel * 0.92);
}

#endif
