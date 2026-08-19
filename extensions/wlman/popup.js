document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("usernameInput");
  const passwordInput = document.getElementById("passwordInput");
  const saveBtn = document.getElementById("saveCredsBtn");
  const openRouterBtn = document.getElementById("openRouterBtn");

  // Load saved credentials
  api.storage.local.get(["routerUsername", "routerPassword"], (res) => {
    if (res.routerUsername) usernameInput.value = res.routerUsername;
    if (res.routerPassword) passwordInput.value = res.routerPassword;
  });

  saveBtn.addEventListener("click", () => {
    const u = usernameInput.value.trim() || "admin";
    const p = passwordInput.value.trim() || "59aMzAvP";

    api.storage.local.set({ routerUsername: u, routerPassword: p }, () => {
      saveBtn.textContent = "✓ Saved Credentials!";
      setTimeout(() => { saveBtn.textContent = "💾 Save Auto-Login Password"; }, 2000);
    });
  });

  openRouterBtn.addEventListener("click", () => {
    api.tabs.create({ url: "http://192.168.8.1/html/settings.html#wlanmacfilter" });
  });
});
