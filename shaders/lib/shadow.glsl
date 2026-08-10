// Firebroxn - lib/shadow.glsl
// Shadow mapping & lighting helpers

#ifndef SHADOW_GLSL
#define SHADOW_GLSL

// Shadow bias based on normal and light direction to avoid acne/peter-panning
float computeShadowBias(vec3 normal, vec3 lightDir) {
    float NdotL = max(dot(normal, lightDir), 0.0);
    float bias = 0.0015 + 0.003 * (1.0 - NdotL);
    // increase bias at distance to avoid shadow acne
    return bias;
}

// PCF shadow filtering - soft shadows
float sampleShadowPCF(sampler2D shadowTex, vec3 shadowPos, float bias) {
    float shadow = 0.0;
    float radius = 1.2 / float(shadowMapResolution); // texel size * spread
    // dither rotation to reduce banding
    // Use interleaved gradient noise per fragment if available via gl_FragCoord
    // Fallback constant rotation if not.

    // 8-tap Poisson-ish kernel + 4 extra for 12 samples
    vec2 offsets[12];
    offsets[0]  = vec2( 0.0,  0.0);
    offsets[1]  = vec2( 1.5,  0.5) * radius;
    offsets[2]  = vec2(-1.2,  1.3) * radius;
    offsets[3]  = vec2(-1.8, -0.6) * radius;
    offsets[4]  = vec2( 1.0, -1.6) * radius;
    offsets[5]  = vec2( 0.8,  1.8) * radius;
    offsets[6]  = vec2(-0.5, -1.5) * radius;
    offsets[7]  = vec2( 1.8, -0.2) * radius;
    offsets[8]  = vec2(-1.5,  0.2) * radius;
    offsets[9]  = vec2( 0.3,  1.5) * radius;
    offsets[10] = vec2( 2.2,  1.0) * radius;
    offsets[11] = vec2(-2.0, -1.2) * radius;

    // slight adaptive spread based on shadow depth - softer farther away
    float distFade = clamp(length(shadowPos.xy) * 1.5, 0.5, 1.5);

    for(int i=0; i<SHADOW_SAMPLES; i++) {
        vec2 offset = offsets[i] * distFade;
        float depth = texture2D(shadowTex, shadowPos.xy + offset).r;
        shadow += step(shadowPos.z - bias, depth);
    }
    return shadow / float(SHADOW_SAMPLES);
}

// Shadow color handling (for translucent shadows like water, stained glass)
vec3 getShadowColor(sampler2D shadowColorTex, vec2 coord) {
    vec4 c = texture2D(shadowColorTex, coord);
    // shadowcolor0 is 0 when no translucent blocker, else contains color
    // OptiFine stores alpha as blocker presence
    return c.rgb * c.a + vec3(1.0 - c.a);
}

// Full shadow calculation: returns vec3(shadowFactor, subsurface, translucentTint)
vec3 calculateShadow(vec3 shadowPos, vec3 normal, vec3 lightDir, sampler2D shadowTex0, sampler2D shadowTex1, sampler2D shadowColor0) {
    if(shadowPos.x < 0.0 || shadowPos.x > 1.0 || shadowPos.y < 0.0 || shadowPos.y > 1.0 || shadowPos.z < 0.0 || shadowPos.z > 1.0) {
        return vec3(1.0); // outside shadow map = fully lit
    }

    float bias = computeShadowBias(normal, lightDir);
    float shadow0 = sampleShadowPCF(shadowTex0, shadowPos, bias);
    float shadow1 = sampleShadowPCF(shadowTex1, shadowPos, bias);

    // shadowTex0 = opaque + translucent, shadowTex1 = opaque only
    // If both 1 -> fully lit. If shadow0 0 but shadow1 1 -> translucent shadow
    float isTranslucent = max(shadow1 - shadow0, 0.0);
    vec3 tint = getShadowColor(shadowColor0, shadowPos.xy);
    // blend: opaque shadow = 0, translucent = tint * shadow, else lit
    vec3 result = mix(vec3(shadow0), tint * shadow0, isTranslucent);
    // soften translucent shadows a bit
    result = mix(result, vec3(1.0), isTranslucent * 0.25);

    // Fade shadows at distance
    float dist = length(shadowPos.xy * 2.0 - 1.0);
    float fade = smoothstep(0.85, 1.0, dist);
    result = mix(result, vec3(1.0), fade);

    // Rain darkens shadows
    result *= (1.0 - rainStrength * 0.35);

    return result;
}

float getShadowFade(vec2 shadowPos) {
    float dist = length(shadowPos * 2.0 - 1.0);
    return 1.0 - smoothstep(0.7, 1.0, dist);
}

#endif
