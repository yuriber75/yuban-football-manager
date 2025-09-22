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

## 2025-09-22 (cont.)
- Implemented New Career flow end-to-end in React: player/team/league generators, form UI, state persistence; minimal Squad and League tab renderers.
- Added minimal match engine (`react-app/src/engine/matchEngine.js`) with Poisson-based scoring, weekly simulation, and league table updates.
- Created Match tab UI (`react-app/src/features/MatchWeek.jsx`) to view current fixtures and simulate the week.
- Enhanced League tab to order the table and show last week results.
- Built production bundle via Vite to validate.

## 2025-09-22 (cont. 2)
- Added weekly finance engine (`react-app/src/engine/financeEngine.js`): attendance trends, gate receipts, sponsors, maintenance, and wages; updates each team’s finances after match week.
- Seeded team finance defaults in generator and hydration: `stadiumCapacity` and `attendance`.
- Wired finance updates to run after weekly simulation in `MatchWeek.jsx`.
- Fixed dev script: added `npm start` alias and updated `react-app/README.md` run instructions.
