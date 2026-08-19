// popup.js — Messenger Translate extension settings

const PROVIDER_FIELDS = {
  mymemory:      ['mymemory'],
  deepl:         ['deepl'],
  google:        ['google'],
  libretranslate: ['libretranslate'],
  openai:        ['openai'],
  gemini:        ['gemini'],
  claude:        ['claude'],
};

// ── Element refs ──────────────────────────────────────────────────────────────
const $enabled      = document.getElementById('enabled');
const $toggleLabel  = document.getElementById('toggle-label');
const $provider     = document.getElementById('provider');
const $status       = document.getElementById('status');
const $btnSave      = document.getElementById('btn-save');
const $btnTest      = document.getElementById('btn-test');

const fields = {
  myMemoryEmail : document.getElementById('myMemoryEmail'),
  deepl         : document.getElementById('key-deepl'),
  google        : document.getElementById('key-google'),
  libreUrl      : document.getElementById('libreUrl'),
  libre         : document.getElementById('key-libre'),
  openai        : document.getElementById('key-openai'),
  modelOpenai   : document.getElementById('model-openai'),
  gemini        : document.getElementById('key-gemini'),
  modelGemini   : document.getElementById('model-gemini'),
  claude        : document.getElementById('key-claude'),
  modelClaude   : document.getElementById('model-claude'),
};

// ── Load saved settings ───────────────────────────────────────────────────────
api.storage.local.get(null, (cfg) => {
  $enabled.checked          = cfg.enabled !== false;
  $toggleLabel.textContent  = $enabled.checked ? 'On' : 'Off';
  $provider.value           = cfg.provider || 'mymemory';

  fields.myMemoryEmail.value = cfg.myMemoryEmail || '';
  fields.deepl.value         = cfg.key_deepl     || '';
  fields.google.value        = cfg.key_google     || '';
  fields.libreUrl.value      = cfg.libreUrl       || '';
  fields.libre.value         = cfg.key_libre      || '';
  fields.openai.value        = cfg.key_openai     || '';
  fields.modelOpenai.value   = cfg.model_openai   || 'gpt-4o-mini';
  fields.gemini.value        = cfg.key_gemini     || '';
  fields.modelGemini.value   = cfg.model_gemini   || 'gemini-1.5-flash';
  fields.claude.value        = cfg.key_claude     || '';
  fields.modelClaude.value   = cfg.model_claude   || 'claude-haiku-4-5';

  showFieldsFor($provider.value);
});

// ── Toggle ────────────────────────────────────────────────────────────────────
$enabled.addEventListener('change', () => {
  $toggleLabel.textContent = $enabled.checked ? 'On' : 'Off';
});

// ── Provider change ───────────────────────────────────────────────────────────
$provider.addEventListener('change', () => showFieldsFor($provider.value));

function showFieldsFor(provider) {
  document.querySelectorAll('[data-show]').forEach((el) => {
    const shows = el.getAttribute('data-show');
    el.classList.toggle('visible', shows === provider);
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────
$btnSave.addEventListener('click', () => {
  const provider = $provider.value;

  // Resolve key + model based on provider
  let key = '', model = '';
  if (provider === 'mymemory')        { /* no key */ }
  else if (provider === 'deepl')      { key = fields.deepl.value.trim(); }
  else if (provider === 'google')     { key = fields.google.value.trim(); }
  else if (provider === 'libretranslate') { key = fields.libre.value.trim(); }
  else if (provider === 'openai')     { key = fields.openai.value.trim(); model = fields.modelOpenai.value; }
  else if (provider === 'gemini')     { key = fields.gemini.value.trim(); model = fields.modelGemini.value; }
  else if (provider === 'claude')     { key = fields.claude.value.trim(); model = fields.modelClaude.value; }

  if (needsKey(provider) && !key) {
    showStatus('err', '⚠ Please enter an API key for this provider.');
    return;
  }

  const cfg = {
    enabled:        $enabled.checked,
    provider,
    key,
    model,
    myMemoryEmail:  fields.myMemoryEmail.value.trim(),
    libreUrl:       fields.libreUrl.value.trim(),
    // Also save per-provider keys individually so switching doesn't lose them
    key_deepl:      fields.deepl.value.trim(),
    key_google:     fields.google.value.trim(),
    key_libre:      fields.libre.value.trim(),
    key_openai:     fields.openai.value.trim(),
    key_gemini:     fields.gemini.value.trim(),
    key_claude:     fields.claude.value.trim(),
    model_openai:   fields.modelOpenai.value,
    model_gemini:   fields.modelGemini.value,
    model_claude:   fields.modelClaude.value,
  };

  api.storage.local.set(cfg, () => {
    // Notify active Messenger tabs
    api.tabs.query({ url: ['*://messenger.com/*', '*://web.facebook.com/messages*'] }, (tabs) => {
      tabs.forEach((tab) => {
        api.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', cfg }).catch(() => {});
      });
    });
    showStatus('ok', '✓ Settings saved.');
  });
});

// ── Test ──────────────────────────────────────────────────────────────────────
$btnTest.addEventListener('click', async () => {
  const provider = $provider.value;
  showStatus('inf', '⟳ Testing translation…');
  $btnTest.disabled = true;

  try {
    const result = await testTranslation(provider);
    if (result) {
      showStatus('ok', `✓ Working! Test: "${result}"`);
    } else {
      showStatus('err', '✗ No translation returned. Check your key.');
    }
  } catch (err) {
    showStatus('err', `✗ Error: ${err.message}`);
  } finally {
    $btnTest.disabled = false;
  }
});

async function testTranslation(provider) {
  const testText = 'Hola, ¿cómo estás?'; // Spanish — should come back as English

  if (provider === 'mymemory') {
    const email = fields.myMemoryEmail.value.trim();
    const de = email ? `&de=${encodeURIComponent(email)}` : '';
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(testText)}&langpair=autodetect|en${de}`
    );
    const data = await res.json();
    return data.responseData?.translatedText;
  }

  if (provider === 'deepl') {
    const key = fields.deepl.value.trim();
    const base = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const body = new URLSearchParams({ auth_key: key, text: testText, target_lang: 'EN' });
    const res = await fetch(`${base}/v2/translate`, {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json();
    return data.translations?.[0]?.text;
  }

  if (provider === 'google') {
    const key = fields.google.value.trim();
    const params = new URLSearchParams({ q: testText, target: 'en', key });
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`);
    const data = await res.json();
    return data.data?.translations?.[0]?.translatedText;
  }

  if (provider === 'libretranslate') {
    const base = (fields.libreUrl.value.trim() || 'https://libretranslate.com').replace(/\/$/, '');
    const body = { q: testText, source: 'auto', target: 'en', format: 'text' };
    if (fields.libre.value.trim()) body.api_key = fields.libre.value.trim();
    const res = await fetch(`${base}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.translatedText;
  }

  // AI providers
  const prompt =
    `Translate this to English: "${testText}"\nReturn ONLY the translation.`;

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fields.openai.value.trim()}`,
      },
      body: JSON.stringify({
        model: fields.modelOpenai.value || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 128,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices?.[0]?.message?.content?.trim();
  }

  if (provider === 'gemini') {
    const key   = fields.gemini.value.trim();
    const model = fields.modelGemini.value || 'gemini-1.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': fields.claude.value.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: fields.modelClaude.value || 'claude-haiku-4-5',
        max_tokens: 128,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.content?.[0]?.text?.trim();
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function needsKey(provider) {
  return !['mymemory', 'libretranslate'].includes(provider);
}

function showStatus(type, msg) {
  $status.className = type;
  $status.textContent = msg;
  if (type !== 'inf') {
    setTimeout(() => { $status.className = ''; $status.textContent = ''; }, 4000);
  }
}
