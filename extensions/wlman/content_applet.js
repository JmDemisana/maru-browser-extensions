// Content Script running on Maru Applet page
console.log("[WLMan Extension] Bridge initialized on applet page.");

// Notify web app that extension is active
window.postMessage({ type: "WLMAN_EXTENSION_READY", version: "1.0.0" }, "*");

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === "WLMAN_TRIGGER_ROUTER_BLOCK") {
    const mac = event.data.mac;
    console.log("[WLMan Extension Bridge] Forwarding block request to background script for MAC:", mac);

    api.runtime.sendMessage({
      type: "WLMAN_AUTOMATE_BLOCK_MAC",
      mac: mac
    }, (response) => {
      window.postMessage({
        type: "WLMAN_AUTOMATION_RESULT",
        success: response ? response.success : false,
        mac: mac
      }, "*");
    });
  }

  if (event.data && event.data.type === "WLMAN_CHECK_EXTENSION") {
    window.postMessage({ type: "WLMAN_EXTENSION_ACTIVE", active: true }, "*");
  }
});
