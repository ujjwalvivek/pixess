# PixESS (Pix-E-SS)

Convert images to CSS/HTML/SVG.

Self-contained single HTML file, no build step.

## Features

- **6 modes**: Scan, Shadow, Grid, Mosaic, ASCII, Base64
- **5 output formats**: CSS, HTML, React, Vue, Svelte, SVG
- **GIF support** with frame caching
- **Web Worker** for pixel math keeping UI responsive
- Lazy SVG generation firing only when requested
- Gzip ~20 KB (raw ~106 KB)

## How it works

- Worker receives image
  - resizes/sharpens/filters/quantizes
  - returns pixels + palette.
- Main thread generates CSS/HTML/SVG strings.
- GIF frames are composited and cached in the worker.
