// popup.js — MoviePlay Companion Popup Logic

const playerSelect = document.getElementById('playerSelect');
const relayToggle = document.getElementById('relayToggle');
const osLabel = document.getElementById('osLabel');
const statusMsg = document.getElementById('statusMsg');

function detectOS() {
  const p = navigator.platform?.toLowerCase() ?? '';
  const u = navigator.userAgent?.toLowerCase() ?? '';
  if (p.startsWith('win') || u.includes('windows')) return 'Windows (start "")';
  if (p.startsWith('mac') || u.includes('macintosh') || u.includes('mac os')) return 'macOS (open)';
  return 'Linux (xdg-open)';
}

osLabel.textContent = `OS: ${detectOS()}`;

// Load settings
api.storage.local.get(['shareLocalNetwork', 'defaultPlayer'], (res) => {
  if (res.shareLocalNetwork !== undefined) {
    relayToggle.checked = !!res.shareLocalNetwork;
  }
  if (res.defaultPlayer) {
    playerSelect.value = res.defaultPlayer;
  }
});

function showStatus(text) {
  statusMsg.textContent = text;
  setTimeout(() => {
    statusMsg.textContent = '';
  }, 2500);
}

relayToggle.addEventListener('change', () => {
  api.storage.local.set({ shareLocalNetwork: relayToggle.checked }, () => {
    showStatus(relayToggle.checked ? '✓ Local network relay enabled' : '✓ Local network relay disabled');
  });
});

playerSelect.addEventListener('change', () => {
  api.storage.local.set({ defaultPlayer: playerSelect.value }, () => {
    showStatus(`✓ Preferred player: ${playerSelect.options[playerSelect.selectedIndex].text}`);
  });
});
