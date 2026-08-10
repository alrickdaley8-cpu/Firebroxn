#version 120
// Firebroxn - composite.fsh
// Main lighting: shadows, GI, water, fog, godrays

#include "/lib/common.glsl"
#include "/lib/sky.glsl"
#include "/lib/shadow.glsl"
#include "/lib/water.glsl"
#include "/lib/lighting.glsl"

uniform sampler2D colortex0; // albedo
uniform sampler2D colortex1; // normals
uniform sampler2D colortex2; // lightmap + foliage flag
uniform sampler2D depthtex0;
uniform sampler2D depthtex1;
uniform sampler2D shadowtex0;
uniform sampler2D shadowtex1;
uniform sampler2D shadowcolor0;
uniform sampler2D noisetex;

uniform mat4 gbufferProjection;
uniform mat4 gbufferProjectionInverse;
uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform mat4 shadowProjection;
uniform mat4 shadowProjectionInverse;
uniform mat4 shadowModelView;
uniform mat4 shadowModelViewInverse;

uniform float viewWidth;
uniform float viewHeight;
uniform float sunAngle;
uniform int isEyeInWater;
uniform float wetness;
uniform ivec2 eyeBrightness;
uniform ivec2 eyeBrightnessSmooth;
uniform float aspectRatio;

varying vec2 texcoord;

// Reconstruct view position from depth
vec3 viewFromDepth(float depth) {
    vec4 clip = vec4(texcoord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 view = gbufferProjectionInverse * clip;
    view /= view.w;
    return view.xyz;
}
vec3 worldFromView(vec3 view) {
    vec4 world = gbufferModelViewInverse * vec4(view, 1.0);
    return world.xyz;
}

// Screen-space godrays - raymarch towards sun in screen space based on shadows
float computeGodRays(vec3 viewPos, vec3 lightDirView, float dither) {
#ifdef GODRAYS_ENABLED
    // Only when sun is visible and not too overcast
    float sunVis = getSunVisibility();
    if(sunVis < 0.05 || rainStrength > 0.7) return 0.0;

    // Project sun position to screen
    vec4 sunClip = gbufferProjection * vec4(lightDirView * 1000.0, 1.0);
    sunClip /= sunClip.w;
    vec2 sunScreen = sunClip.xy * 0.5 + 0.5;
    // If sun behind, no rays
    if(sunClip.z > 0.0) {
        // still allow scattering when sun not directly visible but near edge?
    }

    // Volumetric scattering - march from current pixel towards sun
    vec2 delta = (texcoord - sunScreen) * (1.0 / float(GODRAY_SAMPLES));
    float decay = 0.97;
    float exposure = 0.22 * sunVis * (1.0 - rainStrength*0.6);
    float illuminationDecay = 1.0;
    float ray = 0.0;

    // Sample depth & shadow along ray
    for(int i=0; i<GODRAY_SAMPLES; i++) {
        vec2 sampleUV = texcoord - delta * (float(i) + dither);
        if(sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) continue;
        float sampleDepth = texture2D(depthtex0, sampleUV).r;
        // If sky (depth=1) -> fully visible to sun, else check shadow?
        // Use shadow texture to approximate occlusion - we sample shadow depth at that point's world pos?
        // Simplified: assume sky = lit, terrain = maybe shadowed but we use depth to fade
        float sampleSky = step(0.999, sampleDepth); // 1 if sky
        // weight by distance from sun
        vec2 toSun = sampleUV - sunScreen;
        float distFromSun = length(toSun);
        float sunFalloff = 1.0 - smoothstep(0.0, 0.85, distFromSun);
        ray += sampleSky * illuminationDecay * sunFalloff;
        illuminationDecay *= decay;
    }
    ray *= exposure;
    // Soften
    ray = pow(ray, 1.15) * 1.2;
    return clamp(ray, 0.0, 1.0);
#else
    return 0.0;
#endif
}

void main() {
    vec4 albedoAlpha = texture2D(colortex0, texcoord);
    vec3 albedo = albedoAlpha.rgb;
    float alpha = albedoAlpha.a;

    vec4 normalData = texture2D(colortex1, texcoord);
    vec3 normalEnc = normalData.rgb;
    vec3 normal = normalize(normalEnc * 2.0 - 1.0);
    float isWaterFlag = normalData.a; // we packed water flag there

    vec4 lmData = texture2D(colortex2, texcoord);
    vec2 lmcoord = lmData.xy;
    float isFoliagePacked = lmData.z; // contains foliage/leaves info

    float depth0 = texture2D(depthtex0, texcoord).r;
    float depth1 = texture2D(depthtex1, texcoord).r;

    // Sky handling - when depth is 1.0, it's sky
    bool isSky = depth0 >= 0.9999;

    // Reconstruct positions
    vec3 viewPos = viewFromDepth(depth0);
    vec3 worldPos = worldFromView(viewPos) + cameraPosition;
    float viewDist = length(viewPos);

    vec3 viewDir = normalize(viewPos);
    vec3 worldDir = normalize(worldFromView(viewDir));

    vec3 sunDirWorld = normalize(sunPosition);
    vec3 moonDirWorld = normalize(moonPosition);
    vec3 sunDirView = normalize((gbufferModelView * vec4(sunDirWorld, 0.0)).xyz);
    vec3 moonDirView = normalize((gbufferModelView * vec4(moonDirWorld, 0.0)).xyz);
    vec3 lightDirWorld = sunDirWorld;
    float sunVis = getSunVisibility();
    float moonVis = getMoonVisibility();
    // Choose dominant light
    vec3 dominantLightDir = (sunVis > 0.1) ? sunDirWorld : moonDirWorld;
    vec3 dominantLightDirView = (sunVis > 0.1) ? sunDirView : moonDirView;
    vec3 lightColor = (sunVis > 0.1) ? FIREBROXN_SUN_COLOR : vec3(0.65, 0.75, 1.0) * 0.45;

    // Underwater handling
    if(isEyeInWater == 1) {
        // Underwater fog -murky blue with caustics wobble
        vec3 waterFog = vec3(0.06, 0.22, 0.38);
        float fog = fogFactorExp(viewDist, 0.045);
        // caustics
        vec2 causticUV = worldPos.xz * 0.08 + frameTimeCounter * 0.12;
        float caustic = fbm(causticUV * 2.0) * 0.5 + fbm(causticUV * 4.0) * 0.25;
        caustic = pow(caustic, 2.2) * 0.35;
        vec3 color = albedo;
        if(isSky) {
            color = waterFog * 1.2;
        } else {
            // tint albedo to water
            color *= vec3(0.75, 0.95, 1.0);
            color = mix(color, waterFog, fog * 0.85);
            color += caustic * (1.0 - fog) * 0.6 * max(dot(normal, dominantLightDir),0.0);
        }
        // Apply FK dim
        color *= 0.85;
        /* DRAWBUFFERS:01 */
        gl_FragData[0] = vec4(color, 1.0);
        // bloom extract small
        float bright = luma(color);
        gl_FragData[1] = vec4(color * smoothstep(0.75, 1.0, bright) * 0.6, 1.0);
        return;
    }

    // ---- Sky pixel: keep sky color + add godrays + fog ----
    if(isSky) {
        vec3 skyColor = albedo; // from gbuffers_skybasic already contains our procedural sky
        // For safety if albedo is black (fallback), compute sky again
        if(luma(skyColor) < 0.001) {
            vec3 worldViewDir = normalize(worldFromView(viewDir));
            skyColor = getSkyColor(worldViewDir, sunDirWorld, moonDirWorld, sunVis, moonVis, rainStrength);
        }

        // Godrays for sky
        float dither = interleavedGradientNoise(gl_FragCoord.xy);
        float godray = computeGodRays(viewPos, sunDirView, dither);
        vec3 godrayColor = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.92, 0.78), 0.5) * (0.8 + sunVis*0.2);
        skyColor += godray * godrayColor * 0.85;

        // Atmospheric haze near horizon - already in sky model, add extra for distance
        // No fog for sky itself

        /* DRAWBUFFERS:012 */
        gl_FragData[0] = vec4(skyColor, 1.0);
        // bloom from sun halo
        float sunSpot = pow(max(dot(-worldDir, sunDirWorld),0.0), 32.0);
        gl_FragData[1] = vec4(skyColor * sunSpot * 0.6 + godrayColor * godray * 0.35, 1.0);
        gl_FragData[2] = vec4(vec3(godray) * 0.6, 1.0);
        return;
    }

    // ---- Terrain / entity / water pixel ----

    // Lightmap
    vec2 lm = clamp(lmcoord, 0.0, 1.0);
    float torchLight = pow(lm.x, 2.2) * 1.1; // block light
    float skyLight = pow(lm.y, 2.2);
    // Smooth lightmap a bit
    torchLight = smoothstep(0.0, 1.0, torchLight);
    skyLight = smoothstep(0.0, 1.0, skyLight);

    // Shadows
    vec3 shadow = vec3(1.0);
    float shadowFade = 1.0;
#ifdef SHADOWS_ENABLED
    // Compute shadow position
    // Transform worldPos to shadow clip space
    vec4 shadowViewPos = shadowModelView * vec4(worldPos - cameraPosition, 1.0);
    vec4 shadowClipPos = shadowProjection * shadowViewPos;
    // Distort
    float distort = distortFactor(shadowClipPos.xy);
    shadowClipPos.xy *= distort;
    vec3 shadowNDC = shadowClipPos.xyz / shadowClipPos.w;
    vec3 shadowScreen = shadowNDC * 0.5 + 0.5;

    // Bias handled inside shadow lib
    // Use filtered shadow
    // Only if skyLight > 0.01 (avoid shadow in caves)
    if(skyLight > 0.01) {
        // Adapt normal for shadow bias - world normal
        mat3 tbn = mat3(gbufferModelViewInverse);
        vec3 worldNormal = normalize(tbn * normal);
        // If foliage, relax bias
        float foliageFactor = isFoliagePacked;
        vec3 shadowResult = calculateShadow(shadowScreen, worldNormal, dominantLightDir, shadowtex0, shadowtex1, shadowcolor0);
        shadow = shadowResult;
        shadowFade = getShadowFade(shadowScreen.xy);
        // Interpolate shadow with skyLight - caves shouldn't have direct sun shadow
        shadow = mix(vec3(1.0), shadow, skyLight);
        // Also fade with distance
        float shadowDistFade = clamp(1.0 - viewDist / (shadowDistance * 0.92), 0.0, 1.0);
        shadowDistFade = pow(shadowDistFade, 0.7);
        shadow = mix(vec3(1.0), shadow, shadowDistFade * shadowFade);
        // Rain softens shadows
        shadow = mix(shadow, vec3(1.0) * (0.7 + 0.3*skyLight), rainStrength * 0.35);
    }
#endif

    // ---- Shading ----

    // Determine material properties - foliage is slightly translucent
    float subsurface = isFoliagePacked * 0.9; // leaves scatter more

    // World normal for lighting
    mat3 toWorld = mat3(gbufferModelViewInverse);
    vec3 worldNormal = normalize(toWorld * normal);
    // If normal is degenerate (0,0,0) fallback to up
    if(length(normalEnc) < 0.01) worldNormal = vec3(0.0, 1.0, 0.0);

    // NdotL
    float NdotL = dot(worldNormal, dominantLightDir);

    // Diffuse
    vec3 diffuse = computeDiffuse(albedo, worldNormal, dominantLightDir, shadow, NdotL, shadowFade, subsurface);

    // Ambient (sky + torch)
    // Sky light color based on time
    vec3 skyLightColor = mix(FIREBROXN_AMBIENT_NIGHT, FIREBROXN_SKY_DAY_HORIZON * 0.9 + vec3(0.15,0.1,0.05), sunVis * (1.0 - rainStrength*0.5));
    skyLightColor = mix(skyLightColor, vec3(0.55,0.60,0.68), rainStrength*0.45);
    // Torches: flicker
    float torchFlicker = 1.0 + sin(frameTimeCounter * 4.5) * 0.015 + sin(frameTimeCounter * 9.2)*0.008;
    vec3 torchColor = texture2D(colortex0, texcoord).rgb; // dummy keep warm
    vec3 ambient = computeAmbient(albedo, skyLightColor, vec3(torchLight * torchFlicker), skyLight, 1.0);

    // Specular - small highlight for wet surfaces
    float roughness = 0.8;
    float wet = wetness * skyLight;
    if(wet > 0.1) roughness = mix(roughness, 0.25, wet * 0.6);
    // Also make water reflective handled separately
    float spec = 0.0;
    if(isWaterFlag < 0.5) {
        vec3 viewDirWorld = normalize(cameraPosition - worldPos);
        spec = computeSpecular(worldNormal, viewDirWorld, dominantLightDir, shadow, roughness, 0.04);
    }

    vec3 color = diffuse + ambient + spec * lightColor * 1.2;

    // ---- Water handling ----
    if(isWaterFlag > 0.5) {
        // Water surface: replace diffuse logic with water shader
        // Recompute water normal with waves
        vec3 waterNorm = waterNormal(worldPos.xz, frameTimeCounter * 1.1);
        // Blend with geometric normal based on view distance (closer = more wave detail)
        float waveMix = clamp(1.0 - viewDist / 55.0, 0.0, 1.0) * (1.0 - rainStrength*0.2 + 0.2);
        worldNormal = normalize(mix(worldNormal, waterNorm, waveMix * 0.85));

        // Fresnel
        vec3 viewDirWorld = normalize(cameraPosition - worldPos);
        float cosTheta = max(dot(worldNormal, viewDirWorld), 0.0);
        float F0 = 0.02;
        float fresnel = fresnelSchlick(cosTheta, F0);
        fresnel = mix(fresnel, 0.92, pow(1.0 - cosTheta, 3.0) * 0.45); // boost glancing

        // Reflections: SSR approximation
        vec3 reflectedDirView = reflect(-viewDir, mat3(gbufferModelView) * worldNormal);
        // For reflection we sample sky if SSR ray misses, else sample colortex0 along reflection
        // Simple planar reflection: reflect worldDir around water normal and sample sky
        vec3 reflectedDirWorld = reflect(-worldDir, worldNormal);
        vec3 skyRefl = getSkyColor(reflectedDirWorld, sunDirWorld, moonDirWorld, sunVis, moonVis, rainStrength);
        // Add sun specular reflection
        float sunRefl = pow(max(dot(reflectedDirWorld, dominantLightDir),0.0), 256.0) * 3.5 * (1.0 - rainStrength*0.45) * max(0.0, NdotL*0.5+0.5);
        skyRefl += lightColor * sunRefl;

        // SSR - trace one step screen space
        vec3 reflColor = skyRefl;
#ifdef REFLECTIONS_ENABLED
        // Naive SSR: project reflected ray to screen and sample colortex0/depth
        vec3 reflViewPos = viewPos + reflectedDirView * 4.0; // small step
        vec4 reflClip = gbufferProjection * vec4(reflViewPos, 1.0);
        vec2 reflUV = (reflClip.xy / reflClip.w) * 0.5 + 0.5;
        if(reflUV.x > 0.0 && reflUV.x < 1.0 && reflUV.y > 0.0 && reflUV.y < 1.0) {
            float reflDepth = texture2D(depthtex0, reflUV).r;
            vec3 reflViewPos2 = viewFromDepth(reflDepth);
            // Check if reflection hits geometry and not sky
            if(reflDepth < 0.999) {
                // Weight by view distance and fresnel and distance falloff
                float edgeFade = (1.0 - pow(clamp(abs(reflUV.x*2.0-1.0),0.0,1.0), 8.0)) * (1.0 - pow(clamp(abs(reflUV.y*2.0-1.0),0.0,1.0), 8.0));
                float distFade = clamp(1.0 - length(reflUV - texcoord)*2.2, 0.0, 1.0);
                vec3 hitColor = texture2D(colortex0, reflUV).rgb;
                // Approximate lit color of hit? Use sampled albedo but tint to reflection
                // Better to use composite previous? For SSR we only have albedo here prior to lighting, so fallback mix
                reflColor = mix(skyRefl, hitColor * 0.85 + skyRefl*0.25, edgeFade * distFade * 0.55 * fresnel );
            }
        }
#endif
        // Water depth - estimate via depth difference between water surface and opaque behind it
        float waterDepthLinear = linearizeDepth(depth1) - linearizeDepth(depth0);
        waterDepthLinear = clamp(waterDepthLinear / far * 6.0, 0.0, 1.0);
        // For solid water surface depth1 may be far? Approximate
        if(depth1 >= 0.999) waterDepthLinear = clamp((far - linearizeDepth(depth0)) / 22.0, 0.0, 1.0);

        // Shadow under water - caustics boost
        float waterShadow = luma(shadow);
        vec3 waterCol = getWaterColor(waterDepthLinear, reflColor, fresnel, viewDir, dominantLightDir, waterShadow);

        // Specular highlight on water
        float waterSpec = waterSpecular(viewDirWorld, dominantLightDir, worldNormal, 0.15) * (1.0 - rainStrength*0.25) * shadowFade * luma(shadow);
        waterCol += lightColor * waterSpec * 1.8;

        // Mix water color with original diffuse based on fresnel? Already done
        color = waterCol;
        // Subsurface scattering for shallow water
        color += albedo * 0.015 * subsurface; // shouldn't matter

        // Underwater tint for viewer above? not needed
    }

    // ---- Fog ----

    // Distance fog - atmospheric perspective
    float fogDensity = 0.0012 * (1.0 + rainStrength * 1.2);
    // Thicker fog in valleys, thinner on peaks
    fogDensity *= mix(1.35, 0.75, clamp((worldPos.y - 62.0)/ 140.0, 0.0, 1.0));
    // Rain fog thicker
    // Compute sky fog color from sky in view direction
    vec3 fogSkyColor = getSkyColor(normalize(worldPos - cameraPosition + vec3(0.0, 35.0, 0.0)), sunDirWorld, moonDirWorld, sunVis, moonVis, rainStrength);
    // Add firebroxn warm sunset fog near horizon
    float horizonFactor = pow(clamp(1.0 - max(dot(normalize(worldPos - cameraPosition), vec3(0,1,0)),0.0),0.0,1.0), 2.5);
    fogSkyColor = mix(fogSkyColor, FIREBROXN_SKY_SUNSET * 0.55 + vec3(0.35), horizonFactor * sunVis * 0.25 * (1.0 - rainStrength*0.6));

    float fog = fogFactorExp(viewDist, fogDensity);
    // Height fog - more dense at low altitude
    float heightFog = exp(-max(worldPos.y - 58.0, 0.0) / 85.0);
    fog = mix(fog * 0.55, fog, heightFog * 0.55 + 0.45);
    // Far distance boost for vista
    fog = clamp(fog * 1.1, 0.0, 0.88);
    // Rain fog boost already

    // Apply fog
    color = mix(color, fogSkyColor, fog);

    // ---- Godrays / Volumetric Light (screen space) ----
    float dither = interleavedGradientNoise(gl_FragCoord.xy + frameTimeCounter);
    float godray = computeGodRays(viewPos, sunDirView, dither);
    vec3 godrayCol = mix(vec3(1.0, 0.88, 0.62), vec3(1.0, 0.95, 0.82), 0.45) * sunVis;
    // Mask godray where in shadow or fog
    godray *= (1.0 - fog * 0.35) * luma(shadow) * skyLight * 0.85;
    godray *= (1.0 - rainStrength * 0.55);
    // Under foliage, less godray
    godray *= (1.0 - subsurface * 0.25);
    color += godray * godrayCol * 0.75;

    // ---- Rain / Wet darkening ----
    if(rainStrength > 0.01) {
        // wet surfaces darker
        float wetFactor = wetness * skyLight * (1.0 - isWaterFlag);
        color = mix(color, color * 0.88, wetFactor * rainStrength * 0.35);
        // rain fog already done
    }

    // ---- Night eye adjustment / torch flicker already ----
    // Slight exposure adaptation: brighten caves slightly
    float avgLuma = 0.5; // placeholder
    // not implementing auto-exposure

    // ---- Output ----
    // Clamp HDR to avoid INF
    color = max(color, vec3(0.0));
    color = min(color, vec3(12.0));

    // Bloom extract - bright parts
    float bloomLuma = luma(color);
    float bloomThresh = 1.15; // HDR threshold
    vec3 bloom = max(color - bloomThresh, 0.0) * 0.85;
    // Boost sun reflection bloom
    bloom += godray * godrayCol * 0.35;

    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(color, 1.0);
    gl_FragData[1] = vec4(bloom, 1.0);
    gl_FragData[2] = vec4(vec3(godray) * 0.8, 1.0);
}
