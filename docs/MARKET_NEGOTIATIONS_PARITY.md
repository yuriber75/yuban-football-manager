# Market Negotiations & Transfers: Vanilla vs React

This document compares the vanilla JavaScript market system (`js/market/*`) with the React implementation (`react-app/src/market/MarketContext.jsx` and `react-app/src/features/Market.jsx`), and proposes an integration plan to make the React behavior mirror vanilla.

Important constraint
- Do not modify the vanilla code. All alignment work happens in the React app. Where differences exist, React will adapt to match vanilla outcomes without requiring any change to `js/market/*`.

## Scope and Modules

- Vanilla modules
  - `js/market/marketUI.js`: orchestrator, weekly hooks, aggregates other modules into `window.marketUI`.
  - `js/market/marketUtils.js`: lookups, budget checks, competing offers generation, notifications/modals.
  - `js/market/marketValidation.js`: validates offers (budgets, pending costs, squad/per-role constraints).
  - `js/market/marketListings.js`: list/unlist players, auto-listing, initial offers for listed players.
  - `js/market/marketAgents.js`: free agent flows (generate, process offers, sign contracts).
  - `js/market/marketNegotiations.js`: create/resolve offers, acceptance chance, weekly resolution.
  - `js/market/marketTransfers.js`: execute transfers, update teams/finances, clean pending offers, UI updates.

- React modules
  - `react-app/src/market/MarketContext.jsx`: single context providing market state, validations, offer lifecycle, weekly process, and resolution.
  - `react-app/src/features/Market.jsx`: UI for Free Agents, Transfer List, My Listed, and Offers (incoming/outgoing) with Confirm dialogs and inline reasons.

## Data Model: Offers and Negotiations

- Vanilla `STATE.negotiations`
  - Initialized with `{ pendingOffers: [], rejectedPlayers: Set, attemptsCount: {} }`.
  - Offers for free agents and transfers are pushed into `pendingOffers` without an explicit `id` or `status` field; deadlines use `offer.deadline` set to `STATE.league.week + 1`.
  - Competing offers generated via `marketUtils.generateCompetingOffers(player)`.

- React `state.negotiations`
  - Lazily ensured via `ensureNegotiations(state)`; shape mirrors vanilla but offers include:
    - `id` (UUID), `status: 'pending'|'accepted'|'rejected'|'expired'`, `deadlineWeek`, and for incoming offers: `incoming: true`, `requiresDecision: true`.
    - Transfer offers: `{ id, playerId, seller, buyer, type: 'transfer', amount, wage, contractLength, team: buyerName, deadlineWeek, status }`.
    - Free agent offers: `{ id, playerId, buyer, type: 'free', wage, contractLength, team: buyerName, deadlineWeek, status }`.

Key differences
- Field names: vanilla uses `deadline`; React uses `deadlineWeek`.
- Identity and status: React uses `id` and `status`; vanilla removes processed offers instead of marking status.
- Incoming user decisions: React marks AI offers to the user with `{ incoming: true, requiresDecision: true }` and holds resolution; vanilla uses external handlers (`marketOffers.js`/`marketTransfers.acceptOffer`) and UI prompts.

## Offer Lifecycle: Creation → Competition → Weekly Resolution → Transfer

1) Creation
- Vanilla
  - Transfers: `marketNegotiations.processOffer(player, 'transfer', amount, wage, length)` validates via `marketValidation.validateOffer`, pushes offer to `pendingOffers`, then appends `marketUtils.generateCompetingOffers(player)` results.
  - Free agents: `marketAgents.processFreeAgentOffer(player, wage, length)` pushes a FA offer to `pendingOffers`.

- React
  - Transfers: `submitOfferForListed(playerId, sellerName, amount, wage, length)` builds offer with `id` and `deadlineWeek`, calls `generateCompetingOffers(playerId, sellerName)` to add 1–2 rival offers.
  - Free agents: `submitOfferForFreeAgent(playerId, wage, length)` queues a pending FA offer with a deadline.

2) Competing Offers
- Vanilla: in `marketUtils.generateCompetingOffers(player)`; number and pricing are randomized; appended to `STATE.negotiations.pendingOffers`.
- React: in-context `generateCompetingOffers(playerId, sellerName)` synthesizes rival bids and appends them to `pendingOffers`.

3) Weekly Resolution
- Vanilla: `marketUI` listens to `gameWeekEnd` → `marketNegotiations.resolveNegotiations()`:
  - Filters current-week offers by `offer.deadline === currentWeek`.
  - Groups per player and keeps only the best offer (`filterBestOffers`).
  - Computes `chance = calculateAcceptanceChance(player, offer)` and resolves acceptance via RNG.
  - Applies results (accept/reject), updates attempts counts, and later `finalizeNegotiationsProcess` prunes processed offers (by `deadline > week`).

- React: `resolveNegotiations()` in context:
  - Skips `incoming && requiresDecision` offers (waits for the user’s decision).
  - Groups by `playerId` among `status === 'pending'`.
  - For free agents: compares `wage` to preferred range; for transfers: compares `amount` to valuation and `wage` to preferred wage; derives acceptance probability, then accepts best offer.
  - On acceptance: moves player, updates both teams’ finances and rosters, removes seller listing, updates `pendingOffers` statuses for all offers on that player (`accepted` vs `rejected`).
  - Decrements deadlines and marks `expired` when `deadlineWeek <= week`.

4) Executing Transfers
- Vanilla: `marketTransfers.executeTransfer(...)` handles:
  - Budget adjustments, player move, jersey renumbering if needed, removal of related pending offers, and UI refresh (`marketUI.updateMarketView`, `marketDisplay.updateTransferList`, `financeUI.updateFinanceView`).
  - Also includes `acceptOffer` for incoming offers (external and inter-team), and `finalizeNegotiationsProcess` to prune offers.

- React:
  - For incoming offers to the user: `acceptIncomingOffer(offerId)` checks `canBuy` for buyer affordability (including wage headroom logic), moves player, updates budgets, removes listing, and updates offer statuses.
  - Weekly auto-resolution uses the same move/budget/listing cleanup paths.

## Acceptance Logic and Valuation

- Vanilla: implemented in `marketNegotiations.calculateAcceptanceChance(player, offer)` and calibrated by tolerances/constants in `GAME_CONSTANTS.FINANCE` (`WAGE_NEGOTIATION_TOLERANCE`, `VALUE_NEGOTIATION_TOLERANCE`, min/max acceptance caps). Also considers attempts count and rejection memory via `rejectedPlayers` and `attemptsCount`.

- React: acceptance in `resolveNegotiations()` with probability built from fee and wage relative to preferred ranges, age/contract fit, and star bias. Example for free agents (wage-relative):

$$
\text{pAccept} = \operatorname{clip}_{[0.04,0.96]}\Big(0.48 + (\text{rel} - (\text{PREFERRED})) \times 0.85 + \text{agePref} + \text{starBias}\Big)
$$

Where `rel = offered / expected` and `PREFERRED = GAME_CONSTANTS.FINANCE.NEGOTIATION_RANGES.WAGES.PREFERRED`.

Valuation
- Vanilla: fee expectations derived from player value model in generators/constants; tolerances via `VALUE_NEGOTIATION_TOLERANCE`.
- React: value model in generation bucketizes OVR to price bands with age multipliers; acceptance considers feeRel and wageRel against preferred ranges.

## Validations and Constraints

- Vanilla: `marketValidation.validateOffer(...)` performs comprehensive checks:
  - Transfer budget negative check; total of pending offers’ costs; cumulative wages with pending offers; squad min/max and per-role limits; wage budget warnings; reasons surfaced via notifications.

- React: `canBuy`, `canAffordWage`, `wouldExceedMaxOnBuy`, `willViolateMinOnSell`, and `canListWithReason` enforce:
  - Cash and wage headroom checks, squad size min/max and per-role caps; inline hints and disabled reasons in UI.
  - Note: accumulated cost of pending offers is partially modeled; further alignment with vanilla pending-cost computations is recommended.

## Incoming Offers to the User

- Vanilla: generated via listings logic and probabilistic external offers; accepted through `marketTransfers.acceptOffer` path, with `isExternal` handling.
- React: `processWeeklyMarket()` may create offers from AI teams for the user’s listed players with `{ incoming: true, requiresDecision: true }`; the Offers tab lets the user Accept/Reject with a confirmation modal.

## UI Differences

- Vanilla: DOM-based tables; offer inputs via modal (`<template id="contractNegotiationTemplate">` and `transferConfirmationTemplate`), showNotification, and text reasons.
- React: inline per-row inputs for fee/wage/length; formatted currency helpers; styled `ConfirmDialog`; inline disabled reasons/hints; Offers tab shows both outgoing and incoming with Accept/Reject actions.

## Parity Gaps and Decisions (React-only changes)

1) Object schema normalization (React side only)
- Keep React’s richer offer shape (`id`, `status`, `deadlineWeek`). When reading or displaying parity comparisons, adapt React’s logic so acceptance/expiry timing matches vanilla’s `deadline` semantics. No changes to vanilla structures.

2) Pending cost modeling
- Enhance React validations to mirror `marketValidation.validateOffer` behavior: consider cumulative pending transfers (cash and future wages). Keep this logic internal to React; do not modify vanilla validators.

3) Acceptance calculator parity (React only)
- Implement a React-side acceptance function that produces the same decisions as vanilla (using the same constants and comparable formulas). Do not extract or refactor vanilla; treat vanilla as the reference model.

4) Competing offers generator (React only)
- Tune React’s rival generation to match vanilla distributions and ranges (counts, price bands, and randomness). Vanilla remains unchanged.

5) Weekly tick orchestration (React)
- Ensure React resolves negotiations at the same cadence/order as vanilla’s `gameWeekEnd`: resolve negotiations for current deadlines, then run market churn (e.g., free agents top-up, generate new incoming offers). No vanilla edits.

6) Incoming offer UX (React)
- Keep React’s Offers tab and confirmation modals. Ensure that when the user delays a decision, the eventual accept/reject results and timing match what vanilla would have produced by prompts. Do not change vanilla prompts.

## Incremental Integration Plan (React-only execution)

Phase 1 — Resolution cadence and deadlines
- In React, ensure `resolveNegotiations()` processes offers whose `deadlineWeek === league.week` (to mirror vanilla’s `deadline === currentWeek`), then mark non-accepted as rejected/expired accordingly. Keep a pruning pass after marking to keep UI clean.
- Ensure `processWeeklyMarket()` runs after resolution (same order as vanilla: resolve → list/seed/incoming).

Phase 2 — Validations parity (React)
- Port the pending-cost checks from vanilla semantics into React’s `canBuy`/`canAffordWage` without touching vanilla. Inline reasons should mirror vanilla messages semantically.

Phase 3 — Acceptance calculator (React)
- Implement `acceptance.calculate(...)` inside React that reproduces vanilla acceptance probabilities using `GAME_CONSTANTS.FINANCE` tolerances. Use it in `resolveNegotiations()` and incoming-offer acceptance flows in React only.

Phase 4 — Competing offers (React)
- Align React’s rival generation with vanilla’s ranges and likelihoods (offer count 1–2, ±10–20% banding, etc.) so competition pressure feels the same.

Phase 5 — UI parity (React)
- Ensure the Offers tab surfaces outcomes and expiry identical to vanilla timing. Add inline reasons mirroring vanilla’s validation feedback. No vanilla UI changes.

Phase 6 — Cleanup and docs
- Keep vanilla untouched. Remove or comment React-only duplication where possible within React. Update docs and migration log once parity is verified.

## QA Checklist (manual)

- Free agents
  - Submit one FA offer below preferred wage → expect rejection likely; above preferred → higher acceptance.
  - Multiple teams bid for the same FA → only best accepted; others rejected/expired.
- Transfers
  - List a player and receive AI incoming offers; Accept/Reject works and updates budgets and rosters; all rival offers get rejected.
  - Attempt to buy when cash or wage budget is insufficient → blocked with clear reason.
  - Selling below min squad or per-role min → blocked with clear reason.
- Deadlines and expiry
  - Offers expire on the next week if not resolved; statuses change to `expired`.
  - Weekly resolution accepts only best offer per player.

## Open Questions / Notes

- Save key: vanilla references `GAME_CONSTANTS.STORAGE.SAVE_KEY` (not defined by default). If relying on cross-session saves, define `STORAGE: { SAVE_KEY: 'yuban-fm-save' }` in both constants to avoid key drift.
- Jersey number reassignment is handled in vanilla on transfer; React currently does not renumber — acceptable or to be added?
- Some vanilla modules contain duplicate or legacy functions; prefer React’s consolidated context as the long-term integration target.

## Summary

The React context centralizes market behavior with richer offer state and UI affordances. To reach full parity, normalize the offer schema, align validations and acceptance logic, and consolidate competing-offer generation. Then, ensure weekly orchestration is identical and expose a consistent Offers UX in both environments.
