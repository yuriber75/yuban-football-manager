# Copilot Instructions for this Codebase

Purpose: Help AI coding agents be productive immediately in this browser-only Football Manager game.

## Architecture at a glance
- Single-page web app, no build tools. Open `fantacalcio.html` in a browser to run.
- Strict load order (see bottom of `fantacalcio.html`):
  1) `js/constants.js` → global `GAME_CONSTANTS`
  2) Generators: `js/generator/{playerGenerator,teamGenerator,leagueGenerator}.js`
  3) State/util: `js/state.js` (global `STATE`, `saveState()`, `loadState()`), `js/utils.js` (global `utils` + aliases)
  4) Engine: `js/engine.js` (global `engine`, `createMatch()`)
  5) Core UI: `js/ui/commonUI.js`
  6) Feature UI: `js/ui/{financeUI,squadUI,leagueUI}.js`
  7) Market system modules: `js/market/*` merged into `window.marketUI`
  8) Game logic: `js/league.js`, `js/tactics.js`
  9) Orchestrators: `js/ui/ui.js`, `js/ui/matchPreview.js`
  10) Entry point: `js/main.js` (boot, modal, new/load career)
- Modules are plain scripts that attach to `window` (no bundler/ES modules). Cross-module APIs are globals.

## Data model and persistence
- Global `window.STATE` (see `js/state.js`) holds: manager/team names, `teams[]`, `league{week,fixtures,table,results}`, `career{cash,wageBudget,...}`, `freeAgents[]`, `negotiations{pendingOffers[],rejectedPlayers:Set,attemptsCount}`.
- `saveState()` serializes `STATE` to `localStorage` (converts `Set` to array) and `loadState()` hydrates back (rebuilds `Set`, ensures team finances/tactics exist). Save key is defined inline in calls via `GAME_CONSTANTS.STORAGE.SAVE_KEY` but no STORAGE block exists; current code removes/reads with that key. If adding STORAGE, keep the shape `{ SAVE_KEY: 'yuban-fm-save' }`.
- Team access helpers: `getMyTeam()`, `findTeamByName(name)`.

## Core flows
- New league: `leagueGenerator.setupNewLeague(n, managerName, myTeamName)` creates teams via `teamGenerator.makeTeam()`, fixtures, and league table, seeds `STATE.freeAgents` using `marketAgents.generateFreeAgents()`; then `financeUI.init()` and market initialization happen in `main.js`.
- UI boot: `window.UI.init()` guards dependencies/state, sets up tabs and event listeners, then calls `renderAll()`. The `main.js` initializer also calls module `.init()` methods in a specific order (market modules before squad/league/match UI).
- Match: open Match Preview via `matchPreview.show()`, then `matchPreview.executeMatch()` simulates current gameweek, updates `STATE.league.results/table`, dispatches `matchEnd` and `gameWeekEnd`, triggers finances and market resolutions, advances `STATE.league.week`.

## Market system (js/market/*)
- Composed into `window.marketUI` (see `marketUI.js`: `Object.assign` with `marketUtils`, `marketTransfers`, `marketAgents`, `marketListings`, `marketDisplay`). Call `marketUI.init()` once after league and finances.
- Key responsibilities:
  - `marketUtils.js`: find players/teams, budget checks `canMakeOffer/canSignPlayer/canCompleteTransfer`, UI notifications/modals helpers; also generates competing offers.
  - `marketValidation.js`: validates offers and list-for-sale constraints including pending offers and per-role limits.
  - `marketListings.js`: list/remove players for sale, auto-list AI players, seed international `STATE.transferMarket` via `generateTransferListedPlayers()`.
  - `marketAgents.js`: free agent flows (`generateFreeAgents`, `processFreeAgentOffer`, `signFreeAgentContract`).
  - `marketOffers.js`: probabilistic external/team offers for AI logic.
  - `marketTransfers.js`: finalize accepts/transfers, move players, update budgets, histories, and views.
  - `marketModals.js`/`marketDisplay.js`: modals and DOM rendering for market tables/dialogs.

## UI conventions
- All main UI controllers expose `init()` and `render*` methods on `window.*UI`.
- Tabs are switched via `UI.showTab(tabId)` using ids: `squadTab`, `otherTab`, `financeTab`, `marketTab`, `leagueTab`, `matchTab`; associated content containers end with `Content` (e.g., `squadContent`).
- Squad selection uses `GAME_CONSTANTS.POSITION_ROLES[formation]` and marks starters with `player.starting=true`, `player.section='GK|DF|MF|FW'`, `player.positionIndex=index`. See `squadUI.updateStartingXI()`/`isFormationValid()`.

## Constants and calculations
- `GAME_CONSTANTS` carries formations, role names, UI table headers, and a large `FINANCE` section controlling budgets, wages, sponsor, stadium, per-role maxima/minima, negotiation ranges, etc. Player generation uses `PLAYER_STATS` in constants (ensure it exists before modifying related code).

## Events and side effects
- Custom events used: `matchEnd`, `gameWeekEnd`, `marketUpdate`, `saveLoaded` (listeners mainly in `financeUI` and `marketUI`). When implementing features that affect finances or market lists, dispatch appropriate events.
- Several modules log to console heavily for debugging; maintain this style for traceability.

## Development workflow
- Run: open `fantacalcio.html` via Live Server or file://. There is no `npm`/build step.
- Debug: use browser console. State helpers: `debugState()`, `window.gameUtils.getGameState()`, `window.debugUI.showModal()`.
- Reset: `window.gameUtils.resetGame()` clears save and reloads.

## Patterns to follow when adding code
- Attach new APIs to `window.<module>` and export helpers via `Object.assign(window, { ...binds })` to mirror existing modules.
- Preserve script load order prerequisites; if you create a new module that others depend on, include it in `fantacalcio.html` before dependents.
- Update both roster and field when changing formations: call `squadUI.updateStartingXI(team)` and `squadUI.renderRoster(team)`, then `saveState()`.
- When mutating `STATE.negotiations.rejectedPlayers`, remember to convert Set↔Array in save/load paths (see `state.js`).

## Gotchas
- `GAME_CONSTANTS.STORAGE.SAVE_KEY` is referenced but not defined in `constants.js`. Define it if you rely on save/load across sessions (suggest `SAVE_KEY: 'yuban-fm-save'`).
- Some files have stray duplicated function names (e.g., `finalizeNegotiationsProcess` in `marketTransfers`) and minor typos in logs; avoid creating new duplicates—reuse existing single points of truth in `marketNegotiations` for weekly resolution.
- Market modals/templates rely on `<template id="contractNegotiationTemplate">` and `<template id="transferConfirmationTemplate">` in the HTML; keep selectors stable if editing templates.
