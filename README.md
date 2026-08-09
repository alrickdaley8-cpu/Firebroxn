# Firebroxn — Microbot Swarm v7.0 PHYSICS

**Real Structures That Work** — Cannon-es physics, load-bearing bridges, collapse, draw-to-build walls.

**Live Demo:** https://alrickdaley8-cpu.github.io/Firebroxn/ (after Pages workflow added)

## v7.0 PHYSICS — Real World Engineering

### 🏗️ Physics Engine (cannon-es 0.20)
- World gravity -9.81 Y, NaiveBroadphase, 12 solver iterations
- Ground plane at y=-2.35 static
- **Locked bots → Rigid Bodies:** Box(0.28,0.08,0.19) mass 0.35, base (<-0.6) mass 0 static anchor
- **LockConstraint:** On lock, connect to nearby (<1.6m) locked bots via `LockConstraint`, max 4 per bot, restDist tracked for stress
- **Collapse:** Realistic fall when base removed — tower crumbles with gravity
- **Wind:** X/Z sliders apply force wx*2.5, wz*2.5 to all dynamic bodies each frame
- **Gravity slider:** -20 to 0 updates world.gravity
- **Stress Heatmap:** Links colored by stretch vs restDist (cyan→red)

### 🌉 Functional Bridge That Holds Weight
- New formations: **Dome** (hemisphere 0-90°), **Arch** (catenary cos), **Functional Bridge** (deck 55% + cables 45% thicker), **Custom Wall**
- F-Bridge optimized for load: flat deck + suspension cables
- **Ball Drop Test:** 0.38m sphere mass 4.5kg, drops from transmitter+8m, rolls across if bridge holds
- **Space** to drop ball, Clear Balls, Drop Ball button
- Build F-Bridge → Physics ON → Drop Ball → See if it rolls!

### ✏️ Draw-To-Build — Custom Walls
- **Draw Mode (D):** Toggle, draws on ground plane y=-2.3, pointer drag adds points threshold 0.25m
- **Path visualization:** Cyan Line 0.85 opacity, length calc, drawPtsCount telemetry
- **Wall extrusion:** `generateWallFromPath(path,count,height,thick)` — stepAlong 0.36, stepUp 0.38, thickness layers tk*0.24 + jitter, extruded 2.5m high default
- **Build Drawn Wall:** Converts path → customWallPoints → mode CUSTOM → autoBuild ON bottom-up with physics
- Wall Height 0.5-6m, Thickness 0.2-1.5m sliders
- Walls stand with physics, can collapse, hold balls

### 🤖 v6 Precision Retained + v7 Upgrades
- Chassis 2.0 dual-joint legs tripod gait, weld locking 0.16m, sparks, ghost blueprint, smart bottom-up assign, scaffold layers, precision mode
- Scale 0.35-2.8, Rot Y 0-360
- 28 formations (25 + dome/arch/f-bridge/custom)

### 📱 Controls
- **Mobile:** Left joystick MOVE, Right LOOK, Pinch zoom, Y↑Y↓, BUILD/CAMERA/DRAW toggle
- **Draw:** In DRAW mode drag on ground to draw, BUILD DRAWN WALL to construct
- **Physics:** P toggle physics, Space ball, D draw, S screenshot
- **Collapse Tests:** Collapse removes 25% random locked, Remove Base removes y<-0.3

### Dev
```bash
npm install
npm run dev # /Firebroxn/
npm run build # 25.8KB html + 639KB js (168KB gzip) includes cannon-es
```

### Deploy
Base `/Firebroxn/` for Pages. Add `.github/workflows/deploy.yml` manually (GitHub App cannot push workflow). Settings → Pages → Source: GitHub Actions. File content in repo local `.github/workflows/deploy.yml`.

---
v7 PHYSICS — "Now they don't just look like structures — they *are* structures. Bridges hold, towers fall."
