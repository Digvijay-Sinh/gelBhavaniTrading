# GelBhavaniBilling — Build Instructions

This project is an Electron-based simple billing UI. The repository already contains an Electron entry (`main.js`) and HTML/CSS files.

## Windows build (using electron-builder)

Prerequisites (on Windows):
- Node.js (18+ recommended) and npm installed.
- Git (optional).

Steps:

1. Install dependencies:

```powershell
npm install
```

2. Run the app in development:

```powershell
npm start
```

3. Create a distributable Windows build (installer):

```powershell
npm run dist
```

- Output will be placed in the `dist` folder.
- The configuration uses NSIS by default. If you want a portable build or different target, update the `build.win.target` in `package.json`.

Notes & tips:
- Code signing is not configured. Windows Defender or SmartScreen may warn about unsigned apps.
- If you want a custom icon, add `icon.ico` inside a `build` folder and reference it in the `build` config (e.g., `"icon": "build/icon.ico"`).
- If you bump Electron to a newer major version, test the app manually before building.

If you want, I can:
- Add a `build/icon.ico` placeholder or generate cross-platform icons.
- Update Electron to a newer version before building.
- Create a small PowerShell script that runs the build and opens the output folder.
