# GRID.io — Multi-Video Board

A zero-dependency, browser-based canvas for embedding and managing multiple video panels side by side. Drag, resize, pin, and tile panels freely on an infinite scrollable grid.

## Features

- 🎬 **Multi-panel canvas** — open as many video panels as you need on a large scrollable grid
- 💾 **Local persistence & Layouts** — board state saves automatically. Save multiple named layouts and restore them anytime.
- ⛶ **Focus Mode** — expand any panel to take up the full screen with a buttery smooth animation
- 🔗 **Shareable URLs** — instantly generate a shareable link that encodes your entire board layout
- 📥 **Export / Import** — download your board as a completely standalone, offline-ready HTML snapshot, and import it back anytime
- 🖱️ **Context Menu** — right-click panels to duplicate them, reload their iframes, or bring them to the front
- 🎧 **Mute management** — per-panel 🔇/🔊 buttons automatically mute supported embedded services (YouTube, Vimeo)
- 🎨 **Colour tags** — cycle through 6 preset colours to visually group panels
- 🤏 **Touch screen support** — smooth drag & resize handling for mobile and tablet devices
- 🔗 **Auto URL conversion** — paste a YouTube, Vimeo, Twitch, Dailymotion, or Spotify URL and it's automatically converted to an embeddable format
- 🚫 **Blocked service detection** — services that disallow embedding (Netflix, Disney+, Hulu, etc.) are detected up front and shown with a friendly fallback

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

Or serve locally with any static server (Note: local exporting logic works best when served via `http://` rather than `file://`):

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
| Quick focus URL Input | Press `/` or `Ctrl+Enter` from anywhere |
| Move panel | Drag the panel header (mouse or touch) |
| Resize panel | Drag the ↘ corner handle (mouse or touch) |
| Pan canvas | Hold Middle Mouse Button and drag anywhere on the grid |
| Focus panel | Click ⛶ in header to expand to fullscreen. Press `Escape` to close. |
| Colour panel | Click the ● tag in the header to cycle through colours |
| Lock panel | Click 📌 in the panel header |
| Mute view | Click the 🔊 icon in supported panel headers |
| More options | Right-click anywhere on a panel to Duplicate, Reload, or Bring to Front |

### Demo mode

The page loads a YouTube demo panel by default. To disable it:

```
multi-video-board.html?demo=0
```

## File Structure

```
GRID.io/
├── ROADMAP.md
├── multi-video-board.html   # Markup & layout (views)
├── multi-video-board.css    # Styles & custom theming
└── multi-video-board.js     # Application logic & local persistence
```

## License

MIT
