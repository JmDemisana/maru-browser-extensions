// Content Script running inside 192.168.8.1 Router Web Interface
console.log("[WLMan Extension] Router page listener active.");

function showRouterToast(message, type = "success") {
  const existing = document.getElementById("wlman-extension-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "wlman-extension-toast";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999999;
    padding: 14px 20px;
    background: #0f172a;
    color: #f8fafc;
    border: 2px solid ${type === "success" ? "#10b981" : type === "info" ? "#38bdf8" : "#ef4444"};
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.3s ease;
  `;
  toast.innerHTML = `<span>${type === "success" ? "⚡" : type === "info" ? "🔑" : "❌"}</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4500);
}

function attemptAutoLogin(macToBlockAfterLogin) {
  const usernameInput = document.querySelector("#username, input[name='username']");
  const passwordInput = document.querySelector("#password, input[name='password']");
  const loginButton = document.querySelector("#login, input[value='Login'], .login-btn");

  if (usernameInput && passwordInput && loginButton) {
    console.log("[WLMan Extension] Router login page detected. Executing auto-login...");
    showRouterToast("Logging into router admin...", "info");

    api.storage.local.get(["routerUsername", "routerPassword"], (res) => {
      const u = res.routerUsername || "admin";
      const p = res.routerPassword || "59aMzAvP";

      usernameInput.focus();
      usernameInput.value = u;
      usernameInput.dispatchEvent(new Event("input", { bubbles: true }));

      passwordInput.focus();
      passwordInput.value = p;
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));

      setTimeout(() => {
        loginButton.click();
        showRouterToast("✓ Router Admin Login Submitted!", "success");

        // Wait for page to navigate to settings and then block MAC
        if (macToBlockAfterLogin) {
          let checkCount = 0;
          const pollTimer = setInterval(() => {
            checkCount += 1;
            if (window.location.hash.includes("wlanmacfilter") || document.querySelector("#add")) {
              clearInterval(pollTimer);
              setTimeout(() => automateMacBlockInRouter(macToBlockAfterLogin), 500);
            } else if (checkCount > 10) {
              clearInterval(pollTimer);
              window.location.href = "http://192.168.8.1/html/settings.html#wlanmacfilter";
            }
          }, 600);
        }
      }, 300);
    });

    return true;
  }
  return false;
}

function automateMacBlockInRouter(macAddress) {
  // Check if on login page first
  if (attemptAutoLogin(macAddress)) {
    return;
  }

  showRouterToast(`Automating MAC block for ${macAddress}...`, "info");

  // Step 1: Ensure Blacklist status is selected
  const statusSelect = document.querySelector("#macfiltermode");
  if (statusSelect && statusSelect.value !== "deny") {
    statusSelect.value = "deny";
    statusSelect.dispatchEvent(new Event("change"));
  }

  // Step 2: Click Add button
  const addButton = document.querySelector("#add, input[value='Add'], .add-btn");
  if (!addButton) {
    // If not on wlanmacfilter page, navigate there
    if (!window.location.hash.includes("wlanmacfilter")) {
      window.location.href = "http://192.168.8.1/html/settings.html#wlanmacfilter";
      setTimeout(() => automateMacBlockInRouter(macAddress), 1200);
      return;
    }
    showRouterToast("Could not find Add button on router page.", "error");
    return;
  }

  addButton.click();

  // Step 3: Wait for edit input row to render, fill MAC, click OK & Apply
  setTimeout(() => {
    const inputField = document.querySelector("#wifimacfilterform input[type='text'], #listbody input[type='text']");
    if (!inputField) {
      showRouterToast("Input box did not open. Please try again.", "error");
      return;
    }

    inputField.focus();
    inputField.value = macAddress;
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    inputField.dispatchEvent(new Event("change", { bubbles: true }));

    // Step 4: Click OK / Modify button
    setTimeout(() => {
      const okButtons = Array.from(document.querySelectorAll(".option-btn, span, button")).filter(
        el => el.textContent.trim().toUpperCase() === "OK" || el.id.startsWith("modify")
      );

      if (okButtons.length > 0) {
        okButtons[0].click();
      }

      // Step 5: Click Apply button
      setTimeout(() => {
        const applyBtn = document.querySelector("#apply, input[value='Apply']") ||
                         Array.from(document.querySelectorAll("input[type='button'], button")).find(el => el.value === "Apply" || el.textContent.trim() === "Apply");

        if (applyBtn) {
          applyBtn.click();
          showRouterToast(`✓ Successfully blocked ${macAddress} on router!`, "success");
        } else {
          showRouterToast(`✓ Added ${macAddress}. Click Apply on screen!`, "success");
        }
      }, 400);

    }, 300);

  }, 400);
}

// Auto-run login if landed on login page directly
if (window.location.pathname.includes("login")) {
  setTimeout(() => attemptAutoLogin(), 500);
}

// Listen for messages from background service worker
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXECUTE_MAC_BLOCK") {
    const mac = request.mac;
    console.log("[WLMan Extension Router Script] Executing MAC block automation for:", mac);
    automateMacBlockInRouter(mac);
    sendResponse({ success: true });
  }
});
