# Real-Time Match Simulation Plan (Updated)

_Last updated: 2025-09-25_

This document specifies the architecture and phased implementation roadmap for the new real-time(ish) match simulation engine, updated with: age & fatigue injury scaling, substitution limits (5 subs / 3 windows), UI requirements (fatigue highlighting, in-match actions panel), and context-sensitive cluster model (zone+lane influence).

---
## 1. Core Goals
- Event-based simulation replacing aggregate Poisson.
- Zone+Lane context model (DEF/MID/ATT/BOX × LEFT/CENTER/RIGHT) for local advantage.
- Shot volume suppression when large strength gap.
- Age-aware stamina decay & recovery.
- Fatigue-dependent injury probability.
- Penalties & direct/indirect free kicks.
- Cluster-based support vs pressure calculation (quality over raw count).
- Tactical & substitution interface (5 subs, max 3 stoppage windows excluding HT).
- UI feedback: highlight tired players (stamina <70) and critical fatigue (<55 stronger highlight).
- Modular extensibility (animation, advanced traits later).

---
## 2. Data Model (Delta Summary)
```ts
matchState = {
  clock: { virtualSec, half, phase, addedTime: {1,2}, stoppageWindowsUsed: { HOME:0, AWAY:0 } },
  substitutionRules: { maxSubs:5, maxWindows:3, halfTimeDoesNotConsume:true },
  teams: {
    HOME: {
      starters: PlayerLive[], bench: PlayerLive[], subsUsed:0, windowsUsed:0,
      pendingSubsQueue: [],
      fatigueAlerts: { criticalIds:[], warningIds:[] }
    },
    AWAY: { ... }
  },
  ballState: { zone, lane },
  events: Event[],
  clustersCache: { [zone_lane_key]: { supportRatingHome, supportRatingAway, ts } },
  ui: { selectedPlayerId:null, activePanel:'timeline'|'tactics'|'subs' },
}

PlayerLive = {
  id, baseOverall, currentOverall, stamina, age, ageDecayMult, ageRecoveryFactor,
  morale, lane, verticalBand, roles, yellowCardsThisMatch, seasonYellowCount,
  suspendedNext, injury?, rating, stats:{ ... }, fatigueFlag:'OK'|'WARN'|'CRIT'
}
```

### Fatigue Flags
| Condition | Flag  | UI Indicator |
|-----------|-------|--------------|
| stamina >= 70 | OK   | normal      |
| 55 <= stamina < 70 | WARN | amber border |
| stamina < 55 | CRIT | red pulsating border |

---
## 3. Cluster Influence Model (Recap)
- Zone: DEF/MID/ATT/BOX
- Lane: LEFT/CENTER/RIGHT
- Weights:
  - sameZoneSameLane: 1.00
  - sameZoneAdjacentLane: 0.55
  - adjacentZoneSameLane: 0.65
  - adjacentZoneAdjacentLane: 0.30
- Rating formula: power mean (p=1.3) * diminishing count factor (1 + k*log(1+n)/log(1+nRef)) where k=0.35, nRef=5.
- localAdvantage = supportRating - pressureRating drives pass, advance, dribble, shot intent & quality.

---
## 4. Stamina & Age
Decay per virtual minute:
```
baseDecay = 0.55
roleLoad (fullbacks 1.08, box-to-box MC 1.05, winger 1.07, ST 1.00, DC 0.92, GK 0.70)
pressingFactor = 1 + pressingIntensity*0.35
tempoFactor = 1 + (tempo - 0.5)*0.10
ageDecayMult: <=24:0.92, 25–28:1.00, 29–31:1.06, 32–34:1.12, 35+:1.20
fitnessStaffMultiplier = staminaDecayMult (default 1)
finalDecay = baseDecay * roleLoad * pressingFactor * tempoFactor * ageDecayMult * fitnessStaffMultiplier
```
Halftime recovery:
```
recovery = 8 * conditioning.staminaRecoveryMult * ageRecoveryFactor
(ageRecoveryFactor: <=24:1.10, 25–28:1.0, 29–31:0.92, 32–34:0.85, 35+:0.78)
```

---
## 5. Fatigue → Injury Risk
Base injury contexts:
- Foul impact risk: base 0.03 (scaled by severity).
- Non-contact periodic check every 300 virtual sec for players with stamina < 60.

Fatigue multiplier:
```
if stamina >= 70: mult = 1.0
60–69: mult = 1.15
50–59: mult = 1.35
40–49: mult = 1.60
<40:  mult = 1.95
```
Add age stress factor: age >=32 add +0.10 to multiplier; >=35 add +0.20.
Final injury probability = baseContextProb * fatigueMult * (1 - medicalDeptMitigation) * (1 - conditioningRecoveryMitigation)

Severity distribution (pre-mitigation):
- Light (0 weeks): 50%
- Minor (1–2 w): 25%
- Moderate (3–6 w): 17%
- Severe (8–20 w): 8%
Medical Dept shifts one step toward lighter outcome with probability (level * 0.25).

---
## 6. Substitution Rules (5 in 3 Windows)
- Track windowsUsed per team. Each discrete stoppage where ≥1 subs made consumes 1 window (unless half-time).
- Forced injury substitution does consume a window (configurable toggle: could exempt—initially consume to simplify).
- Data additions:
```
team.windowsUsed
team.subsUsed
team.lastSubWindowHalf (to avoid double counting within same stoppage)
```
- Queue structure: pendingSubsQueue executed next natural stoppage event (TURNOVER, GOAL, INJURY, CARD, KICKOFF, HALF_TIME, PENALTY_AWARDED before kick).

Window consumption logic:
```
if (currentPhase != 'HALF_TIME' && subsExecutedThisStoppage > 0) windowsUsed++
```
Prevent substitution if:
- subsUsed >= 5
- windowsUsed >= 3 and currentPhase not HALF_TIME

Priority auto suggestions (UI): list top 2 CRIT + top 1 WARN with lowest stamina & high role load.

---
## 7. UI Additions
### 7.1 Live Match Sidebar
Panels: Timeline | Tactics | Subs
- Timeline: scrolling event log (icons: ⚽ goal, 🟨 yellow, 🟥 red, ✚ injury, ⛳ corner, ● shot, ⚖ penalty, 🅿 free kick, 🔄 subs)
- Tactics: sliders (Pressing, Verticality, Tempo, Width), formation dropdown (if change allowed), confirm button (queue TACTIC_CHANGE event at next stoppage).
- Subs: roster table: columns (Name, Role, Stamina bar, Rating, Action)
  - Stamina bar color-coded (green≥70, amber 55–69, red <55)
  - Border highlight (CSS class .fatigue-warn / .fatigue-crit) around player badge on pitch & list.
  - Clicking a tired player opens bench picker filtered by compatible roles.
  - Show remaining: “Subs 2/5 used – Windows 1/3”.
  - Pending subs list (playerOut → playerIn) with cancel button before stoppage triggers.

### 7.2 Pitch Overlay Enhancements
- Outline pulse for CRIT players every 1.5s.
- Optional small injury icon if injury risk flagged (not yet injured; future extension).

### 7.3 Penalty / Free Kick Prompt
- Modal (blocking) or side card: displays taker auto-selected (best shot). Provide override selector (for manual choice) before resolution timer (e.g., 2 real seconds) → fallback to auto if no interaction.

---
## 8. Event Types (Additions / Updates)
- FATIGUE_ALERT (system-only, not necessarily shown) when a player crosses threshold → triggers UI highlight update.
- SUB_WINDOW_START (internal) to group multiple subs at one stoppage.
- PENALTY_AWARDED, PENALTY_TAKEN, PENALTY_SCORED, PENALTY_SAVED, PENALTY_MISSED
- FREE_KICK_DIRECT, FREE_KICK_GOAL, FREE_KICK_SAVED, FREE_KICK_WIDE, FREE_KICK_INDIRECT_SEQUENCE

---
## 9. Formulas (Key Revisions from Previous Draft)
Shot Suppression: unchanged logistic share but integrate clusterAdv global average difference for half-time recalibration.
Injury: now scaled by fatigueMult & ageDecay.
Substitution suggestion ranking score:
```
score = (100 - stamina)*0.7 + roleLoad*15 + (ageDecayMult -1)*25 - recentImpactBonus
recentImpactBonus (goal/assist/clearance in last 180 virtual sec): 12 points
```

---
## 10. Implementation Phases (Detailed Task List)
### Phase 1 – Structural Setup
1. Add lane/zone assignment helper (derive from existing formation X,Y coordinates).  
2. Extend player live object with age multipliers (ageDecayMult, ageRecoveryFactor).  
3. Implement effectiveOverall recalculation with stamina & morale hooks (no simulation yet).  
4. Staff normalization mapping (goalkeeping.saveBoost, fitness.staminaDecayMult, conditioning.staminaRecoveryMult, tactical.decisionQualityBoost, psychology.cardRiskReduction & moraleStability).  

### Phase 2 – Cluster Engine
5. Build cluster precomputation (static membership lists).  
6. Implement cluster rating function (power mean + diminishing count).  
7. Integrate localAdvantage into pass/advance/dribble formulas (replace old).  

### Phase 3 – Time & Possession Loop Baseline
8. Possession scheduling (action delays) using new pass & advance probabilities.  
9. Shot intent & xG with cluster-based localAdvantage.  
10. Score-only output parity check vs old engine (sanity run).  

### Phase 4 – Stamina & Age Dynamics
11. Implement decay tick & halftime recovery; update fatigue flags & emit FATIGUE_ALERT events.  
12. UI highlight: add CSS classes + state mapping.  

### Phase 5 – Fouls, Cards, Penalties
13. Foul generation with cluster mismatch & fatigue influence.  
14. Yellow/red logic (3-yellows season suspension, second yellow upgrade).  
15. Penalty detection + taker selection + penalty event sequence + commentary hooks.  

### Phase 6 – Free Kicks
16. Dangerous area detection.  
17. Direct vs indirect logic & outcomes.  
18. Rating adjustments for FK/penalty events.  

### Phase 7 – Injuries
19. Contextual injury probability (foul vs non-contact) with fatigue & age scaling.  
20. Severity roll + medical mitigation + persistence to season state.  
21. UI injury marker + forced substitution queue.  

### Phase 8 – Substitutions (5 in 3 Windows)
22. Window tracking & consumption logic.  
23. Pending substitution queue & stoppage execution.  
24. Auto suggestion engine (scoring function).  
25. UI Subs panel (select out → in, display remaining subs & windows).  

### Phase 9 – Tactics UI
26. Implement tactic change panel & event scheduling.  
27. Recalculate cluster weights if formation changes mid-match.  

### Phase 10 – Commentary & Timeline Enrichment
28. Templates for new events (penalties, FK, injury, fatigue warnings).  
29. Highlight filtering (key events mode).  
30. LocalAdvantage descriptors (“Overrun on the left flank”).  

### Phase 11 – Balancing & Metrics
31. Batch simulate 500 matches headless: collect averages (goals, pens, FK goals, injuries).  
32. Adjust constants (baseBoxFoul, cluster weights, decay rates) to target metrics.  
33. Finalize thresholds & document tuning values.  

### Phase 12 – Polishing
34. Add substitution cancellation pre-stoppage.  
35. Edge-case handling: red card + injury same stoppage.  
36. Robust save/load with new fields & migration tags.  

### Phase 13 – Optional Enhancements (Post-MVP)
37. Animation pass (ball tweening).  
38. Morale micro-swings & psychology staff effects.  
39. Advanced lateral switches & cross events.  
40. Tactical presets (Defensive / Balanced / High Press).  

---
## 11. Acceptance Metrics
| Metric | Target |
|--------|--------|
| Avg goals per match | 2.4–3.0 |
| Pens per 10 matches | 1.5–2.5 |
| Direct FK goal rate | ~1 per 15–25 matches |
| Injuries (any) per match | 0.35–0.55 |
| Severe injury rate | <8% of injuries |
| Avg subs used | 4.0–4.6 |
| Shot share at large gap | weaker ≤25% |

---
## 12. Open Decisions / Flags
- Exempt forced injury subs from window count? (Currently: counts.)
- Add concussion-specific logic? (Deferred)
- Distinguish aerial vs ground duels? (Deferred)
- Introduce stamina recovery micro events (low tempo)? (Deferred)

---
## 13. Quick Reference Constants (Editable)
```js
MATCH_BALANCE = {
  SHOT: { baseTotal:22, skew:0.25, gapScale:4 },
  CLUSTER: { powerP:1.3, countLogK:0.35, countRef:5 },
  WEIGHTS: { sZsL:1.0, sZaL:0.55, aZsL:0.65, aZaL:0.30 },
  STAMINA: { baseDecay:0.55, halftimeRecovery:8 },
  AGE: { decay:{ y24:0.92,y28:1.0,y31:1.06,y34:1.12,y35:1.20 }, recovery:{ y24:1.10,y28:1.0,y31:0.92,y34:0.85,y35:0.78 } },
  INJURY: { periodicCheckSec:300, baseFoul:0.03 },
  PENALTY: { boxFoulBase:0.04, baseConversion:0.78 },
  FREEKICK: { directChance:0.25, baseDirect:0.07 },
  SUSPENSION: { yellowThreshold:3 }
}
```

---
## 14. Immediate Next Actions (Fase 1 Kickoff)
1. Create lane/zone assignment utilities.
2. Extend player live objects with age factors & fatigue flags.
3. Staff normalization helper.
4. Effective overall recalculation stub referencing staff mapping.
5. Add placeholder for cluster rating (no logic yet) to keep later diff small.

(Then proceed to Phase 2.)

---
## 15. Changelog (This Update)
- Added fatigue → injury scaling & age overlays.
- Added substitution windows logic (5 in 3 windows) & queue design.
- Added UI specifications for fatigue highlighting & substitution panel.
- Integrated penalty & free kick UI prompts.
- Expanded phased roadmap with concrete task numbers (1–40).

---
_This file is the single source of truth for the simulation implementation sequence. Update alongside code changes._

---
### Progress Log
2025-09-25: Phase 1 scaffold begun. Implemented in `matchEngine.js`:
- Lane/zone assignment helpers (laneFromX, zoneFromY) and annotatePlayersWithSpatial()
- Age multipliers (ageDecayMult, ageRecoveryFactor) stored per player
- Staff normalization function normalizeSpecialistStaff()
- Effective overall stub computeEffectiveOverall() with tactical staff boost
- Cluster rating placeholder (average) and computeTeamEffective()
Next: Phase 2 tasks 5-7 (cluster precomputation & localAdvantage formulas).
2025-09-25: Phase 2 implemented (tasks 5-7):
- Added cluster weighting constants & functions (clusterWeightFor, computeClusterRatingAdvanced)
- Built computeAllClusters() generating home/away ratings & advantage per (zone,lane)
- Added probability stubs passSuccessFromAdv / advanceProbFromAdv / dribbleSuccessFromAdv
- Added averageAdvantage() helper for future balancing
- simulateMatch now calls computeAllClusters (still legacy Poisson scoring)
Next: Phase 3 tasks 8-10 (possession loop scaffolding & replacing Poisson with event-driven skeleton).
2025-09-25: Phase 3 implemented (tasks 8-10):
- Replaced Poisson with event-driven possession skeleton inside simulateMatch
- Added state machine (clockSec, half, possession, ball chain)
- Implemented actions: ADVANCE, PASS, TURNOVER, SHOT, GOAL, SECOND_PHASE, HALF_TIME, FULL_TIME
- Basic xG & shot intent using chain & advantage heuristics
- Return object now includes events[] and debug.clusters (goal points unchanged shape for downstream usage)
Next: Phase 4 (stamina decay & halftime recovery + fatigue flags emission).
2025-09-25: Phase 4 implemented (tasks 11-12):
- Added live stamina (liveStamina) initialization for on-pitch players
- Implemented per-second stamina decay using: baseDecay * roleLoad * pressingFactor * tempoFactor * ageDecayMult * fitnessMult
- Added halftime recovery applying conditioning & ageRecoveryFactor
- Introduced stamina curve impacting effectiveOverall recalculation
- Added fatigue flags (OK/WARN/CRIT) with FATIGUE_ALERT events on threshold crossings (only worsening flags emit)
- Periodic (per 60 virtual sec) effectiveOverall recomputation; clusters remain static this phase
- Updated computeEffectiveOverall to apply stamina-based multiplier curve
Next: Phase 5 (fouls, cards, penalties) – introduce foul generation & season yellow suspension logic.
2025-09-25: Phase 5 implemented (tasks 13-15):
- Added foul generation influenced by cluster adv magnitude & defending fatigue composition
- Implemented YELLOW_CARD / RED_CARD logic including second yellow upgrade and season suspension trigger at threshold (3)
- Added FOUL events with offender and penalty flag
- Implemented penalty detection (ATT zone box foul) & full penalty sequence: PENALTY_AWARDED, PENALTY_TAKEN, PENALTY_SCORED / SAVED / MISSED
- Penalty conversion probability adjusted for low stamina
- Red card triggers immediate recompute of clusters (simplified: full team recalculation)
- Integrated foul check after each non-penalty action step prior to next loop iteration
Next: Phase 6 (free kicks) – implement direct/indirect FK outcomes & rating effects.
2025-09-25: Phase 6 implemented (tasks 16-18):
- Added free kick resolution logic (direct vs indirect) with FREE_KICK_DIRECT / GOAL / SAVED / WIDE / INDIRECT_SEQUENCE events
- Direct FK attempt probability scaled by danger (ATT zone), lane center bias, and local advantage
- Direct FK xG influenced by danger, lane, advantage, and taker stamina penalty
- Indirect sequences place ball in ATT with pre-seeded chainPasses and optional immediate shot attempt
- Time costs added (10s direct, 8s indirect) to virtual clock
- Clusters remain static; red cards still trigger global recomputation
Next: Phase 7 (injuries) – contextual foul vs non-contact injury risk & severity modeling.
2025-09-25: Phase 7 implemented (tasks 19-21):
- Added foul-context injury probability (FOUL events attempt victim injury roll)
- Implemented non-contact periodic injury checks every 300s for players <60 stamina
- Fatigue & age multipliers and medical (conditioning proxy) mitigation applied to injury probability
- Severity model (LIGHT/MINOR/MODERATE/SEVERE) with weeks out mapping & mitigation shift
- INJURY events emitted; injured players removed from pitch (clusters recomputed)
- Forced substitution placeholder (removal only; substitution queue to arrive Phase 8)
Next: Phase 8 (substitutions system) – windows tracking, pending queue, auto suggestions.
2025-09-25: Phase 8 implemented (tasks 22-25):
- Substitution rules enforced (max 5 subs / 3 windows excluding half-time)
- Added pending substitution queue with automatic processing at stoppage events
- Implemented auto fatigue-driven substitution suggestions (CRIT prioritized, then WARN after 45')
- Injury removals trigger immediate replacement attempt (if bench available)
- SUB_WINDOW_START and SUBSTITUTION events emitted with context & counters
- Halftime substitutions processed without consuming a window
- Clusters recomputed after each substitution window
- Basic role matching heuristic (exact role preference) and stamina initialization for entrants
Next: Phase 9 (tactics UI & live adjustments) – integrate tactical sliders & dynamic pressing/tempo effects.
2025-09-25: Phase 9 implemented (tasks 26-27):
- Added tactical state per side (pressing, tempo, width, verticality, formation) with defaults
- simulateMatch accepts options: { tactics, tacticChanges } enabling scheduled in-match adjustments
- Pressing & tempo now directly influence stamina decay (already wired via decay function inputs)
- Verticality modifies advance probability (+/-), pass success risk, and shot intent base
- Width modifies lateral shift probability in ATT zone
- Pressing scales foul chance (±45%)
- Formation changes via scheduled tacticChanges trigger re-annotation & cluster recomputation
- TACTIC_CHANGE events emitted when adjustments applied
- Added scheduled change processor (minute-based triggers each loop)
Next: Phase 10 (commentary & timeline enrichment) – event templates & advantage descriptors.
2025-09-25: Phase 10 implemented (tasks 28-30):
- Added commentary generation layer producing human-readable strings per significant event
- Key events flagged (isKey) for timeline filtering (goals, penalties, FK goals, red cards, injuries, substitutions, tactic changes)
- Advantage contextual notes (ADVANTAGE_NOTE) occasionally inserted on strong local flank/central dominance
- Lane + advantage magnitude descriptors (dominance / sustained control / finding space)
- Clock formatting helper (m') added for commentary strings
- Events augmented with optional commentary field without breaking existing consumers
Next: Phase 11 (balancing & metrics) – batch simulation harness & statistical tuning.
2025-09-25: Phase 11 (partial) implemented (tasks 31 init):
- Externalized key balance constants into MATCH_BALANCE export inside matchEngine
- Added batchSim.js harness: batchSimulate({iterations, homeTemplate, awayTemplate}) collecting goals, penalties, FK goals, injuries, subs, cards, shots
- Summary helper printBatchSummary() for console inspection
- Plan: Use harness to run 500-match batches; adjust MATCH_BALANCE.* (BOX_FOUL_BASE, FK_DIRECT_BASE, xG constants, NON_CONTACT_BASE) to hit acceptance metrics
Next: Execute empirical runs & iterate constants (tasks 32-33).
2025-09-25: Phase 11 (continued) tuning utilities:
- Added tuningSweep.js with runBalanceSweep() & printSweepSummary() for multi-parameter grid evaluation
- Scoring function penalizes distance from target ranges (Section 11) with weighted metrics
- Restores baseline MATCH_BALANCE after each sweep; outputs ranked top configurations
Next: Perform focused sweeps (start coarse then refine around best cluster) & lock tuned constants (task 32), then document final values (task 33).
2025-09-25: Path A (Streaming Runtime) initial implementation:
- Added createMatchRuntime() in matchEngine.js providing step(), fastForward(), queueTacticChange(), queueSub()
- Added incremental stamina decay, foul / set-piece / injury / substitution logic mirrored from batch engine
- Added liveMatchController.js wrapper with interval stepping (tickMs, onEvents, onState, onDone)
- Events now streamable for UI timeline; supports mid-match tactic & substitution queue from UI
Next: Build UI panels (Timeline, Tactics, Subs) consuming controller (Phase 9 UI portion) & integrate fatigue highlights.
2025-09-25: Live UI Phase – first pass + enhanced commentary:
- Implemented LiveMatch.jsx with panels (Timeline/Tactics/Subs) and reverse-ordered timeline trimming oldest events.
- Added player attribution for PASS / ADVANCE / SHOT / FOUL / GOAL events (passer, receiver, shooter, offender, victim IDs).
- Improved Italian commentary variants (vantaggio / pareggio / ribalta / allunga / accorcia).
- Added possession marker (●) over current ball holder.
- Added stamina bar color coding & pulsing CRIT animation on live pitch icons.
2025-09-25: Pacing & Noise Reduction:
- Introduced adjustable verbosity (high|normal|low) in streaming runtime (default low for LiveMatch).
- Increased base action delay (7–14s adjusted by tempo) to stretch 90' virtual closer to realistic event density.
- Routine PASS / ADVANCE events now probabilistically suppressed; failures logged more often than successes for context.
Next: Enhancement batch (A,C,D,E) – pacing stretch, timeline grouping, periodic summaries, micro animations.

2025-09-25: Task 41 implemented (Extended pacing & adaptive sparsity):
- Updated streaming runtime base action delay range to 8–16s.
- Added tempoFactor = (1 - 0.22*(tempo-0.5)).
- Implemented adaptive sparsity (+10% delay if >8 routine events in last 60s virtual).
- Added key-event snap (post key event next delay capped ~4–6s) to preserve dramatic cadence.
- Plan: Observe avg logged events reduction (~15–20%) before proceeding to grouping (Task 42).

---
## 16. Enhancement Batch A,C,D,E (Requested 2025-09-25)
User-requested live experience refinements. Mapped to new Tasks 41–44.

### A) Ulteriore dilatazione azioni (Base 8–16s)
Current: 7–14s base action delay scaled by tempo. New target: 8–16s to further reduce event density and create more natural rhythm.
Design:
- Replace baseDelayRange = [7,14] with [8,16].
- Tempo scaling: tempo in [0,1]; effectiveDelay = base * (1 - 0.22*(tempo-0.5)). (Slightly widen tempo effect but cap at ±22%).
- Introduce adaptive sparsity: If last 60 virtual sec produced > N routine (PASS/ADVANCE) logged events, raise next delay by +10% (one-shot) to smooth bursts.
- Ensure key events (SHOT, GOAL, CARD, INJURY, PENALTY_AWARDED, FREE_KICK_DIRECT) can “snap” minimum delay to 4s immediately after to keep drama pacing.
Acceptance Note: Average total logged timeline rows (pre-grouping) expected to drop ~15–20%.

### C) Raggruppare eventi consecutivi dello stesso minuto
Goal: Timeline compatta; multiple micro-events in same minute shown on one line.
Algorithm:
1. Iterate chronological events; compute minute = floor(virtualSec/60)+1.
2. Start group; continue appending while next event minute equals current AND event.type in GROUPABLE_TYPES (PASS, ADVANCE, TURNOVER, FOUL(no card), FREE_KICK_* (non-goal), PENALTY_TAKEN (non-outcome), SUBSTITUTION if multiple same minute) AND not separated by a key outcome.
3. On boundary, emit grouped structure: { minute, types:[...], icons:[...], summaryText }.
4. Summary text template examples:
   - "Circolazione palla" (>=3 PASS, no shot)
   - "Pressing avversario, perdita" (TURNOVER present + >=2 PASS before turnover)
   - "Punizione gestita" (FREE_KICK_DIRECT/SAVED/WIDE group without goal)
   - Fallback: join icons.
Implementation Notes:
- Preserve raw events array untouched; UI maintains derived groupedTimeline.
- Keep key events (GOAL, CARD, INJURY, PENALTY_SCORED/SAVED/MISSED, FREE_KICK_GOAL) always standalone.
- When grouping, earliest event supplies minute & timestamp ordering (reverse-order insertion still allowed).

### D) Conteggi sintetici ogni 5 minuti virtuali
Inject periodic SUMMARY events (type: PERIOD_SUMMARY, isKey:false but always displayed in grouped view) at virtual minutes 5,10,15,...,90 (exclude half-time if already summary).
Data window: events since last summary (exclusive).
Metrics captured: passesLogged, shots, shotsOnTarget, fouls, cards, xG (if available), possession share (approx via pass counts per side), substitutions.
Heuristic buckets:
- "Fase equilibrata, pochi tiri" (shots <=2 both sides & possession diff <15%).
- "Cresce la pressione di [TEAM]" (shots or xG share >65% for a side and >=3 shot/attempt events).
- "Ritmo basso" (passesLogged < threshold_per_5m (e.g., 12) & fouls <=1).
- "Molti falli, gara spezzettata" (fouls >=4 or cards >=2 in window).
- "Momento di caos offensivo" (combined shots >=6 or xG >=1.2 window).
Pick highest-priority matching descriptor; fallback "Gioco bilanciato".
Store snapshot stats in summary event.payload for advanced UI (hover tooltip).

### E) Micro-animazioni (pass line / shot flash)
Objective: Lightweight, no heavy canvas dependency.
Approach:
- Pitch container relative; create transient <div> elements absolutely positioned.
- Pass line: element with class .pass-line, width = distance, rotated via transform, fade & shrink over 600ms (CSS animation). Coordinates from player badge center to receiver center.
- Shot flash: radial gradient circle (.shot-flash) appearing from shooter to goal center or goal mouth segment; scale+fade 700ms.
API:
```
window.liveAnimations = {
  drawPass(fromEl, toEl),
  flashShot(fromEl, goalSide) // goalSide: 'L','C','R'
}
```
Performance:
- Cap concurrent animations (e.g., max 6) – oldest removed.
- Use will-change: transform, opacity for smoother rendering.
Fallback: If reduced-motion media query matches, disable animations.

### New Tasks
41. Implement expanded delay logic & adaptive sparsity (A).
42. Add grouping transformer & integrate into timeline render pipeline (C).
43. Implement 5-minute periodic summary insertion & heuristics (D).
44. Create micro-animation module + CSS, hook into PASS (successful), SHOT (on attempt & goal) (E).

### Testing Plan
- Simulate 20 matches (headless) capturing avg seconds between logged events before vs after (target +15–20%).
- Verify grouped timeline row count reduction vs raw events (target compression ratio ~0.55–0.70 depending on verbosity).
- Ensure summaries appear at correct virtual minutes (skip duplicates across half-time boundary).
- Accessibility: verify reduced-motion disables animations (query: (prefers-reduced-motion: reduce)).

### Metrics Additions (Extension to Section 11)
Add Monitoring (not acceptance-critical):
| Metric | Target Exploratory |
|--------|--------------------|
| Avg grouped timeline rows | 35–50 |
| Avg raw->group compression | 0.55–0.70 |
| Summary events per match | 17–18 (90/5, minus halftime duplication) |

---
