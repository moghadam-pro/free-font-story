# Deploying to https://sayid.ir/online-story-font/

This folder contains a version of the editor built specifically to be pasted
into a WordPress page's code/HTML editor, at the address:

```
https://sayid.ir/online-story-font/
```

It reads the available fonts from `https://sayid.ir/fonts/` at load time and
adds them to the font list automatically. Since directory listing is not
enabled on that folder, a tiny PHP file does the listing instead.

## Files

- **`fonts-list.php`** — upload this into the fonts folder itself, so it
  ends up at `https://sayid.ir/fonts/list.php`. It scans that folder and
  returns JSON describing every font it finds (pairing files with the same
  name, one `.woff2` and one `.ttf` per font).
- **`online-story-font.html`** — the full editor (styles + markup + script)
  as one block. Paste its entire contents into the WordPress page.

## Setup steps

### 1. Upload the font-listing script

Upload `fonts-list.php` via FTP/SFTP or your hosting file manager into the
**same folder that holds your `.woff2`/`.ttf` files**, so the final path is:

```
https://sayid.ir/fonts/list.php
```

Test it by opening that URL directly in a browser — it should return JSON
like:

```json
[{"name":"Vazirmatn","woff2":"Vazirmatn.woff2","ttf":"Vazirmatn.ttf"}, ...]
```

If you see a blank page or a PHP error, your host may run fonts/ under a
static-only handler — ask your host to confirm `.php` files execute in that
folder, or move `list.php` to a folder where PHP does run and adjust
`FONTS_ENDPOINT` in `online-story-font.html` accordingly.

### 2. Create the WordPress page

1. In WordPress admin, create a new Page with the slug `online-story-font`
   (so its URL is `/online-story-font/`).
2. **Use a full-width / blank / "no header-footer" page template** if your
   theme offers one (common names: "Full Width", "Canvas", "Blank",
   "Elementor Canvas"). The editor is a full-screen app, not a content
   block, and looks best without the theme's header/footer squeezed
   around it. It still works with a normal template — the page will just
   be taller than one screen and require scrolling to see it all.
3. Add a **Custom HTML** block (Gutenberg) — or the HTML/Code widget if
   you're using a page builder like Elementor or Divi.
4. Open `online-story-font.html` from this folder, copy its **entire
   contents**, and paste them into that block.
5. Publish the page.

> If you're pasting into the classic editor's "Text" tab instead of a
> Custom HTML block, some WordPress setups strip `<script>` tags from
> that view. If the page loads but nothing appears, use the Custom HTML
> block instead — it always preserves scripts.

### 3. Verify

Open `https://sayid.ir/online-story-font/`:

- The editor should render full-screen, matching the design (pink/red
  gradient background, white app shell).
- Open the floating "Font family" dropdown — you should see a "فونت‌های
  سایت" (site fonts) group listing every font found in `/fonts/`, plus a
  "فونت‌های سیستم" (system fonts) fallback group.
- If `/fonts/list.php` can't be reached for any reason, the dropdown
  silently falls back to just the system fonts group — the editor still
  works, it just won't offer your uploaded fonts. Check the browser
  console for a warning starting with `Free Font Story:` if that happens.

## How it works

- Everything (CSS, HTML, JS) is scoped under one wrapper,
  `.ffs-embed-root` / `#ffsAppRoot`, and the script runs inside an IIFE —
  it will not leak styles into the rest of your theme, and it forces
  `direction: ltr` on itself so it renders correctly even though the site
  is RTL.
- All element IDs are prefixed with `ffs` to avoid clashing with other
  plugins or theme markup on the same page.
- On load, the script fetches `https://sayid.ir/fonts/list.php`, then for
  each font it finds:
  - injects an `@font-face` rule (`.woff2` first, `.ttf` as a fallback
    source), and
  - adds it as an `<option>` in the font-family dropdown.
- The project (text layers, background, chosen frame, etc.) autosaves to
  the visitor's browser `localStorage`, separate from the standalone
  GitHub Pages version.

## A known limitation worth knowing

Each font in `/fonts/` is treated as **one weight** (whatever the actual
`.ttf`/`.woff2` file contains) — the "Regular / Medium / Semi Bold / Bold /
Extra Bold / Black" weight dropdown only has a visible effect on the
built-in system fonts (Arial, Georgia, Tahoma, system-ui) and on
Vazirmatn's Google Fonts variable weights. For your own uploaded fonts,
changing the weight selector won't make them visually bolder unless you
upload a separate same-named-but-different file per weight — the editor
purposefully disables browser font-synthesis (fake bold) to keep exported
SVGs accurate to the real glyphs.
