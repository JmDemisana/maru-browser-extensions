// ─── Messenger Translate – content.js ────────────────────────────────────────
// • Incoming non-English messages → English badge appended
// • Outgoing messages → live Japanese preview strip + auto-translate on send
// Works on: messenger.com  AND  web.facebook.com/messages
// ─────────────────────────────────────────────────────────────────────────────

const ATTR = 'data-mt-done';
let isSending = false;
let skipNextTranslation = false;

// Preview state
let previewEl        = null;
let previewDebounce  = null;
let lastPreviewInput = '';
let lastPreviewJa    = '';

let cfg = {
  enabled: true,
  provider: 'mymemory',
  key: '',
  model: '',
  libreUrl: '',
  myMemoryEmail: '',
};

api.storage.local.get(null, (stored) => {
  Object.assign(cfg, stored);
  init();
});

api.storage.onChanged.addListener((changes) => {
  for (const [k, v] of Object.entries(changes)) cfg[k] = v.newValue;
});

api.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PING') return;
});

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  observeIncoming();
  setupOutgoingPreview();
  setupOutgoingSend();
}

// ─── Incoming: MutationObserver ───────────────────────────────────────────────

function observeIncoming() {
  // Scan messages already on screen when the extension loads
  setTimeout(scanAll, 1500);

  const observer = new MutationObserver((mutations) => {
    if (!cfg.enabled) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        scanForBubbles(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function scanAll() {
  document.querySelectorAll('div[dir="auto"]').forEach(processCandidate);
}

function scanForBubbles(root) {
  const nodes = root.matches?.('div[dir="auto"]')
    ? [root, ...root.querySelectorAll('div[dir="auto"]')]
    : (root.querySelectorAll ? root.querySelectorAll('div[dir="auto"]') : []);
  nodes.forEach(processCandidate);
}

function processCandidate(el) {
  if (el.hasAttribute(ATTR)) return;
  if (!isInsideMessageRow(el)) return;
  if (containsOnlyEmoji(el)) return;

  const text = el.innerText?.trim();
  if (!text || text.length < 3) return;

  el.setAttribute(ATTR, 'processing');
  handleIncoming(el, text);
}

function isInsideMessageRow(el) {
  // Reject anything inside nav / header / sidebar
  let p = el.parentElement;
  let depth = 0;
  while (p && depth < 25) {
    const role = p.getAttribute('role');
    if (role === 'navigation' || role === 'banner' || role === 'complementary') return false;
    if (role === 'row' || role === 'gridcell' || role === 'listitem') return true;
    p = p.parentElement;
    depth++;
  }
  // Fall back: deep enough nesting = likely inside the chat feed
  return depth >= 10;
}

function isMyOwnMessage(el) {
  // Sent bubbles sit on the right side of the viewport;
  // received bubbles sit on the left. Use position as the signal.
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return rect.left > window.innerWidth * 0.52;
}

function containsOnlyEmoji(el) {
  const t = el.innerText?.trim() ?? '';
  return /^[\p{Emoji}\s]+$/u.test(t) && t.length < 10;
}

async function handleIncoming(el, text) {
  try {
    const result = await detectAndTranslateToEnglish(text);
    if (!result) { el.setAttribute(ATTR, 'skipped'); return; }

    el.setAttribute(ATTR, 'done');

    const divider = document.createElement('hr');
    divider.style.cssText = 'border:none;border-top:1px solid rgba(0,0,0,0.15);margin:6px 0 5px';

    const translation = document.createElement('div');
    translation.style.cssText = 'font-size:12.5px;color:rgba(0,0,0,0.5);line-height:1.5;word-break:break-word';
    translation.textContent = result;

    el.appendChild(divider);
    el.appendChild(translation);
  } catch {
    el.setAttribute(ATTR, 'error');
  }
}

// ─── Outgoing: live preview strip ─────────────────────────────────────────────

function setupOutgoingPreview() {
  document.addEventListener('input', (e) => {
    if (!cfg.enabled) return;
    const input = e.target;
    if (input.getAttribute('role') !== 'textbox' || !input.isContentEditable) return;

    const text = input.innerText?.trim();

    if (!text || text.length < 2 || /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(text)) {
      hidePreview(); return;
    }

    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(() => updatePreview(text), 650);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePreview();
  }, true);
}

async function updatePreview(text) {
  if (!cfg.enabled) { hidePreview(); return; }
  if (text === lastPreviewInput && previewEl?.style.display !== 'none') return;

  lastPreviewInput = text;
  ensurePreview();
  setPreviewText('…', true);

  const ja = await translateToJapanese(text);
  if (!ja || ja === text) { hidePreview(); return; }

  lastPreviewJa = ja;
  setPreviewText(ja, false);
}

function positionPreview() {
  if (!previewEl) return;
  const input = document.querySelector('[role="textbox"][contenteditable="true"]');
  if (!input) {
    // Fallback: sit high enough to clear any popup
    previewEl.style.top = 'auto';
    previewEl.style.bottom = '130px';
    return;
  }
  const rect = input.getBoundingClientRect();
  // 95px above the input top clears the Windows dictionary popup (~50px) + gap
  const top = Math.max(8, rect.top - 95);
  previewEl.style.bottom = 'auto';
  previewEl.style.top = `${top}px`;
}

function ensurePreview() {
  if (previewEl) { previewEl.style.display = 'flex'; positionPreview(); return; }

  previewEl = document.createElement('div');
  previewEl.id = 'mt-preview';
  previewEl.style.cssText = [
    'position:fixed', 'top:auto', 'left:50%', 'transform:translateX(-50%)',
    'max-width:580px', 'width:calc(100% - 230px)',
    'background:rgba(13,15,26,0.96)',
    'border:1px solid rgba(91,140,255,0.35)',
    'border-radius:14px', 'padding:11px 14px',
    'display:flex', 'align-items:flex-start', 'gap:10px',
    'z-index:2147483647',
    'font-family:system-ui,sans-serif',
    'backdrop-filter:blur(10px)',
    'box-shadow:0 6px 28px rgba(0,0,0,0.45)',
    'transition:opacity 0.15s',
  ].join(';');

  previewEl.innerHTML = `
    <span style="font-size:17px;line-height:1;flex-shrink:0;padding-top:1px">🌐</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:4px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Sending as Japanese</div>
      <div id="mt-preview-text" style="font-size:14px;color:#e8eaf0;line-height:1.5;word-break:break-word"></div>
    </div>
    <button id="mt-skip-btn" style="
      flex-shrink:0; align-self:flex-start;
      background:none;
      border:1px solid rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.45);
      font-size:11.5px; padding:4px 10px;
      border-radius:7px; cursor:pointer;
      font-family:system-ui; white-space:nowrap;
      transition:border-color 0.15s,color 0.15s;
      margin-top:1px;
    ">Skip</button>
  `;

  document.body.appendChild(previewEl);

  document.getElementById('mt-skip-btn').addEventListener('click', () => {
    skipNextTranslation = true;
    hidePreview();
  });

  const skipBtn = document.getElementById('mt-skip-btn');
  skipBtn.addEventListener('mouseenter', () => {
    skipBtn.style.borderColor = 'rgba(255,92,92,0.55)';
    skipBtn.style.color = '#ff6b6b';
  });
  skipBtn.addEventListener('mouseleave', () => {
    skipBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    skipBtn.style.color = 'rgba(255,255,255,0.45)';
  });
}

function setPreviewText(text, loading) {
  const el = document.getElementById('mt-preview-text');
  if (!el) return;
  el.textContent = text;
  if (previewEl) previewEl.style.opacity = loading ? '0.55' : '1';
  positionPreview();
}

function hidePreview() {
  if (previewEl) previewEl.style.display = 'none';
  lastPreviewInput = '';
  lastPreviewJa    = '';
}

// ─── Outgoing: send intercept ─────────────────────────────────────────────────

function setupOutgoingSend() {
  document.addEventListener('keydown', async (e) => {
    if (!cfg.enabled) return;
    if (e.key !== 'Enter' || e.shiftKey || isSending) return;

    const input = e.target;
    if (input.getAttribute('role') !== 'textbox' || !input.isContentEditable) return;

    const text = input.innerText?.trim();
    if (!text) return;

    // Already CJK — don't touch
    if (/[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(text)) { hidePreview(); return; }

    // User hit Skip
    if (skipNextTranslation) {
      skipNextTranslation = false;
      hidePreview();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    hidePreview();

    // Reuse cached preview result if the text matches
    let japanese = (text === lastPreviewInput && lastPreviewJa) ? lastPreviewJa : null;

    if (!japanese) {
      const ind = showIndicator('🌐 Translating…');
      try { japanese = await translateToJapanese(text); }
      finally { removeIndicator(ind); }
    }

    if (japanese && japanese !== text) {
      setEditableText(input, japanese);
      // Give React's scheduler time to process the input event
      await sleep(300);
    }

    isSending = true;
    try {
      // Primary: click the real send button — avoids isTrusted issues with Enter simulation
      const sent = clickSendButton();
      if (!sent) {
        // Fallback: simulate Enter
        input.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true,
        }));
      }
    } finally {
      await sleep(300);
      isSending = false;
    }
  }, true);
}

/**
 * Replace all content inside a React contenteditable precisely using the Range API.
 * execCommand('selectAll') selects the whole page; this targets only the element.
 */
function setEditableText(el, text) {
  el.focus();

  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);

  // insertText replaces the selection and fires the native InputEvent React listens to
  document.execCommand('insertText', false, text);
}

/**
 * Find and click Messenger's send button.
 * More reliable than dispatching a KeyboardEvent (isTrusted = false).
 */
function clickSendButton() {
  const candidates = [
    '[aria-label="Send"][role="button"]',
    '[aria-label="Send"]',
    'div[aria-label="Press Enter to send"]',
    '[data-testid="mw-composer-send-button"]',
  ];
  const textbox = document.querySelector('[role="textbox"]');
  for (const sel of candidates) {
    const btn = document.querySelector(sel);
    if (btn && btn !== textbox) { btn.click(); return true; }
  }
  return false;
}

// ─── Translation dispatcher ───────────────────────────────────────────────────

async function detectAndTranslateToEnglish(text) {
  const p = cfg.provider;
  if (p === 'mymemory')       return myMemoryDetectTranslate(text);
  if (p === 'deepl')          return deeplTranslate(text, 'EN');
  if (p === 'google')         return googleTranslate(text, 'en');
  if (p === 'libretranslate') return libreTranslate(text, 'auto', 'en');
  if (['openai','gemini','claude'].includes(p)) return aiTranslateIncoming(text, p);
  return null;
}

async function translateToJapanese(text) {
  const p = cfg.provider;
  if (p === 'mymemory')       return myMemoryTranslate(text, 'en', 'ja');
  if (p === 'deepl')          return deeplTranslate(text, 'JA', true);
  if (p === 'google')         return googleTranslate(text, 'ja', 'en');
  if (p === 'libretranslate') return libreTranslate(text, 'en', 'ja');
  if (['openai','gemini','claude'].includes(p)) return aiTranslateOutgoing(text, p);
  return null;
}

// ─── MyMemory ─────────────────────────────────────────────────────────────────

async function myMemoryDetectTranslate(text) {
  const de = cfg.myMemoryEmail ? `&de=${encodeURIComponent(cfg.myMemoryEmail)}` : '';
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en${de}`
  );
  const data = await res.json();
  if (data.responseStatus !== 200) return null;
  const detected = (data.matches?.[0]?.de ?? '').toLowerCase();
  if (detected.startsWith('en')) return null;
  const t = data.responseData?.translatedText;
  return (!t || t === text) ? null : t;
}

async function myMemoryTranslate(text, from, to) {
  const de = cfg.myMemoryEmail ? `&de=${encodeURIComponent(cfg.myMemoryEmail)}` : '';
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}${de}`
  );
  const data = await res.json();
  return data.responseStatus === 200 ? (data.responseData?.translatedText ?? null) : null;
}

// ─── DeepL ────────────────────────────────────────────────────────────────────

async function deeplTranslate(text, targetLang, skipDetect = false) {
  if (!cfg.key) return null;
  const base = cfg.key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const body = new URLSearchParams({ auth_key: cfg.key, text, target_lang: targetLang });
  const res = await fetch(`${base}/v2/translate`, {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json();
  const t = data.translations?.[0];
  if (!t) return null;
  if (!skipDetect && (t.detected_source_language ?? '').startsWith('EN')) return null;
  return t.text ?? null;
}

// ─── Google Translate ─────────────────────────────────────────────────────────

async function googleTranslate(text, target, source) {
  if (!cfg.key) return null;
  const params = new URLSearchParams({ q: text, target, key: cfg.key });
  if (source) params.set('source', source);
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`);
  const data = await res.json();
  const t = data.data?.translations?.[0];
  if (!t) return null;
  if (!source) {
    const dl = (t.detectedSourceLanguage ?? '').toLowerCase();
    if (dl.startsWith('en')) return null;
  }
  return t.translatedText ?? null;
}

// ─── LibreTranslate ───────────────────────────────────────────────────────────

async function libreTranslate(text, source, target) {
  const base = (cfg.libreUrl || 'https://libretranslate.com').replace(/\/$/, '');
  const body = { q: text, source, target, format: 'text' };
  if (cfg.key) body.api_key = cfg.key;
  const res = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const translated = data.translatedText;
  if (!translated || translated === text) return null;
  if (source === 'auto') {
    const dl = (data.detectedLanguage?.language ?? '').toLowerCase();
    if (dl.startsWith('en')) return null;
  }
  return translated;
}

// ─── AI providers ─────────────────────────────────────────────────────────────

const INCOMING_PROMPT = (text) =>
  `You are a translator in a chat app. Detect the language of this message.\n` +
  `• If it is already English, reply with exactly: ENGLISH\n` +
  `• If it is NOT English, translate it to natural, conversational English.\n` +
  `Return ONLY "ENGLISH" or the translation — no explanations.\n\nMessage: ${text}`;

const OUTGOING_PROMPT = (text) =>
  `Translate this chat message to natural, casual Japanese for a private conversation.\n` +
  `Match the tone (casual, enthusiastic, etc.) of the original.\n` +
  `Return ONLY the Japanese text — no explanations, no romanisation, no quotes.\n\nMessage: ${text}`;

async function aiTranslateIncoming(text, provider) {
  const reply = await aiCall(INCOMING_PROMPT(text), provider);
  if (!reply) return null;
  if (reply.trim().toUpperCase() === 'ENGLISH') return null;
  return reply.trim();
}

async function aiTranslateOutgoing(text, provider) {
  const reply = await aiCall(OUTGOING_PROMPT(text), provider);
  return reply?.trim() ?? null;
}

async function aiCall(prompt, provider) {
  if (!cfg.key) return null;
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 512, temperature: 0.3,
        }),
      });
      return (await res.json()).choices?.[0]?.message?.content ?? null;
    }

    if (provider === 'gemini') {
      const model = cfg.model || 'gemini-1.5-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
          }),
        }
      );
      return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: cfg.model || 'claude-haiku-4-5',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      return (await res.json()).content?.[0]?.text ?? null;
    }
  } catch { return null; }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showIndicator(msg) {
  const el = document.createElement('div');
  el.id = 'mt-indicator';
  el.style.cssText = [
    'position:fixed', 'bottom:76px', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(20,20,30,0.88)', 'color:#fff',
    'padding:7px 18px', 'border-radius:999px',
    'font-size:13px', 'font-family:system-ui,sans-serif',
    'z-index:2147483647', 'pointer-events:none',
    'backdrop-filter:blur(6px)',
    'box-shadow:0 2px 12px rgba(0,0,0,0.3)',
  ].join(';');
  el.textContent = msg;
  document.body.appendChild(el);
  return el;
}

function removeIndicator(el) { el?.remove(); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
