# Finance Tab Migration Plan (React)

Goal: Mirror the vanilla Finance tab in React while simplifying: show my team’s players grouped by role (GK, DF, MF, FW) with columns Name, Age, OVR, Salary (M/wk), and Value (M). Also remove finance summary from the Match tab and remove list/unlist actions from My Team.

## Scope
- Create Finance tab component in React (`react-app/src/features/Finance.jsx`).
- Group players by role and render table per role.
- Columns: Name, Age, OVR, Salary (M/wk), Value (M).
- Wire tab in `App.jsx`.
- Remove finance breakdown UI from Match tab.
- Remove List/Unlist actions from My Team (Squad tab shows roster, tactics, and stats only).

## Parity notes (vanilla → React)
- Vanilla has richer weekly finance dashboards and market controls inside Finance; React migration keeps it lean: player finance overview only.
- Data sources remain `state.teams[]`, `team.finances`, and player fields `age`, `overall`, `wage`, `value`.

## Implementation steps
1. Add `Finance.jsx` with grouped-role tables and currency formatting via `formatMillions`.
2. Wire new tab in `App.jsx`.
3. Remove finance summary UX from `MatchWeek.jsx`.
4. Remove List/Unlist column from `Squad.jsx`.
5. Verify no compile errors; quick UI smoke test.

## Future enhancements
- Add weekly income/expense summary and trend charts.
- Show contract years and renegotiation controls.
- Add filtering/sorting and export.
