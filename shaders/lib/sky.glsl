// Firebroxn - lib/sky.glsl
// Procedural sky model + sun/moon/stars

#ifndef SKY_GLSL
#define SKY_GLSL

// Include common for utilities
// Note: include guard ensures safe nested includes

vec3 getSkyColor(vec3 viewDir, vec3 sunDir, vec3 moonDir, float sunVis, float moonVis, float rainStr) {
    viewDir = normalize(viewDir);
    sunDir = normalize(sunDir);
    moonDir = normalize(moonDir);

    float horizon = dot(viewDir, vec3(0.0, 1.0, 0.0));
    float sunDot = dot(viewDir, sunDir);
    float moonDot = dot(viewDir, moonDir);

    // Day factor 0=midnight, 1=noon, smooth
    float dayFactor = sunVis; // already accounts for sun angle
    float nightFactor = 1.0 - dayFactor;

    // ----- Base gradient -----
    // Top -> horizon gradient, different for day/night/sunset
    vec3 dayTop = FIREBROXN_SKY_DAY_TOP;
    vec3 dayHorizon = FIREBROXN_SKY_DAY_HORIZON;
    vec3 nightTop = FIREBROXN_SKY_NIGHT_TOP;
    vec3 nightHorizon = FIREBROXN_SKY_NIGHT_HORIZON;

    // Sunset color boost when sun is low
    float sunsetFactor = pow(clamp(1.0 - abs(sunDir.y) * 2.5, 0.0, 1.0), 2.0) * smoothstep(0.0, 0.4, dayFactor);
    sunsetFactor *= (1.0 - rainStr * 0.6);

    vec3 daySky = mix(dayHorizon, dayTop, smoothstep(-0.15, 0.65, horizon));
    // add sunset orange near horizon when sun low
    float horizonSunProximity = pow(clamp(dot(viewDir, normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0, 1.0), 1.5);
    daySky = mix(daySky, FIREBROXN_SKY_SUNSET, sunsetFactor * (1.0 - smoothstep(0.0, 0.45, horizon)) * horizonSunProximity * 0.9);
    // slight pink/magenta at zenith during sunset
    daySky = mix(daySky, vec3(0.95, 0.55, 0.65), sunsetFactor * smoothstep(0.35, 0.9, horizon) * 0.35);

    vec3 nightSky = mix(nightHorizon, nightTop, smoothstep(-0.12, 0.55, horizon));

    vec3 sky = mix(nightSky, daySky, dayFactor);

    // ----- Aerial haze / Mie scattering around sun -----
    float sunScatter = pow(max(sunDot, 0.0), 128.0) * 1.8 + pow(max(sunDot, 0.0), 32.0) * 0.6;
    sunScatter *= dayFactor * (1.0 - rainStr * 0.5);
    // horizon boost for mie
    sunScatter *= (0.6 + 0.4 * smoothstep(-0.2, 0.3, horizon));
    vec3 sunHaloColor = mix(vec3(1.0, 0.92, 0.75), FIREBROXN_SKY_SUNSET, sunsetFactor * 0.6);
    sky += sunHaloColor * sunScatter * 0.9;

    // Wider sun glow
    float sunGlow = pow(max(sunDot, 0.0), 6.0) * 0.35 * dayFactor * (1.0 - rainStr * 0.6);
    sky += sunHaloColor * sunGlow;

    // ----- Moon glow -----
    float moonGlow = pow(max(moonDot, 0.0), 256.0) * 2.5 + pow(max(moonDot, 0.0), 32.0) * 0.4;
    moonGlow *= nightFactor * (1.0 - rainStr * 0.5);
    sky += vec3(0.75, 0.82, 1.0) * moonGlow * 0.8;

    // ----- Stars -----
    if(nightFactor > 0.01) {
        // Use viewDir to generate star field - stable
        vec3 starDir = viewDir;
        // Project to 2D for noise
        vec2 starUV = starDir.xz / (starDir.y + 1.5);
        // Tiling
        float stars = 0.0;
        // Cheap star field with hash
        vec2 gv = fract(starUV * 280.0);
        vec2 id = floor(starUV * 280.0);
        float h = hash(id);
        // threshold for star presence
        float threshold = 0.997;
        if(h > threshold) {
            float star = pow(h, 12.0) * 12.0;
            // twinkle
            float twinkle = sin(frameTimeCounter * (1.5 + h*2.0) + h* 6.28) * 0.25 + 0.75;
            // distance fade near horizon and near sun/moon to avoid stars in day glow
            float horizonFade = smoothstep(-0.05, 0.15, horizon);
            float sunAvoid = 1.0 - pow(max(sunDot, 0.0), 8.0) * 0.95;
            float moonAvoid = 1.0 - pow(max(moonDot, 0.0), 6.0) * 0.6;
            stars = star * twinkle * horizonFade * sunAvoid * moonAvoid * (1.0 - rainStr);
            // color variation
            vec3 starColor = vec3(1.0);
            if(h > 0.999) starColor = vec3(0.7, 0.85, 1.0);
            else if(h > 0.9985) starColor = vec3(1.0, 0.90, 0.7);
            sky += starColor * stars * nightFactor * 1.2;
        }
        // Milky way subtle band
        float milky = pow(max(dot(viewDir, normalize(vec3(0.3, 0.6, -0.2))), 0.0), 22.0) * 0.045 * nightFactor * (1.0 - rainStr*0.7) * smoothstep(-0.1, 0.2, horizon);
        sky += vec3(0.55, 0.65, 0.95) * milky;
    }

    // ----- Rain desaturation & darkening -----
    sky = mix(sky, vec3(0.55, 0.60, 0.68) * (0.7 + 0.3 * smoothstep(-0.2, 0.4, horizon)), rainStr * 0.55);
    sky *= (1.0 - rainStr * 0.18);

    // ----- Underground / cave fog tint when looking down far? not needed -----

    return max(sky, vec3(0.0));
}

// Fog mixed with sky - for distance fog
vec3 applyFog(vec3 color, vec3 skyColor, float dist, float density, float heightFactor) {
    float fog = 1.0 - exp(-dist * density * (0.6 + heightFactor * 0.4));
    fog = clamp(fog, 0.0, 1.0);
    // height fog - denser near ground
    return mix(color, skyColor, fog);
}

// Atmospheric perspective height attenuation
float heightFogFactor(vec3 worldPos) {
    // denser at low Y near ground/water, thinner at high altitude
    float h = clamp((worldPos.y - 62.0) / 80.0, 0.0, 1.0);
    return exp(-h * 1.2) * 0.7 + 0.3;
}

#endif
