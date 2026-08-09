# Firebroxn — Big Hero 6 Microbot Swarm v6.0 PRECISION

**Precision Builder Swarm** — upgraded μBOTS with dual-joint legs, weld-locking, ghost blueprints, smart scaffolding.

**Live Demo (after Pages setup):** https://alrickdaley8-cpu.github.io/Firebroxn/

## v6.0 PRECISION — Bots Better at Making Stuff

### 🤖 Upgraded Chassis 2.0
- Chamfered chassis (0.58x0.16x0.42) + mid plate + top plate with 4 screws, antenna with glowing tip
- LED housing cylinder, side vents, bottom thruster disc pulsing with speed
- **Legs 2.0:** Upper (0.14m) + knee sphere + lower (0.16m) + foot magnet box + tip glow sphere — 4 legs with IK
- **Tripod gait:** Legs 0&3 together, 1&2 opposite (π offset), swing sin(phase)*0.55, lift max(sin)*0.35, idle sway
- On lock: legs tuck inward (upper 0.15, lower -1.2), foot emissive 1.2 + tip 2.5, thruster opacity = speed*0.35

### 🧠 Builder Intelligence — Better at Making Stuff
- **Weld Locking:** When dist < precisionDist (0.16m default), bot locks, vel 0, spawns 7 sparks, transmitter pulses, LED solid
- **Smart Assign:** Bottom-up greedy nearest O(n²) — sorted points by Y ascending, closest bot to lowest unfinished target first. Minimizes travel, builds foundation first
- **Scaffolding Layers:** buildProgress 0..1 maps to allowedCount = count*progress. Only lowest Y points allowed. Top layers held in orbit reserve until lower 80% locked. Eiffel Tower no longer floats!
- **Precision Mode:** Exponential slowdown near target `approachScale = clamp(dist*1.2,0.12,1)^1.2`, damping 0.92, separation 0.6x for tight packing
- **Scaffold Attraction:** Bots attracted 0.008 to nearest locked bot within 4m for cluster stability
- **Ghost Blueprint:** Points 0.16 size, opacity 0.20+progress*0.12, shows full shape even if not yet allowed
- **Spark System:** 600 max additive Points, velocity outward + up + gravity, lifetime 1s, color theme, burst on lock
- **Transform:** Scale 0.35-2.8 and RotY 0-360 around transmitter center, reassign on change — resize Eiffel Tower live
- **Telemetry:** Locked count/%, avg error meters, layer progress, accuracy

### 🏛️ 25 Formations
Orbit, Tower, Sphere, Wave, Bridge, BH-6, Vortex, **Eiffel Tower** (4 curved legs + 3 platforms + X-bracing, now builds bottom-up), DNA, Heart beating, Baymax, Cube, Pyramid, Stairs spiral, Infinity, Torus, Dragon, Shield, Funnel, HIRO text, City skyline, Hand grab, Satellite dish, Helix Rings, Scatter

### 📱 Mobile: Dual Joysticks + Pinch Zoom + Height
- Left joystick MOVE, Right LOOK AROUND (orbit yaw/pitch), Pinch zoom custom, floating +/-, Y↑/Y↓, reset ⌖
- Half-screen: left moves transmitter, right orbits — simultaneous 2-hand control

### Controls
**Build:** Scale, Rotation Y, Precision distance sliders; Toggles: Ghost, Sparks, Smart Assign, Scaffold, Precision, Mag Links, Hold Orbit, Lock Glow; AUTO BUILD progress bar with layer count; Assemble/Scatter/Unlock All; S screenshot

**Themes:** Hiro cyan, Yokai red, GoGo yellow, Wasabi green, Honey pink, Fred blue

## Dev
```bash
npm install
npm run dev # /Firebroxn/
npm run build # 24KB html + 542KB js (140KB gzip)
```

## Deploy
Base `/Firebroxn/` for Pages. Add `.github/workflows/deploy.yml` manually once (GitHub App cannot push workflow file). Settings → Pages → Source: GitHub Actions. Content in repo local `.github/workflows/deploy.yml`.

---
v6 PRECISION — "The microbots… they now weld, scaffold, and build bottom-up like real constructors."
