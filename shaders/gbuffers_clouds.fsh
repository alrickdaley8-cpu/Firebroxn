#version 120
// Firebroxn - gbuffers_clouds.fsh
// Volumetric-ish soft clouds with lighting

#include "/lib/common.glsl"
#include "/lib/sky.glsl"

uniform sampler2D texture;
uniform sampler2D lightmap;
uniform int isEyeInWater;

varying vec2 texcoord;
varying vec4 glcolor;
varying vec3 worldPos;
varying vec3 viewPos;

void main() {
    vec4 albedo = texture2D(texture, texcoord) * glcolor;

    if(albedo.a < 0.01) discard;

    // Simple cloud lighting
    vec3 sunDir = normalize(sunPosition);
    float sunDot = clamp(dot(normalize(vec3(0,1,0)), sunDir) * 0.5 + 0.5, 0.0, 1.0);
    float sunVis = getSunVisibility();

    // Clouds catch sunset color
    vec3 dayLight = mix(FIREBROXN_SKY_DAY_HORIZON, FIREBROXN_SKY_SUNSET, pow(1.0 - sunDir.y, 2.0) * sunVis );
    dayLight = mix(vec3(0.7), dayLight, sunVis * (1.0 - rainStrength*0.6));

    vec3 nightLight = vec3(0.18, 0.22, 0.45) * 0.35;

    vec3 cloudLit = mix(nightLight, dayLight, sunVis);
    cloudLit = mix(cloudLit, vec3(0.9), 0.25);

    // Ambient occlusion from view distance
    float dist = length(viewPos);
    float fade = clamp(1.0 - dist / 220.0, 0.0, 1.0);
    albedo.rgb *= (0.75 + 0.45 * sunDot) * mix(0.6, 1.0, fade);
    albedo.rgb = mix(albedo.rgb, albedo.rgb * cloudLit, 0.55);

    // Under-lighting for sunset - red undersides
    float underside = clamp(-dot(vec3(0,1,0), sunDir)*0.5+0.5,0.0,1.0);
    albedo.rgb += vec3(0.8,0.35,0.15) * underside * sunVis * 0.18 * (1.0 - rainStrength);

    // Rain darkens
    albedo.rgb *= (1.0 - rainStrength * 0.45);
    albedo.rgb = mix(albedo.rgb, vec3(0.55,0.60,0.68), rainStrength*0.45);

    // Soft edges via alpha
    albedo.a *= 0.92;

    if(isEyeInWater == 1) albedo.a *= 0.35;

    /* DRAWBUFFERS:012 */
    gl_FragData[0] = vec4(albedo.rgb, albedo.a);
    gl_FragData[1] = vec4(vec3(0.5,1.0,0.5), 0.0); // dummy normal
    gl_FragData[2] = vec4(0.85, 0.85, 0.0, 1.0); // lightmap approx full bright
}
