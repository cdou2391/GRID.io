# GRID.io — Roadmap

Enhancement ideas tracked for future implementation.

---

## 🪶 Low effort, high value

- [x] **localStorage persistence** — save/restore panel URLs, positions, and sizes across page refreshes
- [x] **Keyboard shortcut** — `/` or `Ctrl+Enter` focuses the URL input from anywhere on the page
- [x] **Panel mute/unmute** — per-panel 🔊/🔇 button; reloads iframe with `mute=1` for YouTube & Vimeo
- [x] **Middle-click-drag to pan** — drag the canvas with the middle mouse button instead of relying on scrollbars

---

## 🛠️ Medium effort

- [ ] **Named layouts / snapshots** — save and restore named board arrangements (stored in `localStorage`)
- [ ] **Shareable URL** — encode panel URLs + positions into the query string for easy board sharing
- [ ] **Panel groups / colour tags** — group and colour-code panels (e.g. "Sports", "Music")
- [ ] **Right-click context menu** — per-panel actions: duplicate, reload iframe, bring to front
- [ ] **Touch / trackpad support** — `touchstart`/`touchmove` equivalents for mobile and iPad

---

## 🚀 Bigger features

- [ ] **Multi-board tabs** — switch between multiple named boards, each with its own panel set
- [ ] **Picture-in-picture** — pop a panel out as the browser's native PiP window
- [ ] **Customisable grid background** — toggle between dot grid, line grid, or blank canvas
- [ ] **Panel search / filter** — search panels by label to highlight or jump to them
- [ ] **Export as HTML** — generate a self-contained snapshot of the current board
