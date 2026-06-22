# Pix-Map

A scroll-driven product website for **PIXMAP** — a professional platform for large-scale LED installations that lets designers patch surfaces, apply masks, generate production-ready outputs, and manage intelligent LED wiring within one unified workflow.

Built for the stage. Engineered for precision.

**Live Website:** [https://bob2821.github.io/pixmap_v2-website/](https://bob2821.github.io/pixmap_v2-website/)

---

## Overview

This is a single-page, animation-led experience. As the visitor scrolls, the site moves through a choreographed sequence:

1. **Preloader** → animated intro
2. **Hero** → 3D flipping PIXMAP logo
3. **Patch reveal** → tile-wave assembly of the patch stage
4. **USP showcase** → 10 product features, each with a highlight on the editor UI and an animated connector line (select features show a supporting image)
5. **Output generation** → tile-assembly reveal of the output view, with word-by-word narration
6. **Flip → wiring** → the output flips to reveal the LED wiring/connection view
7. **Final call-to-action** → closing statement, Download button, and footer

The entire experience is fully reversible on scroll-up.

---

## Project structure

```
.
├── index.html              # Main single-page site
├── css/                    # Modular stylesheets (variables, hero, sections, usp, footer …)
├── js/                     # Scroll engine + scene modules
│   ├── grid-trail.js       # Background grid
│   ├── preloader.js        # Intro
│   ├── scroll-story.js     # Master scroll orchestrator
│   ├── patch-scene.js      # Patch reveal
│   ├── usp-scene.js        # USP highlights + connectors + media
│   └── op1-scene.js        # Output reveal, sentences, flip, final CTA
├── pages/                  # Secondary pages (download, pricing, login, creator)
└── assets/
    ├── images/             # Scene & feature imagery
    ├── logos/              # Brand logos
    └── fonts/              # Bundled web fonts (Open Sans)
```

---

## Running locally

No build step or dependencies — it's static HTML/CSS/JS.

- **Quickest:** open `index.html` in any modern browser.
- **Recommended (avoids any file:// quirks):** serve the folder, e.g.
  ```bash
  # Python 3
  python -m http.server 8000
  # then visit http://localhost:8000
  ```

---

## Browser support

Optimized for current Chrome, Edge, Safari, and Firefox, on desktop, tablet, and mobile. The heavy animation work uses `requestAnimationFrame` and is tuned for smoothness across devices.

---

## Credits

Designed and developed for **PIXMAP** — by **VJ KayCee**.
© 2026 PIXMAP. All rights reserved.
