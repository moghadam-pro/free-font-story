# Free Font Story

A privacy-first, open-source browser editor for creating Persian and English typographic artwork and exporting it as SVG, PNG, or JPEG.

## Prototype status

This repository currently contains a dependency-free interactive prototype built with HTML, CSS, and vanilla JavaScript. It is intended for rapid UX validation before the production editor is implemented.

## Try it locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Current prototype features

- Responsive desktop and mobile editor UI
- Device-aware frame presets
- Persian, English, and mixed-direction text editing
- Font family, weight, size, color, and alignment controls
- Drag, proportional scale, and rotation interactions
- Undo and redo history
- Transparent or custom backgrounds
- SVG, PNG, and JPEG export
- Local-only processing with no account or backend

## Important technical note

The prototype exports SVG `<text>` elements rather than true glyph outlines. The production implementation will preserve editable source text in the document model while using HarfBuzz for shaping and font-outline extraction for path generation.

The planned architecture is:

```text
Editable text model + typography + transform
                    ↓
        HarfBuzz glyph shaping
                    ↓
      Font glyph outline extraction
                    ↓
     Cached vector preview and export
```

A vector preview is always derived from the editable text model. The app never attempts to reconstruct text from an SVG path.

## Planned production stack

- React + TypeScript + Vite
- Tailwind CSS for lightweight, customizable styling
- Konva / react-konva for canvas selection and transforms
- HarfBuzz compiled to WebAssembly for Persian and Arabic shaping
- opentype.js or a dedicated outline parser for glyph paths
- Zustand for document, selection, and history state
- PWA support for installation and offline use

## Planned export behavior

### SVG

- Convert shaped glyphs to paths
- Do not embed font files
- Do not embed background images as Base64
- Optionally bake transforms into path coordinates
- Produce clean, portable SVG output

### PNG and JPEG

- Render the complete artboard
- Include custom background colors and optional images
- Preserve output dimensions selected by the user

## Font licensing

The open-source repository will contain only fonts that can legally be redistributed. Additional licensed fonts may be served by a hosted deployment according to their individual licenses. Font files are not embedded in exported SVG output.

## Privacy

The editor is designed to run locally in the browser. Text, artwork state, and exports remain on the user’s device unless a future feature explicitly requires a server.

## Roadmap

1. Validate interaction and layout with the current prototype
2. Replace DOM transforms with a production canvas object model
3. Add HarfBuzz shaping and true glyph-to-path conversion
4. Add font registry and lazy font loading
5. Improve mobile touch interactions
6. Add PWA installation and offline caching
7. Add automated tests and GitHub Pages deployment

## License

A project license will be selected before the first stable release.
