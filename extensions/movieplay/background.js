// background.js — MoviePlay Companion Service Worker

api.runtime.onInstalled.addListener(() => {
  api.storage.local.get(['shareLocalNetwork', 'defaultPlayer'], (res) => {
    if (res.shareLocalNetwork === undefined) {
      api.storage.local.set({ shareLocalNetwork: false });
    }
    if (!res.defaultPlayer) {
      api.storage.local.set({ defaultPlayer: 'auto' });
    }
  });
});

// Relay messages between popup and active video tabs
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    api.storage.local.get(['shareLocalNetwork', 'defaultPlayer'], (res) => {
      sendResponse({
        active: true,
        shareLocalNetwork: !!res.shareLocalNetwork,
        defaultPlayer: res.defaultPlayer || 'auto'
      });
    });
    return true;
  }
  
  if (request.type === 'SET_SETTING') {
    api.storage.local.set(request.payload, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
