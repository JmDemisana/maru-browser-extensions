# 🌐 Maru Browser Extensions

> *"You browse the web so much, Senpai... so I made sure you have the best in-browser tools to back you up! Don't forget to thank me!"* — **Nanami 💚**

Welcome to the **Maru Browser Extensions Monorepo**! Here you'll find all the **Manifest V3** web extensions that integrate directly into Chrome, Edge, and Firefox to extend your browsing experience across Messenger, video streaming sites, and router dashboards.

---

## 🧩 Extensions in this Monorepo

### 💬 [`extensions/translate`](./extensions/translate) — *Messenger Translate*
*Real-time Japanese/English overlay for Facebook Messenger & Facebook Messages!*

Browsing Messenger chats with international friends? This extension automatically translates everything seamlessly in-place:
- 🌸 **Live Japanese Preview**: Types a live Japanese translation strip above your input box as you type, and auto-translates on send.
- 🏷️ **Incoming Badges**: Detects incoming non-English messages and appends a clean English translation badge right beneath the bubble.
- ⚙️ **Custom Providers**: Supports MyMemory, OpenAI, and custom translation endpoints.

### 🎬 [`extensions/movieplay`](./extensions/movieplay) — *MoviePlay Companion Extension*
*Seamless video player launcher & stream catcher for streaming websites!*

Enhances web video players by letting you beam streams directly into your favorite desktop player:
- 🚀 **1-Click VLC / MPV Launch**: Opens the currently playing web stream in VLC or MPV with hardware acceleration.
- 🧲 **Magnet & Torrent Integration**: Pairs with the local MoviePlay companion to stream torrent magnet links without waiting for full downloads.

### 📶 [`extensions/wlman`](./extensions/wlman) — *Wireless Management Extension*
*Direct router dashboard & bandwidth monitor right in your browser!*

Puts real-time network diagnostics and router controls directly inside your browser toolbar:
- 📊 **Live Stats**: View signal strength (RSRP/RSRQ/SINR), live upload/download bitrate, and connected devices.
- 🛡️ **Quick Router Actions**: Supports DITO / ZTE CPE / Tozed ZLT routers with 1-click reboot, band locking, and MAC filter management.

---

## 📦 Packaging & Installation

Each extension includes ready-to-run packaging scripts for both **Chrome (`.zip`)** and **Firefox (`.xpi`)**.

```powershell
# Build all extensions at once into their respective dist/ folders:
.\build-all.ps1

# Or package an individual extension:
cd extensions/translate
.\build.ps1
```

---

## 🏷️ Release Tags

Pushing version tags triggers automated GitHub release packaging:
- `translate/vX.Y.Z` → Attaches `.zip` and `.xpi` for Messenger Translate
- `movieplay/vX.Y.Z` → Attaches `.zip` and `.xpi` for MoviePlay
- `wlman/vX.Y.Z` → Attaches `.zip` and `.xpi` for Wireless Management

---

<div align="center">
  <sub>Maintained with love by Maru-Senpai & Nanami 💚</sub>
</div>
