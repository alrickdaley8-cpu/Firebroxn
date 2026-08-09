# Firebroxn — Big Hero 6 Microbot Swarm v5.0 MASSIVE

Interactive **SFIT μBOT** swarm lab — 25 formations including **Eiffel Tower**, DNA, Heart, Baymax — built mobile-first with dual joysticks.

**Live Demo (after Pages setup):** https://alrickdaley8-cpu.github.io/Firebroxn/

## 🆕 v5.0 Massive Update

### 24+ Formations
**Architecture (🏛️):** Tower, Bridge, Eiffel Tower 🗼 (4 curved legs, 3 platforms, X-bracing, apex), Pyramid 🔺, Stairs 🌀, City 🏙️, Satellite 📡
**Organic (🧬):** DNA double helix, Heart ❤️ beating, Baymax 🤖 head, Dragon 🐉 serpent, Hand 🖐️ grab
**Physics (🌀):** Orbit, Sphere 🔮, Wave 🌊, Vortex 🌪️, Cube 🧊 wireframe, Infinity ♾️, Torus 🍩, Funnel 🌪️ tornado, Helix Rings 💍
**Fun (🎉):** BH-6 ⚡ logo, Shield 🛡️, HIRO 🔤 text, Scatter 💥 chaos

Eiffel Tower algorithm: procedural curved legs using quadratic interpolation, 4 pillars base→p1→p2→top→apex with inward arch curve, platforms at 3 heights, X-bracing noise, capable of 400+ bots layer-by-layer auto-build.

### 📱 Mobile Overhaul — Full Movement
- **Dual Joysticks:** Left MOVE μBOTS (X/Z plane), Right LOOK AROUND (orbit yaw/pitch)
- **Half-screen logic:** Left half = move transmitter, Right half = orbit camera — simultaneous 2-hand control like a game
- **Pinch-to-zoom** custom + OrbitControls DOLLY_PAN, two-finger pan
- **Floating controls:** +/- zoom, Y↑/Y↓ height, reset ⌖ — bottom-right
- **BUILD vs CAMERA toggle** — segmented control, switch interaction
- **Bottom sheet** with handle swipe, category chips, 24 formation grid
- **Auto-build** progressive reveal with progress bar — watch Eiffel construct layer-by-layer
- Haptics, safe-area insets, 44px targets, 140 bots default mobile (240 desktop)

### Controls
- **Mobile BUILD mode:** Drag left side = move transmitter, Right side drag = orbit, Pinch = zoom, Joysticks = alternative
- **Mobile CAMERA mode:** Drag anywhere = orbit, Pinch = zoom, Left joystick still moves bots
- **Desktop:** Mouse hover moves transmitter, Drag = orbit, Scroll = zoom, Double-click = punch

### Tech Stack
- Three.js 0.160 + Vite 5 + ES Modules
- `formations.js` — pure functions `getFormation(mode,count,center,time)`
- `joystick.js` — custom joystick class (touch+mouse, maxRadius)
- Swarm with separation + cohesion, spatial hash for links (600 mobile / 1200 desktop max)
- Themes: Hiro cyan, Yokai red, GoGo yellow, Wasabi green, Honey pink, Fred blue

## Dev
```bash
npm install
npm run dev   # http://localhost:5173/Firebroxn/
npm run build # dist/
```

## Deploy to GitHub Pages
Vite base is `/Firebroxn/` for Pages.

**GitHub App cannot auto-push workflow file due to permission** — add manually once:

1. Settings → Pages → Source: GitHub Actions
2. Create `.github/workflows/deploy.yml` (content in repo file `.github/workflows/deploy.yml` local copy):

```yaml
name: Build and Deploy Microbot
on:
  push:
    branches: [ "main", "arena/019fe717-firebroxn" ]
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

After added, every push auto-deploys to Pages.

---
Made with ❤️ SFIT Microbot v5.0 — "The microbots… they move however I want them to."
