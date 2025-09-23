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
 - Added post-week finance summary in Match tab for the manager’s team (gate, sponsor, wages, maintenance, net).

## 2025-09-22 (cont. 3)
- New Career UX: removed formation selection (defaults to 4-4-2) and aligned styling with legacy classes (`card`, `btn-primary`).
- Integrated legacy CSS by importing `css/styles.css` into React entry; updated Tabs to use `.tab` styling.

## 2025-09-22 (cont. 4)
- Squad tab reworked to "My Team": new `features/Squad.jsx` allows formation selection, manual starting XI toggles, auto-pick XI and clear.
- Team generation no longer auto-sets starters; all players start as bench to allow manual selection similar to vanilla.
- Added safe constants fallbacks (names/stats) to ensure reliable seeding.

## 2025-09-22 (cont. 5)
- Updated team generator to produce squads with 3 GK, 7 DF, 7 MF, 4 FW by role distribution.
- My Team tab now groups roster by role and shows a field preview that places the selected XI by section; DnD full assignment can be added next.

## 2025-09-23
- Authored `docs/MARKET_NEGOTIATIONS_PARITY.md`: side-by-side comparison of vanilla vs React negotiation/transfer flows and an integration plan (schema normalization, validations parity, acceptance calculator, competing-offer generator, and Offers UX).
- React parity Phase 1 (done): Adjusted weekly cadence to resolve negotiations before market churn; `resolveNegotiations()` now processes only offers expiring in the current week and expires strictly at deadline.
 - React parity Phase 2 (completed):
	 - Added pending-cost checks to React validations (cash and wages) so affordability includes cumulative pending offers.
	 - Centralized acceptance calculator in React (`MarketContext.jsx`) for FA and transfers to mirror vanilla tolerances and age/length/star adjustments; replaced inline formulas in resolver.
	 - Fixed affordability double-counting during resolution/acceptance by excluding the currently-evaluated offer from pending commitments.

### Finance tuning (weekly balance)
- Increased base sponsors and added dynamic sponsor wage support to reduce chronic negative cash flow when wages are realistic:
	- `INITIAL_SPONSOR_TECH` 70 → 120; `INITIAL_SPONSOR_SHIRT` 12 → 24.
	- New `SPONSOR_WAGE_SUPPORT_RATIO = 1.0` so weekly sponsor ≈ base + 100% of current weekly wages (tunable).
	- Ticket price 60 → 80; initial attendance 5k → 8k; minimum attendance share 20% → 35%.
	- Reduced maintenance burden: facility per-seat 0.2 → 0.12 and maintenance % 0.08 → 0.05.
- Updated `financeEngine` to compute `sponsor = baseWeekly + SPONSOR_WAGE_SUPPORT_RATIO * weeklyWages`.
