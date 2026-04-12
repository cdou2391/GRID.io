// ── STATE ──
let panels = [];
let zTop = 10;
const canvas = document.getElementById('canvas');
const canvasInner = document.getElementById('canvas-inner');
const empty = document.getElementById('empty');
const panelCount = document.getElementById('panel-count');

// ── LOCAL STORAGE ──
const LS_KEY = 'gridio_board';

function saveState() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({ panels, nextId, zTop }));
    } catch (e) { /* storage full / private mode */ }
}

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return false;
        const { panels: saved, nextId: sid, zTop: sz } = JSON.parse(raw);
        if (!Array.isArray(saved) || saved.length === 0) return false;
        nextId = sid ?? nextId;
        zTop = sz ?? zTop;
        saved.forEach(p => {
            panels.push(p);
            renderPanel(p);
        });
        updateCount();
        empty.style.display = 'none';
        return true;
    } catch (e) { return false; }
}

// ── URL CONVERSION ──
const BLOCKED = ['netflix.com', 'disneyplus.com', 'hulu.com', 'primevideo.com', 'amazon.com/gp/video', 'hbomax.com', 'max.com', 'peacocktv.com', 'paramountplus.com', 'apple.com/tv'];

function detectBlocked(url) {
    return BLOCKED.some(b => url.includes(b));
}

function convertToEmbed(url, muted = false) {
    const muteYT = muted ? '&mute=1' : '';
    const muteVimeo = muted ? '&muted=1' : '';

    // YouTube
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=0&rel=0${muteYT}`;

    // Vimeo
    const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vi) return `https://player.vimeo.com/video/${vi[1]}?${muteVimeo}`;

    // Dailymotion
    const dm = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;

    // Twitch VOD
    const tvod = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (tvod) return `https://player.twitch.tv/?video=${tvod[1]}&parent=${location.hostname || 'localhost'}`;

    // Twitch channel
    const tch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/);
    if (tch) return `https://player.twitch.tv/?channel=${tch[1]}&parent=${location.hostname || 'localhost'}`;

    // Spotify embed
    if (url.includes('open.spotify.com') && !url.includes('/embed/')) {
        return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }

    return url; // use as-is
}

function supportsEmbedMute(url) {
    return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

// ── OVERLAP UTILS ──
function getOverlap(a, b) {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return (ox > 2 && oy > 2) ? { w: ox, h: oy } : null;
}

function resolveCollisions(moved) {
    let changed = true, iter = 0;
    while (changed && iter++ < 30) {
        changed = false;
        for (const other of panels) {
            if (other.id === moved.id) continue;
            const ov = getOverlap(moved, other);
            if (!ov) continue;
            // Push in the axis of least overlap
            if (ov.w <= ov.h) {
                const push = ov.w + 8;
                moved.x += (moved.x < other.x) ? -push : push;
            } else {
                const push = ov.h + 8;
                moved.y += (moved.y < other.y) ? -push : push;
            }
            moved.x = Math.max(0, moved.x);
            moved.y = Math.max(0, moved.y);
            changed = true;
        }
    }
    const el = document.getElementById('vp-' + moved.id);
    if (el) { el.style.left = moved.x + 'px'; el.style.top = moved.y + 'px'; }
}

function findFreePosition(w, h) {
    const gap = 16, pad = 20, step = 20;
    for (let y = pad; y < 2400; y += step) {
        for (let x = pad; x < 3600; x += step) {
            const c = { x, y, w, h };
            if (!panels.some(p => getOverlap(c, p))) return { x, y };
        }
    }
    return { x: pad, y: pad };
}

// ── TILE ALL ──
function tileAll() {
    const unpinned = panels.filter(p => !p.pinned);
    if (unpinned.length === 0) { showToast('No panels to arrange'); return; }
    const vw = canvas.clientWidth - 40;
    const vh = canvas.clientHeight - 40;
    const n = unpinned.length;
    const gap = 12, pad = 20;
    const cols = Math.max(1, Math.round(Math.sqrt(n * (vw / vh))));
    const rows = Math.ceil(n / cols);
    const w = Math.max(200, Math.floor((vw - pad * 2 - gap * (cols - 1)) / cols));
    const h = Math.max(160, Math.floor((vh - pad * 2 - gap * (rows - 1)) / rows));

    unpinned.forEach((p, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        p.x = pad + col * (w + gap);
        p.y = pad + row * (h + gap);
        p.w = w; p.h = h;
        const el = document.getElementById('vp-' + p.id);
        if (el) {
            el.style.transition = 'left .35s cubic-bezier(.4,0,.2,1), top .35s cubic-bezier(.4,0,.2,1), width .35s, height .35s';
            el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
            el.style.width = p.w + 'px'; el.style.height = p.h + 'px';
            setTimeout(() => el.style.transition = '', 400);
        }
    });
    saveState();
    showToast('⊞ Panels tiled');
}

// ── PANEL MANAGEMENT ──
let nextId = 1;
let nextX = 80, nextY = 80;

function addPanel() {
    const urlInput = document.getElementById('url-input');
    const titleInput = document.getElementById('title-input');
    const raw = urlInput.value.trim();
    if (!raw) { showToast('Paste a URL first', true); return; }

    const label = titleInput.value.trim() || guessTitle(raw);
    const blocked = detectBlocked(raw);
    const embedUrl = blocked ? null : convertToEmbed(raw);

    const id = nextId++;
    const w = 480, h = 310;
    const { x, y } = findFreePosition(w, h);
    const panel = { id, label, raw, embedUrl, blocked, x, y, w, h, z: ++zTop, pinned: false, muted: false };

    panels.push(panel);
    renderPanel(panel);
    updateCount();
    saveState();

    urlInput.value = '';
    titleInput.value = '';
    empty.style.display = 'none';

    // Scroll to new panel
    canvas.scrollTo({ left: panel.x - 60, top: panel.y - 60, behavior: 'smooth' });
}

function guessTitle(url) {
    try {
        const h = new URL(url).hostname.replace('www.', '').replace('player.', '');
        return h.split('.')[0].charAt(0).toUpperCase() + h.split('.')[0].slice(1);
    } catch { return 'Video'; }
}

function removePanel(id) {
    panels = panels.filter(p => p.id !== id);
    document.getElementById('vp-' + id)?.remove();
    updateCount();
    saveState();
    if (panels.length === 0) empty.style.display = '';
}

function updateCount() {
    panelCount.textContent = panels.length + ' panel' + (panels.length !== 1 ? 's' : '');
}

function clearAll() {
    if (panels.length === 0) return;
    panels.forEach(p => document.getElementById('vp-' + p.id)?.remove());
    panels = [];
    updateCount();
    saveState();
    empty.style.display = '';
}

// ── RENDER PANEL ──
function renderPanel(p) {
    const el = document.createElement('div');
    el.className = 'vp';
    el.id = 'vp-' + p.id;
    el.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;z-index:${p.z}`;

    const bodyContent = p.blocked
        ? `<div class="vp-blocked">
    <div class="icon">🔒</div>
    <div class="service">${guessTitle(p.raw)}</div>
    <div class="msg">This service blocks embedding in external pages.<br>Open it directly in a new tab instead.</div>
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" onclick="window.open('${p.raw}','_blank')">Open in Tab ↗</button>
  </div>`
        : `<iframe src="${p.embedUrl}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

    const muteIcon = p.muted ? '🔇' : '🔊';
    const muteTitle = p.muted ? 'Unmute' : 'Mute';
    const muteBtn = p.blocked ? '' : `<button class="vp-btn mute${p.muted ? ' active' : ''}" id="mute-${p.id}" title="${muteTitle}" onclick="toggleMute(${p.id})">${muteIcon}</button>`;

    el.innerHTML = `
<div class="vp-header" id="hdr-${p.id}">
  <div class="vp-dot"></div>
  <div class="vp-title">${escHtml(p.label)}</div>
  <div class="vp-actions">
    ${muteBtn}
    <button class="vp-btn pin${p.pinned ? ' active' : ''}" id="pin-${p.id}" title="${p.pinned ? 'Unlock position &amp; size' : 'Lock position &amp; size'}" onclick="togglePin(${p.id})">📌</button>
    <button class="vp-btn" title="Open in new tab" onclick="window.open('${escHtml(p.raw)}','_blank')">↗</button>
    <button class="vp-btn close" title="Remove" onclick="removePanel(${p.id})">✕</button>
  </div>
</div>
<div class="vp-body">${bodyContent}</div>
<div class="vp-resize" id="rsz-${p.id}">
  <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--accent)">
    <path d="M10 0L0 10M10 5L5 10M10 10" stroke="var(--accent)" stroke-width="1.5"/>
  </svg>
</div>`;

    canvasInner.appendChild(el);
    makeDraggable(el, document.getElementById('hdr-' + p.id), p);
    makeResizable(el, document.getElementById('rsz-' + p.id), p);
    bringToFront(el, p);

    // Apply pinned state if restored from storage
    if (p.pinned) {
        el.classList.add('pinned');
    }
}

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── MUTE / UNMUTE ──
function toggleMute(id) {
    const p = panels.find(p => p.id === id);
    if (!p || p.blocked) return;

    if (!supportsEmbedMute(p.raw)) {
        showToast('Mute not supported for this service', true);
        return;
    }

    p.muted = !p.muted;
    p.embedUrl = convertToEmbed(p.raw, p.muted);

    // Reload the iframe with new src
    const body = document.querySelector(`#vp-${id} .vp-body`);
    if (body) {
        body.innerHTML = `<iframe src="${p.embedUrl}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    }

    const btn = document.getElementById('mute-' + id);
    if (btn) {
        btn.textContent = p.muted ? '🔇' : '🔊';
        btn.title = p.muted ? 'Unmute' : 'Mute';
        btn.classList.toggle('active', p.muted);
    }

    saveState();
    showToast(p.muted ? '🔇 Muted' : '🔊 Unmuted');
}

// ── DRAG ──
function makeDraggable(el, handle, p) {
    let ox, oy, startX, startY, dragging = false;

    handle.addEventListener('mousedown', e => {
        if (e.target.closest('.vp-actions')) return;
        if (p.pinned) return;  // locked
        e.preventDefault();
        bringToFront(el, p);
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        ox = p.x; oy = p.y;
        el.classList.add('dragging');

        const move = e => {
            if (!dragging) return;
            p.x = Math.max(0, ox + (e.clientX - startX));
            p.y = Math.max(0, oy + (e.clientY - startY));
            el.style.left = p.x + 'px';
            el.style.top = p.y + 'px';
        };
        const up = () => {
            dragging = false;
            el.classList.remove('dragging');
            resolveCollisions(p);
            saveState();
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });
}

// ── RESIZE ──
function makeResizable(el, handle, p) {
    handle.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (p.pinned) return;  // locked
        const startX = e.clientX, startY = e.clientY;
        const startW = p.w, startH = p.h;
        el.classList.add('resizing');

        const move = e => {
            p.w = Math.max(200, startW + (e.clientX - startX));
            p.h = Math.max(160, startH + (e.clientY - startY));
            el.style.width = p.w + 'px';
            el.style.height = p.h + 'px';
        };
        const up = () => {
            el.classList.remove('resizing');
            resolveCollisions(p);
            saveState();
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });
}

// ── PIN / LOCK ──
function togglePin(id) {
    const p = panels.find(p => p.id === id);
    if (!p) return;
    p.pinned = !p.pinned;
    const el = document.getElementById('vp-' + id);
    const btn = document.getElementById('pin-' + id);
    el.classList.toggle('pinned', p.pinned);
    btn.classList.toggle('active', p.pinned);
    btn.title = p.pinned ? 'Unlock position & size' : 'Lock position & size';
    saveState();
    showToast(p.pinned ? '📌 Panel locked' : '🔓 Panel unlocked');
}

// ── Z-INDEX ──
function bringToFront(el, p) {
    p.z = ++zTop;
    el.style.zIndex = p.z;
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
    // Ctrl+Enter or / — focus URL input (unless already in an input)
    const tag = document.activeElement.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById('url-input').focus();
    }
    if (e.key === '/' && !inInput) {
        e.preventDefault();
        document.getElementById('url-input').focus();
    }
});

// ── ENTER KEY (inputs) ──
document.getElementById('url-input').addEventListener('keydown', e => { if (e.key === 'Enter') addPanel(); });
document.getElementById('title-input').addEventListener('keydown', e => { if (e.key === 'Enter') addPanel(); });

// ── MIDDLE-CLICK PAN ──
(function initMiddleClickPan() {
    let panning = false, startX, startY, scrollLeft, scrollTop;

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 1) return; // middle button only
        e.preventDefault();
        panning = true;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = canvas.scrollLeft;
        scrollTop = canvas.scrollTop;
        canvas.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
        if (!panning) return;
        canvas.scrollLeft = scrollLeft - (e.clientX - startX);
        canvas.scrollTop = scrollTop - (e.clientY - startY);
    });

    document.addEventListener('mouseup', e => {
        if (e.button !== 1) return;
        panning = false;
        canvas.style.cursor = '';
    });

    // Prevent the browser's "auto-scroll" mode on middle-click
    canvas.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
})();

// ── TOAST ──
let toastTimer;
function showToast(msg, err = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (err ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = '', 3000);
}

// ── HELP ──
function toggleHelp() {
    document.getElementById('help-panel').classList.toggle('open');
}

// ── BOOT: restore or seed demo ──
(function boot() {
    const restored = loadState();
    if (!restored) {
        const params = new URLSearchParams(location.search);
        if (params.get('demo') !== '0') {
            document.getElementById('url-input').value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            document.getElementById('title-input').value = 'Demo';
            addPanel();
            document.getElementById('url-input').value = '';
            document.getElementById('title-input').value = '';
        }
    }
})();
