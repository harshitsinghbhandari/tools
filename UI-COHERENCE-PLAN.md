# UI Coherence Plan

Goal: one design language across the four pages (landing, Cue, Timer, Ink/markdown-render), built from what already exists. Mechanism: a single shared CSS file with variables, linked by every page. No dependencies, no build step, no framework. This document is the plan only; nothing is implemented yet.

Key insight from the audit: the landing page already defines the intended system. Each tool card carries an accent (`--accent-1` green for the timer, `--accent-2` rust for markdown-render, `--accent-3` purple for Cue), and markdown-render's `--rust: #c45c3e` is already byte-identical to the landing's `--accent-2`. The system exists conceptually; the tools drifted in execution.

## (a) Per-tool inventory

### `index.html` (landing)
- Style: one `<style>` block, CSS vars in `:root`, no JS.
- Palette (always dark, no toggle): bg `#08080a`, surface `#111114`, border `#222228`, text `#ffffff`, dim `#888890`. Accents: green `#00ff88`, rust `#c45c3e`, purple `#a06cff`, wired per card via `--card-accent`.
- Type: Syne (display) + IBM Plex Mono (via Google Fonts).
- Layout: `.container` max-width 1200px, padding 24px. Radii hardcoded: 8 / 12 / 16px, 100px pills, 50% dots. Card hover shadow `0 20px 60px -20px var(--card-accent)`. Transitions 0.2s to 0.3s.
- No mobile-block overlay (has a 600px reflow breakpoint instead).

### `cue/index.html`
- Style: one `<style>` block; JS sets `--note-size` (persisted in localStorage).
- Palette (always dark): identical to landing (`#08080a` / `#111114` / `#222228` / `#ffffff` / `#888890`), single `--accent: #a06cff` (equals landing's `--accent-3`).
- Type: Syne + IBM Plex Mono, same as landing. Note textarea is mono, `var(--note-size, 16px)`.
- Components: 34px icon buttons (surface bg, 1px border, radius 8px, accent on hover/active), pill button (radius 100px), custom scrollbar (thumb `var(--border)`, hover hardcoded `#33333c`), custom `::selection` in accent at 0.3 alpha.
- Pop-out: Document Picture-in-Picture (380x480). Clones all `document.styleSheets` into the PiP window, injects a small override `<style>`, then moves the real `#note-container` node in and back on `pagehide`.
- Mobile-block overlay at 600px: display font, 26px, glowing accent dot.

### `timer/index.html`
- Style: one `<style>` block. Only file with radius tokens: `--radius: 16px`, `--radius-sm: 8px`.
- Palette (always dark) drifts from landing/cue: bg `#0d0d0d`, surface `#161616`, surface-elevated `#1f1f1f`, border `#2a2a2a`, dim `#666666`. Accent green `#00ff88` (equals landing's `--accent-1`) plus `--accent-dim: #00cc6a` and `--warning: #ff6b35`.
- Type: entirely different pair: Unbounded (display) + Space Mono (countdown digits).
- Components: full-width 56px buttons (uppercase, letter-spaced, start = solid accent, pause = outlined, reset = ghost), preset chips (surface, radius-sm, accent border when active), 4px progress bar with accent gradient and glow. Countdown is a contenteditable div, not an input.
- PiP: same clone-stylesheets-and-move-node mechanism as Cue (320x320), but the override hardcodes `background: #000` (so the PiP window is a different black than the app). No canvas anywhere; PiP is live DOM/CSS.
- Focus mode: `body.focus-mode` class, hardcoded `background: #000`, hides chrome, enlarges digits.
- Mobile-block overlay at 600px: display font, 26px, glowing accent dot (same as Cue's).

### `markdown-render/index.html` (Ink)
- Style: one `<style>` block (~820 lines) plus a pre-paint inline script that sets `data-theme`.
- The only tool with real light/dark theming: `html[data-theme="dark"]` attribute, toggle button, localStorage key `ink-theme`, `prefers-color-scheme` as first-run fallback, mermaid theme switched in JS.
- Palette (own names): ink `#1a1a1a`/`#f1eee8`, paper `#faf8f5`/`#11100f`, cream `#f5f2ed`/`#191715`, stone `#e8e4dd`/`#332f2b`, graphite `#6b6b6b`/`#b2aaa1`, rust `#c45c3e`/`#e1785d`, deep-rust, rust-soft, code-block colors, error colors.
- Type: three families: Cormorant Garamond (prose/headings), Outfit (UI chrome, h3-h6), JetBrains Mono (code, editor).
- Radius convention is 4px nearly everywhere (with 2px/3px minor cases). Buttons are ghost with 1px stone border, hover inverts to ink-on-paper.
- Palette is duplicated three times: live CSS vars, `LIGHT_CSS`/`DARK_CSS` JS strings for standalone HTML export, and `PDF_PALETTES` plus an inline template in `exportPDF()`. Three different h1 scales (3em live, 2.5em export, 24pt PDF). All hand-synced.
- `#preview img` shadow is hardcoded `rgba(0,0,0,0.1)` and does not adapt to dark mode.
- Mobile-block overlay at 600px, but drifted: serif italic 32px, accent bar instead of glowing dot, paper background.

## (b) Key inconsistencies

1. Three unrelated font systems: Syne + IBM Plex Mono (landing, Cue), Unbounded + Space Mono (Timer), Cormorant Garamond + Outfit + JetBrains Mono (Ink).
2. Timer's dark neutrals drift from the landing/Cue set on every value (`#0d0d0d` vs `#08080a`, `#161616` vs `#111114`, `#2a2a2a` vs `#222228`, `#666666` vs `#888890`).
3. Accent variable naming differs per file (`--accent-1/2/3` vs `--accent` vs `--accent` + `--accent-dim` + `--warning`) even though the hues themselves already agree with the landing's per-card system.
4. Radius tokens exist only in Timer; landing and Cue hardcode the same 8/16/100px values inline.
5. The mobile-block overlay is copy-pasted into three files with drifted styling (font, size, decoration, colors), though markup, breakpoint, and copy are identical.
6. Timer's PiP and focus mode hardcode `#000`, so those surfaces do not match the app background of any tool.
7. Cue's scrollbar thumb hover is a hardcoded `#33333c` instead of a variable.
8. Ink's palette lives in four hand-synced copies (1 CSS + 3 JS) with three divergent type scales.
9. Ink's `#preview img` shadow ignores dark mode.
10. Transition durations vary without pattern (0.15s / 0.2s / 0.3s).

## (c) The plan

### Design language (derived, not invented)

One new file, `shared/base.css`, linked by all four pages after their font `<link>` tags. Contents:

**Neutrals (dark shell, canonical = landing/Cue values):**

```css
:root {
  --bg: #08080a;
  --surface: #111114;
  --surface-2: #1a1a1f;      /* absorbs timer's surface-elevated */
  --border: #222228;
  --border-strong: #33333c;  /* absorbs cue's scrollbar hover hex */
  --text: #ffffff;
  --text-dim: #888890;
  --bg-deep: #000000;        /* intentional true black: timer PiP and focus mode */
}
```

**Accents (from the landing's card system):**

```css
  --accent-green: #00ff88;   /* timer */
  --accent-rust: #c45c3e;    /* ink */
  --accent-purple: #a06cff;  /* cue */
```

Each tool sets its own `--accent` from these in its page `<style>`. Timer keeps `--accent-dim` and `--warning` locally (tool-specific semantics, no other tool needs them).

**Typography:** Syne (display) + IBM Plex Mono become the suite chrome fonts: `--font-display`, `--font-mono` in base.css. Timer migrates off Unbounded/Space Mono. Ink keeps its three editorial families for the document (see "not unified") and aliases `--font-display: var(--serif)` so shared components render in its voice.

**Radii (adopt Timer's token idea, landing's values):** `--radius-sm: 8px`, `--radius: 16px`, `--radius-pill: 100px`. Ink stays on its 4px convention (part of its paper identity).

**Motion and shadows:** `--transition: 0.2s ease` as the single default duration. Shadows stay per-component (they are all accent glows or one-off card shadows, not a reusable scale), except the mobile-block dot glow which moves into the shared component.

**Shared components in base.css:** the `.mobile-block` overlay (breakpoint, hiding rule, layout, glowing accent dot, typography via `--font-display` and `--accent`) and the webkit scrollbar pattern (thumb `var(--border)`, hover `var(--border-strong)`).

**Dark mode strategy:** landing, Cue, and Timer stay permanently dark; that is their identity, not a gap. Ink's `data-theme` attribute + localStorage + `prefers-color-scheme` fallback is the blessed mechanism, recorded in base.css as a comment, to be reused if any tool ever grows a light theme. No `prefers-color-scheme` styling is added to the dark tools.

### Steps (each independently shippable, in order)

**Step 1: create `shared/base.css`.** New file with the tokens and shared components above. Links nothing yet, so shipping it changes nothing visually.

**Step 2: migrate Cue (`cue/index.html`).** Smallest diff, validates the mechanism including PiP.
- Add `<link rel="stylesheet" href="../shared/base.css">`.
- Delete the duplicated neutral/font vars from its `:root`; keep `--accent: var(--accent-purple)` and `--note-size`.
- Replace scrollbar hover `#33333c` with `var(--border-strong)`; delete local scrollbar/mobile-block rules now covered by base.css.
- Verify PiP still styles correctly (the clone-stylesheets loop copies same-origin `<link>` rules, so base.css rules carry over; confirm in the popup).

**Step 3: migrate the landing (`index.html`).**
- Link base.css; delete the duplicated `:root` vars.
- Point the card accents at the shared names (`--card-accent: var(--accent-rust)` etc.).
- Swap hardcoded 8/16/100px radii for `var(--radius-sm)` / `var(--radius)` / `var(--radius-pill)`. Page-specific styles (hero, grid, animations) stay inline.

**Step 4: migrate the Timer (`timer/index.html`).** The visible one.
- Change the Google Fonts link to Syne + IBM Plex Mono; delete Unbounded/Space Mono. Countdown digits move to IBM Plex Mono (check digit alignment; add `font-variant-numeric: tabular-nums` if they shift while ticking).
- Link base.css; delete its `:root` neutrals so it inherits `#08080a` / `#111114` / `#222228` / `#888890`; map `--surface-elevated` usages to `--surface-2`. Keep `--accent: var(--accent-green)`, `--accent-dim`, `--warning` locally.
- Replace the two hardcoded `#000` (PiP override string and `body.focus-mode`) with `var(--bg-deep)`.
- Delete local mobile-block rules in favor of the shared component.

**Step 5: migrate Ink chrome (`markdown-render/index.html`).**
- Link base.css, then alias the generic tokens to its paper palette inside its own `:root` and `html[data-theme="dark"]` blocks (`--bg: var(--paper)`, `--surface: var(--cream)`, `--border: var(--stone)`, `--text: var(--ink)`, `--text-dim: var(--graphite)`, `--accent: var(--rust)`, `--font-display: var(--serif)`). Shared components then render correctly in both themes with zero markup changes.
- Delete its local mobile-block rules; the shared overlay picks up serif and rust via the aliases.
- Fix `#preview img` shadow to `0 8px 32px var(--shadow-soft)` so it themes.
- Document palette, prose typography, 4px radii, and button style are untouched.

**Step 6: single-source Ink's export palette (JS only).**
- Generate `LIGHT_CSS` and `DARK_CSS` from the existing `PDF_PALETTES` object so the palette lives in one JS object instead of three literals; add a comment that this object must mirror the live CSS vars (exports must stay self-contained, so this duplication is deliberate and now minimal).
- Leave the three type scales alone unless export output looks wrong; scale unification is not required for coherence of the live UI.

### Not unified (deliberately)

- **Ink's document design**: Cormorant Garamond prose, paper/ink palette, drop caps, 4px radii, inverted-hover buttons. That is the product, not drift. Only its chrome joins the system via aliases.
- **Timer PiP and focus mode true black**: kept, but named (`--bg-deep`) so it is a decision, not a stray hex.
- **The PiP mechanism itself** (~30 lines duplicated in Cue and Timer): the clone-and-move code stays per-file; their override styles differ by design and extracting shared JS buys nothing.
- **Ink's export CSS being self-contained hex**: exported HTML/PDF must work standalone, so it cannot consume base.css. Step 6 reduces it to one source inside the file.
- **Light mode for landing/Cue/Timer**: not added. These are dark tools on purpose.
- **Landing page animations, timer alarm/vibration, Cue's `--note-size`**: page-specific behavior, out of scope.
