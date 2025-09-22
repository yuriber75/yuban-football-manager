# Yuban Football Manager — React migration

This is the React app scaffold for migrating the vanilla JS single-file app.

- Build tool: Vite + React 18
- Dev: `npm run dev` (opens on localhost)
- Build: `npm run build` → outputs to `react-app/dist/`

Notes
- The `GameStateContext` mirrors the original `STATE` shape and persists to `localStorage` using the key `yuban-fm-save`.
- `GAME_CONSTANTS` are ported to `src/constants.js` and kept shape-compatible with the original globals.
- Tabs are placeholders; next steps are porting features module-by-module.
