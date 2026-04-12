# GRID.io — Multi-Video Board

A zero-dependency, browser-based canvas for embedding and managing multiple video panels side by side. Drag, resize, pin, and tile panels freely on an infinite scrollable grid.

## Features

- 🎬 **Multi-panel canvas** — open as many video panels as you need on a large scrollable grid
- 🔗 **Auto URL conversion** — paste a YouTube, Vimeo, Twitch, Dailymotion, or Spotify URL and it's automatically converted to an embeddable format
- 📌 **Pin / lock** — lock a panel in place to prevent accidental moves or resizes
- ⊞ **Tile** — instantly arrange all unpinned panels into an evenly spaced grid
- 🚫 **Blocked service detection** — services that disallow embedding (Netflix, Disney+, Hulu, etc.) are detected up front and shown with a friendly fallback
- 💡 **No build step** — plain HTML + CSS + JS, open in any browser

## Supported Services

| Service | Status |
|---|---|
| YouTube | ✅ Auto-converted |
| Vimeo | ✅ Auto-converted |
| Twitch (channel & VOD) | ✅ Auto-converted |
| Dailymotion | ✅ Auto-converted |
| Spotify | ✅ Auto-converted |
| Plex | ✅ Use embed/share URL |
| Jellyfin | ✅ Use your `/web/` URL |
| Netflix / Disney+ / Hulu / Prime | ❌ Block all iframes |

## Usage

```bash
# No installation needed — just open the file
open multi-video-board.html
```

Or serve locally with any static server:

```bash
npx serve .
# then visit http://localhost:3000/multi-video-board.html
```

### Adding a panel

1. Paste a video URL in the input field at the top
2. Optionally give it a label
3. Click **+ Add** (or press `Enter`)

### Controls

| Action | How |
|---|---|
| Move panel | Drag the panel header |
| Resize panel | Drag the ↘ corner handle |
| Lock panel | Click 📌 in the panel header |
| Open in new tab | Click ↗ in the panel header |
| Remove panel | Click ✕ in the panel header |
| Tile all panels | Click **⊞ Tile** in the toolbar |
| Clear all panels | Click **✕ Clear** in the toolbar |

### Demo mode

The page loads a YouTube demo panel by default. To disable it:

```
multi-video-board.html?demo=0
```

## File Structure

```
GRID.io/
├── multi-video-board.html   # Markup & layout
├── multi-video-board.css    # Styles & theming
└── multi-video-board.js     # Application logic
```

## License

MIT
