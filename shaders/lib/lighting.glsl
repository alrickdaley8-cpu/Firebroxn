// Firebroxn - lib/lighting.glsl
// PBR-ish lighting, diffuse + specular + ambient

#ifndef LIGHTING_GLSL
#define LIGHTING_GLSL

vec3 computeDiffuse(vec3 albedo, vec3 normal, vec3 lightDir, vec3 shadow, float NdotL, float shadowFade, float subsurface) {
    float diff = max(NdotL, 0.0);
    // wrap lighting for foliage / a bit of subsurface scattering
    float wrap = 0.5;
    float wrappedDiff = max((NdotL + wrap) / (1.0 + wrap), 0.0);
    // mix wrapped for foliage, regular for hard surfaces based on subsurface value
    float finalDiff = mix(diff, wrappedDiff, subsurface * 0.65);

    vec3 lit = albedo * finalDiff * shadow * FIREBROXN_SUN_COLOR * (0.95 + shadowFade*0.05);
    // translucency boost for leaves lit from behind
    lit += albedo * subsurface * 0.25 * pow(max(-NdotL, 0.0), 1.5) * shadowFade * (1.0 - rainStrength*0.5);

    return lit;
}

vec3 computeAmbient(vec3 albedo, vec3 skyLightColor, vec3 torchLight, float skyLight, float occlusion) {
    // Sky ambient - hemisphere
    vec3 skyAmbient = skyLightColor * skyLight * 0.9;
    skyAmbient += FIREBROXN_AMBIENT_NIGHT * (1.0 - skyLight) * 0.35 * (1.0 - getSunVisibility());
    // Torch / block light - warm and pulsing slightly
    vec3 blockAmbient = torchLight * FIREBROXN_TORCH_COLOR * 1.15;
    // Ambient occlusion applied
    float ao = clamp(occlusion, 0.0, 1.0);
    return albedo * (skyAmbient * ao + blockAmbient * (1.0 - ao * 0.15));
}

float computeSpecular(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 shadow, float roughness, float f0) {
    if(dot(shadow, vec3(1.0)) < 0.01) return 0.0;
    vec3 halfDir = normalize(viewDir + lightDir);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    float NdotL = max(dot(normal, lightDir), 0.0);
    if(NdotL <= 0.0) return 0.0;
    float shininess = mix(256.0, 16.0, roughness);
    float spec = pow(NdotH, shininess) * (shininess * 0.05 + 0.3);
    spec *= fresnelSchlick(NdotV, f0);
    spec *= NdotL;
    spec *= luma(shadow);
    // rain reduces specular sharpness
    spec *= (1.0 - rainStrength * 0.3);
    return spec;
}

// Simple SSAO approximation using depth neighbors is done in composite if needed
// Here just a cheap AO from lightmap / normal
float getAO(vec2 lightmap) {
    // lightmap.y is sky light 0-1
    return clamp(lightmap.y * 1.1 + 0.15, 0.0, 1.0);
}

#endif
