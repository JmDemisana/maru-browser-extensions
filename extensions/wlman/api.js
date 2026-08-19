// api.js — Cross-browser API shim
var api = (function () {
  if (typeof browser !== "undefined" && browser.runtime) return browser;
  if (typeof chrome !== "undefined" && api.runtime) return chrome;
  throw new Error("No browser extension API found.");
})();
