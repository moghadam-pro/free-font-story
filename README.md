# Free Font Story

A privacy-first, open-source text-to-vector editor for creating typographic artwork in the browser and exporting it as clean SVG, transparent PNG, or JPEG.

Free Font Story is designed for people who need to create visual text assets without installing design software or obtaining the font file itself. Users can type in Persian, English, or mixed-direction text, style it with fonts made available by the service, transform it directly on a canvas, and export the final result as vector paths or raster images.

> **Project status:** Product concept and technical planning. Implementation has not started yet.

## Product vision

The editor should open immediately with no account, onboarding flow, or required setup. A default canvas is selected based on the current device, while users can change the frame size at any time.

All editing data should remain local in the browser. The application only needs network requests when loading application assets or font resources that are not already cached. No user document needs to be uploaded to a server.

## Core experience

1. Open the web app or install it as a PWA.
2. Start with a responsive default frame based on the device.
3. Change the frame to a preset or custom size whenever needed.
4. Edit the initial text layer or add more text layers.
5. Style text using the available typography controls.
6. Move, scale, and rotate layers directly on the canvas.
7. Double-click or double-tap a layer to edit its original text again.
8. Export the artwork as SVG, PNG, or JPEG.

## Planned features

### Canvas and frames

- Device-aware default canvas on first load
- Frame presets for common portrait, square, and landscape formats
- Custom width and height
- Background color selection
- Optional background image for raster exports
- Zoom and fit-to-screen controls
- Responsive desktop and mobile editing experiences

### Text editing

- Multiple text layers with no arbitrary product-level limit
- Persian, English, and mixed-direction text support
- Automatic paragraph direction based on the beginning and overall structure of the text
- Manual RTL and LTR override
- Font family, size, weight, line height, letter spacing, alignment, and color controls
- Support for adding more fonts to the hosted service over time
- Layer selection, visibility, ordering, duplication, and deletion

### Transformations

- Drag-and-drop positioning
- Proportional scaling by default
- Optional independent horizontal and vertical scaling
- Rotation
- Large touch-friendly handles on mobile
- Undo and redo history

### Export

- Clean SVG made entirely from vector paths
- Transparent PNG
- JPEG with a selected background
- No embedded font data in SVG
- No Base64-embedded images in SVG
- Optional metadata cleanup and numeric optimization
- Export dimensions based on the selected frame

## Text-to-vector model

The editable text must never be destroyed when a visual path is generated. Each text layer keeps two related representations:

- **Source model:** The original Unicode text, typography settings, direction, and transform data.
- **Derived vector preview:** Shaped glyph outlines generated from the source model and cached for canvas rendering and export.

The editor therefore does **not** use this destructive cycle:

```text
Text -> Path -> Text
```

Instead, it uses a persistent source model:

```text
Text model + typography + transform
                  |
                  +--> editable text overlay
                  |
                  +--> shaped glyphs
                           |
                           +--> vector preview
                           +--> SVG export paths
```

When a user leaves text-editing mode, the editor shapes the text and displays a vector representation. Moving, scaling, and rotating modify the layer transform rather than the font size. When the layer is opened for editing again, the application restores the original text and typography while preserving the transform.

## Suggested layer schema

```ts
type TextLayer = {
  id: string;
  type: "text";
  content: string;
  direction: "rtl" | "ltr";
  language?: string;

  typography: {
    fontId: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    align: "start" | "center" | "end";
    color: string;
    features?: Record<string, boolean>;
    variations?: Record<string, number>;
  };

  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };

  mode: "editing" | "vector-preview";
  shapedGlyphs?: GlyphPosition[];
  vectorPathCache?: string;
};
```

The path cache is disposable and can always be regenerated from the source text, selected font, typography values, and shaping configuration.

## Persian and bidirectional text

Correct Persian rendering requires more than mapping Unicode characters directly to font glyphs. The text engine must account for:

- Arabic joining forms
- Ligatures
- Kerning
- OpenType GSUB and GPOS tables
- Mixed Persian and Latin runs
- Unicode bidirectional ordering
- Paragraph direction
- Multi-line layout, baselines, alignment, and line height

The recommended approach is to use HarfBuzz compiled to WebAssembly for text shaping, then obtain the corresponding glyph outlines from the font file.

## Proposed technical stack

### Application

- **React** for interface composition
- **TypeScript** for a safer document and editor model
- **Vite** for development and production builds
- **vite-plugin-pwa** for installability, offline caching, and PWA support

### Canvas and interaction

- **Konva / react-konva** for canvas rendering, selection, dragging, scaling, and rotation
- A real HTML `textarea` positioned over the canvas while a layer is being edited
- Matrix-based positioning so text editing remains aligned after scaling and rotation

### Text engine

- **HarfBuzz WASM** for Persian, Arabic, Latin, and bidirectional glyph shaping
- **opentype.js** or a compatible OpenType parser for font loading and glyph outline access
- The Unicode Bidirectional Algorithm for mixed-direction layout

### State and history

- **Zustand** for document, selection, frame, and interface state
- Command-based undo and redo
- Batched history entries for continuous typing and pointer transformations
- Local browser persistence using IndexedDB or localStorage

### Export

- A custom SVG serializer that outputs only paths and required transforms/styles
- Browser canvas APIs for PNG and JPEG output
- Transform baking during SVG export for maximum portability

## Suggested project structure

```text
src/
  editor/
    canvas/
    selection/
    transform/
    history/

  text-engine/
    bidi.ts
    shaping.ts
    glyph-layout.ts
    path-builder.ts
    text-metrics.ts

  fonts/
    font-registry.ts
    font-loader.ts
    font-cache.ts

  export/
    export-svg.ts
    export-png.ts
    export-jpeg.ts

  document/
    schema.ts
    store.ts
    migrations.ts

  ui/
    toolbar/
    frame-selector/
    layers-panel/
    typography-panel/
    export-modal/
```

## Export behavior

### SVG

SVG output should contain only vector paths and necessary visual attributes. Fonts must not be embedded, and images must not be embedded as Base64 data.

For a portable standalone SVG, transforms may be baked into the path coordinates during export. Keeping transforms on SVG groups can remain an optional optimization when compatibility is verified.

Because background images are not embedded, the first release should use this rule:

- SVG exports text paths only.
- PNG and JPEG may include the selected background image.

### PNG

- Supports transparent backgrounds
- Includes text paths and an optional background image
- Uses the selected frame dimensions

### JPEG

- Requires a solid background color or background image
- Uses the selected frame dimensions and configurable quality

## UX principles

- Open directly into the editor
- No login required
- No forced frame-selection step
- Make the current frame visible and easy to change
- Keep the primary Export action prominent in the header
- Use a bottom toolbar and bottom sheets on mobile
- Make transform handles comfortable for touch
- Keep advanced export controls inside an export modal
- Clearly explain that SVG exports contain paths rather than editable font text

## Desktop layout concept

- Top bar: project identity, undo/redo, frame selector, and primary Export button
- Left toolbar: text, selection, frame/background, layers, and settings
- Center: canvas and artwork frame
- Right panel: contextual typography or layer controls
- Export modal: SVG, PNG, and JPEG tabs with format-specific options

## Mobile layout concept

- Compact header with a visible Export action
- Current frame shown as a tappable control
- Full-screen canvas workspace
- Bottom toolbar for Text, Frame, Background, and Layers
- Typography and export controls presented as bottom sheets
- Double-tap to edit text
- A clear Done action to exit text editing and return to vector-preview mode

## Privacy model

- No account required
- No user document upload required
- Editing state stored locally
- Export generated in the browser
- Fonts loaded only as application resources and cached when appropriate

## Font licensing

This repository will contain only fonts, assets, and code that can legally be redistributed under their respective licenses.

The hosted service may provide additional licensed fonts that are not included in the open-source repository. Their use, delivery, and caching must comply with the licenses purchased for the service. Users receive exported artwork, not the original font files.

> This project is not intended to bypass font licenses. Contributors and deployers are responsible for verifying that every distributed or hosted font is used according to its license.

## Initial milestones

### Milestone 1 — Editor foundation

- React and TypeScript application
- PWA configuration
- Responsive frame and canvas
- One editable text layer
- Move, scale, and rotate interactions
- Local state and undo/redo

### Milestone 2 — Typography engine

- Font registry and loading
- HarfBuzz WASM integration
- Persian, English, and mixed-direction shaping
- Multi-line layout
- Glyph outline generation and vector preview

### Milestone 3 — Product controls

- Multiple layers
- Typography panel
- Frame presets and custom sizes
- Background color and optional image
- Desktop and mobile interaction polish

### Milestone 4 — Export

- Path-only SVG
- Transparent PNG
- JPEG
- Export modal and validation
- Cross-browser output tests

### Milestone 5 — Open-source release

- Documentation
- Demo deployment
- Contribution guidelines
- License review
- Automated tests and CI

## Open questions

- Which fonts may be included in the public repository?
- Which fonts may be loaded only by the hosted service?
- Should SVG transforms be preserved or always baked into paths?
- What maximum raster export dimensions should be supported on low-memory devices?
- Should frame presets be bundled in code or maintained in a configurable registry?
- Which browser versions should be supported in the first release?

## Contributing

The project is currently in the planning stage. Contribution guidelines will be added when the initial architecture and license are finalized.

## License

The software license has not been selected yet. Font licenses are separate from the software license and must be reviewed individually before any font files are committed.
