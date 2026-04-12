// ── STATE ──
let panels = [];
let zTop = 10;
const canvas = document.getElementById('canvas');
const canvasInner = document.getElementById('canvas-inner');
const empty = document.getElementById('empty');
const panelCount = document.getElementById('panel-count');

// ── LOCAL STORAGE ──
const LS_KEY = 'gridio_board';
const LS_LAYOUTS = 'gridio_layouts';

function saveState() {
    try {
        const state = { panels: panels.map(p => ({ ...p, focused: false })), nextId, zTop };
        localStorage.setItem(LS_KEY, JSON.stringify(state));
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
        saved.forEach(p => { panels.push(p); renderPanel(p); });
        updateCount();
        empty.style.display = 'none';
        return true;
    } catch (e) { return false; }
}

// ── NAMED LAYOUTS ──
function getLayouts() {
    try { return JSON.parse(localStorage.getItem(LS_LAYOUTS)) || {}; } catch { return {}; }
}

function saveLayout() {
    showLayoutModal(name => {
        const layouts = getLayouts();
        layouts[name] = { panels: panels.map(p => ({ ...p })), nextId, zTop };
        localStorage.setItem(LS_LAYOUTS, JSON.stringify(layouts));
        refreshLayoutsSelect(name);
        showToast(`💾 Layout "${name}" saved`);
    });
}

function showLayoutModal(onConfirm) {
    const modal = document.getElementById('layout-modal');
    const input = document.getElementById('layout-name-input');
    const saveBtn = document.getElementById('layout-modal-save');
    const cancelBtn = document.getElementById('layout-modal-cancel');

    input.value = '';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 50);

    function confirm() {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        close();
        onConfirm(name);
    }
    function close() {
        modal.classList.remove('open');
        saveBtn.removeEventListener('click', confirm);
        cancelBtn.removeEventListener('click', close);
        modal.removeEventListener('click', onBackdrop);
        input.removeEventListener('keydown', onKey);
    }
    function onBackdrop(e) { if (e.target === modal) close(); }
    function onKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); confirm(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }

    saveBtn.addEventListener('click', confirm);
    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdrop);
    input.addEventListener('keydown', onKey);
}

function loadLayout(name) {
    if (!name) return;
    const layouts = getLayouts();
    const snap = layouts[name];
    if (!snap) return;
    // Clear without triggering saveState mid-restore
    panels.forEach(p => document.getElementById('vp-' + p.id)?.remove());
    panels = [];
    nextId = snap.nextId ?? 1;
    zTop = snap.zTop ?? 10;
    snap.panels.forEach(p => { panels.push({ ...p }); renderPanel(p); });
    updateCount();
    empty.style.display = panels.length === 0 ? '' : 'none';
    saveState();
    showToast(`📂 Layout "${name}" loaded`);
}

function deleteLayout() {
    const sel = document.getElementById('layouts-select');
    const name = sel.value;
    if (!name) { showToast('Select a layout first', true); return; }
    showConfirmModal(`Delete layout “${name}”?`, () => {
        const layouts = getLayouts();
        delete layouts[name];
        localStorage.setItem(LS_LAYOUTS, JSON.stringify(layouts));
        refreshLayoutsSelect('');
        showToast(`🗑 Layout “${name}” deleted`);
    });
}

function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const msg = document.getElementById('confirm-modal-msg');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    msg.textContent = message;
    modal.classList.add('open');
    okBtn.focus();

    function close() {
        modal.classList.remove('open');
        okBtn.removeEventListener('click', ok);
        cancelBtn.removeEventListener('click', close);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
    }
    function ok() { close(); onConfirm(); }
    function onBackdrop(e) { if (e.target === modal) close(); }
    function onKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); ok(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    }

    okBtn.addEventListener('click', ok);
    cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
}

function showShareModal(url) {
    const modal = document.getElementById('share-modal');
    const input = document.getElementById('share-modal-input');
    const copyBtn = document.getElementById('share-modal-copy');
    const closeBtn = document.getElementById('share-modal-close');

    input.value = url;
    modal.classList.add('open');
    setTimeout(() => { input.focus(); input.select(); }, 50);

    function close() {
        modal.classList.remove('open');
        copyBtn.removeEventListener('click', doCopy);
        closeBtn.removeEventListener('click', close);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
    }
    function doCopy() {
        navigator.clipboard.writeText(url).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
    }
    function onBackdrop(e) { if (e.target === modal) close(); }
    function onKey(e) { if (e.key === 'Escape') close(); }

    copyBtn.addEventListener('click', doCopy);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
}

function refreshLayoutsSelect(activeVal = '') {
    const sel = document.getElementById('layouts-select');
    const layouts = getLayouts();
    sel.innerHTML = '<option value="">— Layouts —</option>';
    Object.keys(layouts).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === activeVal) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ── SHAREABLE URL ──
function shareBoard() {
    if (panels.length === 0) { showToast('No panels to share', true); return; }
    try {
        const data = btoa(unescape(encodeURIComponent(JSON.stringify(panels))));
        const url = `${location.origin}${location.pathname}?board=${data}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('🔗 Link copied to clipboard!');
        }).catch(() => {
            showShareModal(url);
        });
    } catch (e) {
        showToast('Failed to generate share link', true);
    }
}

function loadFromUrl() {
    try {
        const param = new URLSearchParams(location.search).get('board');
        if (!param) return false;
        const saved = JSON.parse(decodeURIComponent(escape(atob(param))));
        if (!Array.isArray(saved) || saved.length === 0) return false;
        saved.forEach(p => { panels.push(p); renderPanel(p); });
        updateCount();
        empty.style.display = 'none';
        showToast('🔗 Board restored from shared link');
        return true;
    } catch (e) { return false; }
}

// ── EXPORT / IMPORT ──
async function exportHTML() {
    if (panels.length === 0) { showToast('No panels to export', true); return; }
    try {
        // Fetch raw CSS and JS to inline them
        const cssContent = await fetch('multi-video-board.css').then(r => r.text());
        const jsContent = await fetch('multi-video-board.js').then(r => r.text());
        let htmlContent = await fetch('multi-video-board.html').then(r => r.text());

        // Escape </script> inside JSON so the HTML parser doesn't terminate the tag early
        const safeJson = JSON.stringify(panels).replace(/<\/script>/gi, '<\\/script>');
        htmlContent = htmlContent.replace('<link rel="stylesheet" href="multi-video-board.css" />', `<style>\n${cssContent}\n</style>`);
        htmlContent = htmlContent.replace('<script src="multi-video-board.js"></script>',
            `<script id="gridio-data" type="application/json">${safeJson}</script>\n` +
            `<script>\nwindow.__GRIDIO_PRELOAD__ = JSON.parse(document.getElementById('gridio-data').textContent);\n${jsContent}\n</script>`);

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const title = panels[0]?.label || 'board';
        a.download = `gridio-${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📤 Board exported as HTML');
    } catch (e) {
        showToast('Export failed. Ensure you are running on a local server.', true);
    }
}

function importBoard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                let data;
                const content = event.target.result;
                if (file.name.endsWith('.json')) {
                    data = JSON.parse(content);
                } else {
                    // Current format: dedicated <script id="gridio-data" type="application/json"> element
                    const doc = new DOMParser().parseFromString(content, 'text/html');
                    const dataEl = doc.getElementById('gridio-data');
                    if (dataEl) {
                        data = JSON.parse(dataEl.textContent);
                    } else {
                        // Legacy format: window.__GRIDIO_PRELOAD__ = [...]; injected at top of script block
                        const match = content.match(/window\.__GRIDIO_PRELOAD__\s*=\s*(\[[\s\S]*?\]);/);
                        if (match) data = JSON.parse(match[1]);
                    }
                }

                if (!Array.isArray(data) || data.length === 0) throw new Error();

                // Load imported board
                panels.forEach(p => document.getElementById('vp-' + p.id)?.remove());
                panels = [];
                nextId = Math.max(...data.map(d => d.id)) + 1 || 1;
                data.forEach(p => { panels.push({ ...p }); renderPanel(p); });
                updateCount();
                empty.style.display = 'none';
                saveState();
                showToast(`📥 Imported layout from ${file.name}`);
            } catch (err) {
                showToast('Failed to parse imported file', true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ── COLOUR TAGS ──
const TAG_COLORS = [null, '#e84040', '#e8a020', '#30d080', '#20b8e8', '#9b6bff', '#ff69b4'];

function cycleTag(id) {
    const p = panels.find(p => p.id === id);
    if (!p) return;
    const idx = TAG_COLORS.indexOf(p.tag ?? null);
    p.tag = TAG_COLORS[(idx + 1) % TAG_COLORS.length];
    applyTag(p);
    saveState();
}

function applyTag(p) {
    const el = document.getElementById('vp-' + p.id);
    if (!el) return;
    const dot = el.querySelector('.vp-dot');
    const tagBtn = el.querySelector('.vp-btn.tag');
    if (p.tag) {
        el.style.borderTopColor = p.tag;
        el.style.borderTopWidth = '3px';
        if (dot) dot.style.background = p.tag;
        if (tagBtn) tagBtn.style.color = p.tag;
    } else {
        el.style.borderTopColor = '';
        el.style.borderTopWidth = '';
        if (dot) dot.style.background = '';
        if (tagBtn) tagBtn.style.color = 'var(--text-dim)';
    }
}

// ── URL CONVERSION ──
const BLOCKED = ['netflix.com', 'disneyplus.com', 'hulu.com', 'primevideo.com', 'amazon.com/gp/video', 'hbomax.com', 'max.com', 'peacocktv.com', 'paramountplus.com', 'apple.com/tv'];

function detectBlocked(url) {
    return BLOCKED.some(b => url.includes(b));
}

function convertToEmbed(url, muted = false, autoplay = false) {
    const muteYT = muted ? '&mute=1' : '';
    const muteVimeo = muted ? '&muted=1' : '';
    const autoVimeo = autoplay ? '&autoplay=1' : '';

    // YouTube (watch, shorts, youtu.be, and /live/ID share links)
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=${autoplay ? 1 : 0}&rel=0${muteYT}`;

    // Vimeo
    const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vi) return `https://player.vimeo.com/video/${vi[1]}?${muteVimeo}${autoVimeo}`;

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

    // TikTok
    const tt = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
    if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;

    return url;
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
    const pad = 20, step = 20;
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
    const isTikTok = /tiktok\.com/.test(raw);
    const w = isTikTok ? 325 : 480;
    const h = isTikTok ? 580 : 310;
    const { x, y } = findFreePosition(w, h);
    const panel = { id, label, raw, embedUrl, blocked, x, y, w, h, z: ++zTop, pinned: false, muted: false, tag: null };

    panels.push(panel);
    renderPanel(panel);
    updateCount();
    saveState();

    urlInput.value = '';
    titleInput.value = '';
    empty.style.display = 'none';
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

    const tagStyle = p.tag ? `color:${p.tag}` : 'color:var(--text-dim)';
    const tagBtn = p.blocked ? '' : `<button class="vp-btn tag" id="tag-${p.id}" title="Colour tag" onclick="cycleTag(${p.id})" style="${tagStyle}">●</button>`;
    const muteIcon = p.muted ? '🔇' : '🔊';
    const muteBtn = p.blocked ? '' : `<button class="vp-btn mute${p.muted ? ' active' : ''}" id="mute-${p.id}" title="${p.muted ? 'Unmute' : 'Mute'}" onclick="toggleMute(${p.id})">${muteIcon}</button>`;

    el.innerHTML = `
<div class="vp-header" id="hdr-${p.id}">
  <div class="vp-dot"></div>
  <div class="vp-title">${escHtml(p.label)}</div>
  <div class="vp-actions">
    ${tagBtn}
    ${muteBtn}
    <button class="vp-btn focus-btn" id="focus-${p.id}" title="Toggle Focus" onclick="toggleFocus(${p.id})">⛶</button>
    <button class="vp-btn pin${p.pinned ? ' active' : ''}" id="pin-${p.id}" title="${p.pinned ? 'Unlock' : 'Lock'} position &amp; size" onclick="togglePin(${p.id})">📌</button>
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
    if (p.pinned) el.classList.add('pinned');
    applyTag(p);
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

// ── TOUCH HELPER ──
function clientXY(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

// ── DRAG (mouse + touch) ──
function makeDraggable(el, handle, p) {
    let ox, oy, startX, startY, dragging = false;

    function onStart(e) {
        if (e.target.closest('.vp-actions')) return;
        if (p.pinned) return;
        if (e.type === 'mousedown' && e.button !== 0) return;
        e.preventDefault();
        bringToFront(el, p);
        dragging = true;
        const { x, y } = clientXY(e);
        startX = x; startY = y;
        ox = p.x; oy = p.y;
        el.classList.add('dragging');

        const onMove = e => {
            if (!dragging) return;
            const { x, y } = clientXY(e);
            p.x = Math.max(0, ox + (x - startX));
            p.y = Math.max(0, oy + (y - startY));
            el.style.left = p.x + 'px';
            el.style.top = p.y + 'px';
        };
        const onEnd = () => {
            dragging = false;
            el.classList.remove('dragging');
            resolveCollisions(p);
            saveState();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });
}

// ── RESIZE (mouse + touch) ──
function makeResizable(el, handle, p) {
    function onStart(e) {
        e.preventDefault();
        e.stopPropagation();
        if (p.pinned) return;
        const { x: startX, y: startY } = clientXY(e);
        const startW = p.w, startH = p.h;
        el.classList.add('resizing');

        const onMove = e => {
            const { x, y } = clientXY(e);
            p.w = Math.max(200, startW + (x - startX));
            p.h = Math.max(160, startH + (y - startY));
            el.style.width = p.w + 'px';
            el.style.height = p.h + 'px';
        };
        const onEnd = () => {
            el.classList.remove('resizing');
            resolveCollisions(p);
            saveState();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });
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
    btn.title = (p.pinned ? 'Unlock' : 'Lock') + ' position & size';
    saveState();
    showToast(p.pinned ? '📌 Panel locked' : '🔓 Panel unlocked');
}

// ── FOCUS ──
// ── THEATER MODE ──
function enterFocusMode(id) {
    const sidebar = document.getElementById('focus-sidebar');
    panels.forEach(pan => {
        const el = document.getElementById('vp-' + pan.id);
        if (!el) return;
        if (pan.id === id) {
            pan.focused = true;
            el.classList.add('theater-main');
            bringToFront(el, pan);
        } else {
            sidebar.appendChild(el);
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-click-overlay';
            overlay.addEventListener('click', () => swapFocusMain(pan.id));
            el.querySelector('.vp-body').appendChild(overlay);
        }
    });
    sidebar.classList.add('open');
    saveState();
}

function exitFocusMode() {
    const sidebar = document.getElementById('focus-sidebar');
    sidebar.classList.remove('open');
    panels.forEach(pan => {
        pan.focused = false;
        const el = document.getElementById('vp-' + pan.id);
        if (!el) return;
        el.classList.remove('theater-main');
        el.querySelector('.sidebar-click-overlay')?.remove();
        canvasInner.appendChild(el);
        el.style.left = pan.x + 'px';
        el.style.top = pan.y + 'px';
        el.style.width = pan.w + 'px';
        el.style.height = pan.h + 'px';
    });
    saveState();
}

function swapFocusMain(newId) {
    const sidebar = document.getElementById('focus-sidebar');
    const currentMain = panels.find(p => p.focused);
    const newMain = panels.find(p => p.id === newId);
    if (!newMain) return;

    if (currentMain) {
        currentMain.focused = false;
        const currentEl = document.getElementById('vp-' + currentMain.id);
        if (currentEl) {
            currentEl.classList.remove('theater-main');
            sidebar.appendChild(currentEl);
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-click-overlay';
            overlay.addEventListener('click', () => swapFocusMain(currentMain.id));
            currentEl.querySelector('.vp-body').appendChild(overlay);
        }
    }

    newMain.focused = true;
    const newEl = document.getElementById('vp-' + newId);
    if (newEl) {
        newEl.querySelector('.sidebar-click-overlay')?.remove();
        newEl.classList.add('theater-main');
        canvasInner.appendChild(newEl);
        bringToFront(newEl, newMain);
    }
    saveState();
}

function toggleFocus(id) {
    const p = panels.find(p => p.id === id);
    if (!p) return;
    const inFocusMode = panels.some(p => p.focused);
    if (!inFocusMode) {
        enterFocusMode(id);
    } else if (p.focused) {
        exitFocusMode();
    } else {
        swapFocusMain(id);
    }
}

// ── Z-INDEX ──
function bringToFront(el, p) {
    p.z = ++zTop;
    el.style.zIndex = p.z;
}

// ── RIGHT-CLICK CONTEXT MENU ──
let ctxTargetId = null;

canvasInner.addEventListener('contextmenu', e => {
    const vp = e.target.closest('.vp');
    if (!vp) return;
    e.preventDefault();
    ctxTargetId = parseInt(vp.id.replace('vp-', ''));
    const menu = document.getElementById('ctx-menu');
    // Keep menu inside viewport
    const menuW = 168, menuH = 120;
    const left = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const top = Math.min(e.clientY, window.innerHeight - menuH - 8);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('open');
});

document.addEventListener('click', e => {
    if (!e.target.closest('#ctx-menu')) {
        document.getElementById('ctx-menu').classList.remove('open');
    }
});

function ctxAction(action) {
    document.getElementById('ctx-menu').classList.remove('open');
    const p = panels.find(p => p.id === ctxTargetId);
    if (!p) return;

    if (action === 'duplicate') {
        const np = { ...p, id: nextId++, x: p.x + 24, y: p.y + 24, z: ++zTop, pinned: false };
        panels.push(np);
        renderPanel(np);
        updateCount();
        saveState();
        showToast('⧉ Panel duplicated');
    } else if (action === 'reload') {
        const body = document.querySelector(`#vp-${p.id} .vp-body`);
        if (body) {
            const iframe = body.querySelector('iframe');
            if (iframe) { const src = iframe.src; iframe.src = ''; iframe.src = src; }
        }
        showToast('↺ Panel reloaded');
    } else if (action === 'front') {
        const el = document.getElementById('vp-' + p.id);
        if (el) bringToFront(el, p);
        saveState();
        showToast('⬆ Brought to front');
    }
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Escape') {
        document.getElementById('ctx-menu').classList.remove('open');
        document.getElementById('help-panel').classList.remove('open');
        closePresets();
        // Escape exits theater mode
        if (panels.some(p => p.focused)) exitFocusMode();
    }
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
        if (e.button !== 1) return;
        e.preventDefault();
        panning = true;
        startX = e.clientX; startY = e.clientY;
        scrollLeft = canvas.scrollLeft; scrollTop = canvas.scrollTop;
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

// ── TIKTOK AUTO-RESIZE ──
window.addEventListener('message', e => {
    if (!e.origin.includes('tiktok.com')) return;
    const panel = panels.find(p => {
        const iframe = document.querySelector(`#vp-${p.id} iframe`);
        return iframe && iframe.contentWindow === e.source;
    });
    if (!panel || panel.pinned) return;
    try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const height = msg?.value?.height ?? msg?.height ?? msg?.data?.height;
        const width  = msg?.value?.width  ?? msg?.width  ?? msg?.data?.width;
        const el = document.getElementById('vp-' + panel.id);
        if (!el) return;
        const HEADER = 36;
        if (height && height > 100) {
            panel.h = Math.round(height) + HEADER;
            el.style.height = panel.h + 'px';
        }
        if (width && width > 100) {
            panel.w = Math.round(width);
            el.style.width = panel.w + 'px';
        }
        if (height || width) saveState();
    } catch { /* malformed message, ignore */ }
});

// ── PRESETS ──
let presetsData = null;
let activePresetCategory = null;

async function openPresets() {
    document.getElementById('presets-modal').classList.add('open');
    if (presetsData) return; // already loaded
    try {
        presetsData = await fetch('presets.json').then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
        renderPresetCategories();
        if (presetsData.length > 0) selectPresetCategory(presetsData[0]);
    } catch (e) {
        document.getElementById('presets-categories').innerHTML =
            `<div class="presets-error">Could not load presets.json.<br>Make sure you are running on a local server (e.g. <code>npx serve .</code>).</div>`;
        document.getElementById('presets-detail').classList.add('empty');
    }
}

function closePresets() {
    document.getElementById('presets-modal').classList.remove('open');
}

function renderPresetCategories() {
    const container = document.getElementById('presets-categories');
    container.innerHTML = presetsData.map(cat => `
        <button class="preset-cat-btn" id="pcat-${cat.id}" onclick="selectPresetCategory(presetsData.find(c=>c.id==='${cat.id}'))">
            <span class="cat-icon">${cat.icon}</span>
            <span>${cat.label}</span>
            <span class="cat-count">${cat.panels.length}</span>
        </button>`).join('');
}

function selectPresetCategory(cat) {
    if (!cat) return;
    activePresetCategory = cat;
    // Highlight active
    document.querySelectorAll('.preset-cat-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pcat-' + cat.id)?.classList.add('active');
    // Render detail
    document.getElementById('presets-detail-title').textContent = `${cat.icon}  ${cat.label} — ${cat.description}`;
    document.getElementById('presets-list').innerHTML = cat.panels.map(p =>
        `<div class="preset-panel-row"><span class="preset-dot"></span>${escHtml(p.label)}</div>`
    ).join('');
    document.getElementById('presets-detail').classList.remove('empty');
}

function applyPreset(replace) {
    if (!activePresetCategory) return;
    const doLoad = () => {
        if (replace) {
            panels.forEach(p => document.getElementById('vp-' + p.id)?.remove());
            panels = [];
        }
        activePresetCategory.panels.forEach(item => {
            const blocked = detectBlocked(item.url);
            let embedUrl = null;
            if (!blocked) {
                if (item.embed) {
                    // Patch the preset's embed URL: autoplay on, muted
                    embedUrl = item.embed
                        .replace(/autoplay=0/, 'autoplay=1')
                        + (item.embed.includes('mute=') || item.embed.includes('muted=') ? '' : '&mute=1');
                } else {
                    embedUrl = convertToEmbed(item.url, true, true);
                }
            }
            const id = nextId++;
            const isTikTok = /tiktok\.com/.test(item.url);
            const w = isTikTok ? 325 : 480, h = isTikTok ? 580 : 310;
            const { x, y } = findFreePosition(w, h);
            const panel = { id, label: item.label, raw: item.url, embedUrl, blocked, x, y, w, h, z: ++zTop, pinned: false, muted: true, tag: null, focused: false };
            panels.push(panel);
            renderPanel(panel);
        });
        updateCount();
        saveState();
        empty.style.display = 'none';
        closePresets();
        tileAll();
        showToast(`${activePresetCategory.icon} ${activePresetCategory.label} loaded`);
    };

    if (replace && panels.length > 0) {
        showConfirmModal(`Replace the current board with "${activePresetCategory.label}"?`, doLoad);
    } else {
        doLoad();
    }
}

// Close presets modal on backdrop click or Escape
document.getElementById('presets-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('presets-modal')) closePresets();
});

// ── BOOT ──
(function boot() {
    refreshLayoutsSelect();

    // Priority: Embedded preload → URL param → localStorage → demo
    if (window.__GRIDIO_PRELOAD__) {
        try {
            const data = window.__GRIDIO_PRELOAD__;
            if (Array.isArray(data) && data.length > 0) {
                nextId = Math.max(...data.map(d => d.id)) + 1 || 1;
                data.forEach(p => { panels.push(p); renderPanel(p); });
                updateCount();
                empty.style.display = 'none';
                saveState(); // Save to active local storage so it persists
                showToast('📤 Board loaded from exported file');
                return;
            }
        } catch (e) {
            console.error('Failed to load embedded preload');
        }
    }

    if (!loadFromUrl()) {
        if (!loadState()) {
            const params = new URLSearchParams(location.search);
            if (params.get('demo') !== '0') {
                document.getElementById('url-input').value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
                document.getElementById('title-input').value = 'Demo';
                addPanel();
                document.getElementById('url-input').value = '';
                document.getElementById('title-input').value = '';
            }
        }
    }
})();
