# MICO

MICO is a desktop-first microbot command center inspired by the high-energy hero-lab feel of Big Hero 6. It is a visual, interactive control surface for a 128-unit swarm: part mission control, part blueprint table, part tiny robot brain.

The interface is built with plain HTML, CSS, and JavaScript with no build step or dependencies.

## Run locally

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open `http://localhost:4173`.

## Interactions

- Deploy or recall the live microbot swarm
- Switch between Guardian, Builder, Search, and Recall behaviors
- Move the coherence slider and watch the telemetry change
- Run a full mesh diagnostic scan
- Use `⌘ K` / `Ctrl K` for the command palette
- Send natural-language commands such as `build a bridge`, `protect the core`, `search`, or `recall`
- Expand the swarm visualization into a focused view
- Click mission queue items, topology controls, activity events, and operator tools
