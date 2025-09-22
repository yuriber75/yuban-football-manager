# React Migration Log

This document records the incremental steps migrating the vanilla JS app to React. It references `.github/copilot-instructions.md` for architectural parity.

## 2025-09-22
- Baseline commit of vanilla JS app and created branch `react-migration`.
- Scaffolding: Initialized Vite React app in `react-app/` with `react` and `react-dom`.
- Added `.gitignore` to exclude `react-app/node_modules/` and build artifacts.

Next steps:
- Port `js/constants.js` to `react-app/src/constants.js` and define `GAME_CONSTANTS.STORAGE.SAVE_KEY`.
- Implement React global state context with `saveState`/`loadState` compatible with current `STATE` shape.
- Create UI shell with tabs and route placeholders.
