// api.js — Cross-browser API shim
// Normalises chrome.* vs browser.* so the extension works in both
// Chrome/Edge (MV3) and Firefox (MV3, 109+).
// Load this script BEFORE any other extension script.
// eslint-disable-next-line no-var
var api = (function () {
  if (typeof browser !== "undefined" && browser.runtime) return browser;
  if (typeof chrome !== "undefined" && chrome.runtime) return chrome;
  throw new Error("No browser extension API found.");
})();
