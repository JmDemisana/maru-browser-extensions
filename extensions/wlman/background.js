// Background Service Worker for WLMan Router Companion Helper
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "WLMAN_AUTOMATE_BLOCK_MAC") {
    const targetMac = request.mac;
    console.log("[WLMan Extension Background] Received block request for MAC:", targetMac);

    // Find open DITO router tab
    api.tabs.query({ url: "http://192.168.8.1/*" }, (tabs) => {
      if (tabs.length > 0) {
        const routerTab = tabs[0];

        // Ensure tab is navigated to #wlanmacfilter
        const targetUrl = "http://192.168.8.1/html/settings.html#wlanmacfilter";
        
        api.tabs.update(routerTab.id, { active: true, url: targetUrl }, () => {
          setTimeout(() => {
            api.tabs.sendMessage(routerTab.id, {
              type: "EXECUTE_MAC_BLOCK",
              mac: targetMac
            }, (res) => {
              sendResponse({ success: true, message: "Dispatched to open router tab." });
            });
          }, 1000);
        });
      } else {
        // Open new router tab
        api.tabs.create({ url: "http://192.168.8.1/html/settings.html#wlanmacfilter", active: true }, (newTab) => {
          setTimeout(() => {
            api.tabs.sendMessage(newTab.id, {
              type: "EXECUTE_MAC_BLOCK",
              mac: targetMac
            }, (res) => {
              sendResponse({ success: true, message: "Opened new router tab and dispatched." });
            });
          }, 2500);
        });
      }
    });

    return true; // Keep message channel open for async response
  }

  if (request.type === "CHECK_EXTENSION_STATUS") {
    sendResponse({ active: true, version: "1.0.0" });
  }
});
