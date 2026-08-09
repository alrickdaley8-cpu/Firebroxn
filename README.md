# Firebroxn — Big Hero 6 Microbot

Interactive μBOT swarm simulation from Big Hero 6 — built with Three.js + Vite.

**Live Demo:** https://alrickdaley8-cpu.github.io/Firebroxn/

## Features

- 🌀 **240+ microbots** with magnetic linking visualization
- 🎮 **8 formations**: Orbit, Tower, Sphere, Wave, Bridge, BH-6 logo, Vortex, Scatter
- 🧠 **Neuro-transmitter** control — move cursor / drag on mobile to direct swarm
- 🔵 Hiro (2.4GHz) vs 🔴 Yokai (5.8GHz override) modes
- 📱 **Mobile-first**: bottom sheet UI, touch joystick, pinch zoom, double-tap punch, haptics
- 🔍 Blueprint viewer with individual bot CAD view

## Controls

- **Desktop:** Mouse to move transmitter, Drag to orbit, Scroll to zoom, Double-click to punch
- **Mobile:** Drag empty space to move transmitter, Pinch to zoom, Double-tap to punch, Swipe sheet handle

## Dev

```bash
npm install
npm run dev
```

## Build & Deploy

GitHub Actions workflow auto-builds and deploys to GitHub Pages on push to `main` or `arena/019fe717-firebroxn`.

Build output respects `base: /Firebroxn/` for Pages.

```bash
npm run build
```

Made with ❤️ — SFIT Microbot v4.2 — "The microbots... they move however I want them to."
