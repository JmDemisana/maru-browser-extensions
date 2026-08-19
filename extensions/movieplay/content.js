// ─── MoviePlay Companion – content.js ────────────────────────────────────────
// Features:
//   • Flags MoviePlay web app that companion extension is installed
//   • Injects video toolbar with 1-click external player launch (VLC, MPV, IINA, PotPlayer)
//   • OS-aware zero-install terminal command runner (Windows start, macOS open, Linux xdg-open)
//   • Local Network Mobile Relay integration (off by default)
// ─────────────────────────────────────────────────────────────────────────────

// Mark extension presence for MoviePlay web applet
try {
  document.documentElement.dataset.movieplayExtension = "true";
  document.documentElement.setAttribute("data-movieplay-extension", "true");
  window.postMessage({ type: "MOVIEPLAY_EXTENSION_READY", version: "1.0.0" }, "*");
} catch (e) {}

const ATTR = 'data-mp-done';
const TOOLBAR_ID = 'mp-toolbar';

// ─── OS Detection ────────────────────────────────────────────────────────────

function detectOS() {
  const p = navigator.platform?.toLowerCase() ?? '';
  const u = navigator.userAgent?.toLowerCase() ?? '';
  if (p.startsWith('win') || u.includes('windows')) return 'windows';
  if (p.startsWith('mac') || u.includes('macintosh') || u.includes('mac os')) return 'mac';
  return 'linux';
}

const OS = detectOS();

// ─── Media Players ───────────────────────────────────────────────────────────

const PLAYERS = [
  {
    id: 'vlc',
    label: 'VLC',
    icon: '🎬',
    protocol: (url) => `vlc://${url}`,
  },
  {
    id: 'mpv',
    label: 'MPV',
    icon: '▶',
    protocol: (url) => `mpv://${url}`,
  },
  {
    id: 'iina',
    label: 'IINA',
    icon: '🍎',
    protocol: (url) => `iina://weblink?url=${encodeURIComponent(url)}`,
    platforms: ['mac'],
  },
  {
    id: 'potplayer',
    label: 'PotPlayer',
    icon: '🎞',
    protocol: (url) => `potplayer://${url}`,
    platforms: ['windows'],
  },
  {
    id: 'mpc',
    label: 'MPC-HC',
    icon: '📺',
    protocol: (url) => `mpc://${url}`,
    platforms: ['windows'],
  },
];

// ─── OS-aware terminal command (no install required) ─────────────────────────

function getTerminalCommand(url) {
  if (OS === 'windows') {
    return {
      shell: 'Command Prompt / PowerShell',
      cmd: `start "" "${url}"`,
      note: 'Plays in your default media player without closing the terminal. Or test with: ffplay "${url}"',
    };
  }
  if (OS === 'mac') {
    return {
      shell: 'Terminal',
      cmd: `open "${url}"`,
      note: 'Plays in QuickTime or default macOS player. Or test with: mpv "${url}"',
    };
  }
  return {
    shell: 'Terminal',
    cmd: `xdg-open "${url}"`,
    note: 'Plays in your default Linux media player. Or test with: mpv "${url}" or ffplay "${url}"',
  };
}

// ─── Toolbar injection ────────────────────────────────────────────────────────

function injectToolbar(video) {
  if (video.hasAttribute(ATTR)) return;
  video.setAttribute(ATTR, '1');

  // Avoid injecting into tiny UI audio/video thumbnails
  const rect = video.getBoundingClientRect();
  if (rect.width > 0 && rect.width < 120 && rect.height > 0 && rect.height < 90) return;

  const wrap = document.createElement('div');
  wrap.className = 'mp-wrap';
  wrap.style.cssText = 'position:relative;display:inline-block;max-width:100%;';

  if (video.parentNode) {
    video.parentNode.insertBefore(wrap, video);
    wrap.appendChild(video);
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'mp-toolbar';
  toolbar.id = TOOLBAR_ID + '-' + Math.random().toString(36).slice(2);
  toolbar.style.cssText = [
    'position:absolute', 'top:8px', 'right:8px',
    'display:none',
    'align-items:center', 'gap:6px',
    'background:rgba(10,10,18,0.92)',
    'border:1px solid rgba(147,51,234,0.3)',
    'border-radius:10px',
    'padding:5px 8px',
    'z-index:2147483647',
    'font-family:system-ui,-apple-system,sans-serif',
    'font-size:12px',
    'backdrop-filter:blur(10px)',
    'box-shadow:0 4px 18px rgba(0,0,0,0.55)',
  ].join(';');

  wrap.appendChild(toolbar);

  wrap.addEventListener('mouseenter', () => { toolbar.style.display = 'flex'; });
  wrap.addEventListener('mouseleave', () => { toolbar.style.display = 'none'; });

  buildToolbar(toolbar, video);
}

function buildToolbar(toolbar, video) {
  // ── Player buttons ────────────────────────────────────────────────────────
  for (const player of PLAYERS) {
    if (player.platforms && !player.platforms.includes(OS)) continue;

    const btn = makeBtn(player.icon, player.label);
    btn.title = `Open in ${player.label}`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const src = getVideoSrc(video);
      if (!src) return showToast(toolbar, '⚠ No active stream URL');
      window.location.href = player.protocol(src);
    });
    toolbar.appendChild(btn);
  }

  // ── Divider ───────────────────────────────────────────────────────────────
  const div = document.createElement('span');
  div.style.cssText = 'width:1px;height:16px;background:rgba(255,255,255,0.15);flex-shrink:0;margin:0 2px;';
  toolbar.appendChild(div);

  // ── Copy stream URL ───────────────────────────────────────────────────────
  const copyBtn = makeBtn('📋', 'Copy URL');
  copyBtn.title = 'Copy raw stream URL';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const src = getVideoSrc(video);
    if (!src) return showToast(toolbar, '⚠ No active stream URL');
    navigator.clipboard.writeText(src).then(() => showToast(toolbar, '✓ Stream URL copied!'));
  });
  toolbar.appendChild(copyBtn);

  // ── Copy terminal command ─────────────────────────────────────────────────
  const cmdBtn = makeBtn('⌨', 'Terminal');
  cmdBtn.title = 'Copy zero-install OS terminal command';
  cmdBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const src = getVideoSrc(video);
    if (!src) return showToast(toolbar, '⚠ No active stream URL');
    const { cmd, shell, note } = getTerminalCommand(src);
    navigator.clipboard.writeText(cmd).then(() => {
      showToast(toolbar, `✓ Copied for ${shell}!`);
      showCmdCard(cmd, shell, note);
    });
  });
  toolbar.appendChild(cmdBtn);
}

// ─── Command card overlay ─────────────────────────────────────────────────────

function showCmdCard(cmd, shell, note) {
  const existing = document.getElementById('mp-cmd-card');
  if (existing) existing.remove();

  const card = document.createElement('div');
  card.id = 'mp-cmd-card';
  card.style.cssText = [
    'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
    'max-width:540px', 'width:calc(100% - 32px)',
    'background:rgba(12,14,24,0.98)',
    'border:1px solid rgba(147,51,234,0.4)',
    'border-radius:14px', 'padding:16px',
    'z-index:2147483648',
    'font-family:system-ui,-apple-system,sans-serif',
    'box-shadow:0 8px 32px rgba(0,0,0,0.7)',
    'backdrop-filter:blur(14px)',
  ].join(';');

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;">⌨</span>
        <span style="font-size:12px;color:#c084fc;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Paste into ${escHtml(shell)}</span>
      </div>
      <button id="mp-cmd-close" style="background:none;border:none;color:rgba(255,255,255,0.45);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;">✕</button>
    </div>
    <div style="background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-family:monospace;font-size:13px;color:#f8fafc;word-break:break-all;user-select:all;">${escHtml(cmd)}</div>
    <div style="font-size:11.5px;color:rgba(255,255,255,0.5);line-height:1.5;">${escHtml(note)}</div>
  `;

  document.body.appendChild(card);

  document.getElementById('mp-cmd-close').addEventListener('click', () => card.remove());
  setTimeout(() => card?.remove(), 12000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVideoSrc(video) {
  return video.currentSrc || video.src
    || video.querySelector?.('source')?.src
    || null;
}

function makeBtn(icon, label) {
  const btn = document.createElement('button');
  btn.style.cssText = [
    'background:none', 'border:none', 'cursor:pointer',
    'color:#e8eaf0', 'font-size:12px',
    'display:flex', 'align-items:center', 'gap:4px',
    'padding:4px 8px', 'border-radius:6px',
    'transition:background .15s, color .15s',
    'white-space:nowrap',
  ].join(';');
  btn.innerHTML = `<span style="font-size:14px;line-height:1;">${icon}</span><span>${label}</span>`;
  btn.addEventListener('mouseenter', () => { 
    btn.style.background = 'rgba(255,255,255,0.12)'; 
    btn.style.color = '#ffffff';
  });
  btn.addEventListener('mouseleave', () => { 
    btn.style.background = 'none'; 
    btn.style.color = '#e8eaf0';
  });
  return btn;
}

function showToast(anchor, msg) {
  const t = document.createElement('div');
  t.style.cssText = [
    'position:absolute', 'bottom:calc(100% + 6px)', 'right:0',
    'background:rgba(12,14,24,0.96)', 'color:#e8eaf0',
    'font-size:11.5px', 'padding:5px 10px', 'border-radius:7px',
    'border:1px solid rgba(147,51,234,0.3)',
    'white-space:nowrap', 'pointer-events:none',
    'box-shadow:0 2px 10px rgba(0,0,0,.5)',
  ].join(';');
  t.textContent = msg;
  anchor.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Observe Videos ───────────────────────────────────────────────────────────

function scanVideos() {
  document.querySelectorAll('video:not([data-mp-done])').forEach(injectToolbar);
}

scanVideos();

new MutationObserver(() => scanVideos())
  .observe(document.body, { childList: true, subtree: true });
