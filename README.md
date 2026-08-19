# Maru Browser Extensions

Monorepo containing all browser extensions for the Maru ecosystem.

## Extensions

- **`extensions/translate`**: **Messenger Translate** — Real-time English/Japanese translation overlay for Messenger and Facebook Messages.
- **`extensions/movieplay`**: **MoviePlay Extension** — Video streaming helper with player launch integration and stream relay.
- **`extensions/wlman`**: **Wireless Management Extension** — Router management and monitoring companion (DITO / ZTE CPE / Tozed ZLT).

## Building

To build all extensions:
```powershell
.\build-all.ps1
```

Or build an individual extension:
```powershell
cd extensions/translate
.\build.ps1
```

Built `.zip` (Chrome/Edge) and `.xpi` (Firefox) files will be output to `extensions/<name>/dist/`.

## Release Tags

- Messenger Translate: `translate/vX.Y.Z`
- MoviePlay: `movieplay/vX.Y.Z`
- Wireless Management: `wlman/vX.Y.Z`
