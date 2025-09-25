import { GAME_CONSTANTS } from '../constants'

// ---- Phase 11: Externalized balance constants (initial pass) ----
// These mirror Section 13 of the simulation plan. Adjust via tooling / batch harness for tuning.
export const MATCH_BALANCE = {
  PENALTY_BASE: 0.78,
  BOX_FOUL_BASE: 0.04,
  FK_DIRECT_BASE: 0.25,
  FK_DIRECT_GOAL_BASE_XG: 0.07,
  INJURY_PERIODIC_CHECK_SEC: 300,
  FOUL_BASE_INJURY: 0.03,
  NON_CONTACT_BASE: 0.004,
  SEASON_YELLOW_THRESHOLD: 3,
}

// --- Phase 1 scaffolding additions (lane/zone assignment, staff normalization, effective overall, cluster placeholder) ---

// Lane boundaries (x expressed 0-100) LEFT <33, CENTER 33-66, RIGHT >66
function laneFromX(x){
  if (x < 33) return 'LEFT'
  if (x > 66) return 'RIGHT'
  return 'CENTER'
}
// Zone bands by y (0 top attacking to 100 own goal baseline in our coordinate system)
// We reuse existing formation y positions (20 FW line, 45 MF, 70 DF, 90 GK) to map to DEF/MID/ATT/BOX.
function zoneFromY(y){
  if (y <= 25) return 'ATT' // forward line (abstract attacking third)
  if (y <= 55) return 'MID'
  if (y <= 80) return 'DEF'
  return 'DEF'
}

// Age-based multipliers (initial constants; will later move to central MATCH_BALANCE export)
function ageDecayMult(age){
  if (age <= 24) return 0.92
  if (age <= 28) return 1.00
  if (age <= 31) return 1.06
  if (age <= 34) return 1.12
  return 1.20
}
function ageRecoveryFactor(age){
  if (age <= 24) return 1.10
  if (age <= 28) return 1.00
  if (age <= 31) return 0.92
  if (age <= 34) return 0.85
  return 0.78
}

// Staff normalization mapping to canonical internal keys
export function normalizeSpecialistStaff(spec){
  if (!spec) return {
    goalkeeping:{saveBoost:0}, fitness:{staminaDecayMult:1}, conditioning:{staminaRecoveryMult:1},
    tactical:{decisionQualityBoost:0}, psychology:{moraleStability:0, cardRiskReduction:0}
  }
  const defs = GAME_CONSTANTS.FINANCE.TECHNICAL_SPECIALISTS || {}
  function mapLevel(role){
    const idx = spec[role] ?? 0
    const level = defs[role]?.levels?.[idx] || {}
    return level
  }
  const gk = mapLevel('goalkeeping')
  const fit = mapLevel('fitness')
  const tac = mapLevel('tactical')
  const cond = mapLevel('conditioning')
  const psy = mapLevel('psychology')
  return {
    goalkeeping:{ saveBoost: gk.saveBoost || 0 },
    fitness:{ staminaDecayMult: fit.staminaDecayMult ?? 1 },
    conditioning:{ staminaRecoveryMult: 1 + (cond.progressionBoost ? cond.progressionBoost*0.5 : 0) }, // repurpose progressionBoost partly for recovery until separate stat
    tactical:{ decisionQualityBoost: tac.performanceBoost || 0 },
    psychology:{ moraleStability: psy.moraleStability || 0, cardRiskReduction: (psy.cardRiskReduction||0) }
  }
}

// Role workload multipliers (affects stamina decay later). For now just stub provided for future use.
const ROLE_LOAD = {
  GK:0.70, DC:0.92, DR:1.08, DL:1.08, MC:1.05, MR:1.07, ML:1.07, FR:1.07, FL:1.07, ST:1.00
}

// ---- Phase 2: Cluster engine & local advantage formulas ----
// Cluster weighting constants (will later be externalized to MATCH_BALANCE config)
const CLUSTER_WEIGHTS = {
  sameZoneSameLane: 1.00,
  sameZoneAdjacentLane: 0.55,
  adjacentZoneSameLane: 0.65,
  adjacentZoneAdjacentLane: 0.30,
}
const CLUSTER_POWER_P = 1.3
const CLUSTER_COUNT_K = 0.35
const CLUSTER_COUNT_REF = 5

const ZONES = ['DEF','MID','ATT'] // BOX handled later when shot logic arrives
const LANES = ['LEFT','CENTER','RIGHT']

// Determine weight category for a player relative to a reference (zone,lane)
function clusterWeightFor(player, zone, lane){
  if (!player.zone || !player.lane) return 0
  const sameZone = player.zone === zone
  const sameLane = player.lane === lane
  if (sameZone && sameLane) return CLUSTER_WEIGHTS.sameZoneSameLane
  if (sameZone && player.lane !== lane) return CLUSTER_WEIGHTS.sameZoneAdjacentLane
  // adjacent zone: DEF<->MID, MID<->ATT
  const adjacentZone = (zone === 'DEF' && player.zone === 'MID') || (zone === 'MID' && (player.zone === 'DEF' || player.zone === 'ATT')) || (zone === 'ATT' && player.zone === 'MID')
  if (adjacentZone && sameLane) return CLUSTER_WEIGHTS.adjacentZoneSameLane
  if (adjacentZone && player.lane !== lane) return CLUSTER_WEIGHTS.adjacentZoneAdjacentLane
  return 0
}

// Compute cluster rating with power mean + diminishing returns
function computeClusterRatingAdvanced(players){
  if (!players.length) return 0
  // Each player item: { weight, eff }
  let sumWeightedPower = 0
  let sumWeights = 0
  for (const pl of players){
    const eff = Math.max(30, pl.eff || 0)
    const w = pl.weight
    if (w <= 0) continue
    sumWeightedPower += Math.pow(eff, CLUSTER_POWER_P) * w
    sumWeights += w
  }
  if (sumWeights <= 0) return 0
  const powerMean = Math.pow(sumWeightedPower / sumWeights, 1/CLUSTER_POWER_P)
  const n = players.filter(p => p.weight > 0).length
  const countFactor = 1 + CLUSTER_COUNT_K * (Math.log(1 + n)/Math.log(1 + CLUSTER_COUNT_REF))
  return powerMean * countFactor
}

// Precompute clusters for both teams; returns structure keyed by zone_lane
export function computeAllClusters(homeTeam, awayTeam){
  const clusters = {}
  for (const z of ZONES){
    for (const l of LANES){
      const key = `${z}_${l}`
      const homeList = []
      const awayList = []
      homeTeam.players.forEach(p => {
        const weight = clusterWeightFor(p, z, l)
        if (weight > 0) homeList.push({ weight, eff: p.effectiveOverall || p.overall || 50 })
      })
      awayTeam.players.forEach(p => {
        const weight = clusterWeightFor(p, z, l)
        if (weight > 0) awayList.push({ weight, eff: p.effectiveOverall || p.overall || 50 })
      })
      const homeRating = computeClusterRatingAdvanced(homeList)
      const awayRating = computeClusterRatingAdvanced(awayList)
      clusters[key] = { homeRating, awayRating, advantage: homeRating - awayRating }
    }
  }
  return clusters
}

// Local advantage derivatives → probability stubs (not yet wired into simulation loop)
export function passSuccessFromAdv(localAdv){
  // logistic scaled; clamp 0.12–0.97
  const scale = 14
  const raw = 1 / (1 + Math.exp(-(localAdv/scale)))
  return Math.min(0.97, Math.max(0.12, raw))
}
export function advanceProbFromAdv(localAdv){
  const base = 0.40
  const add = (1 / (1 + Math.exp(-(localAdv/16)))) * 0.35
  return Math.min(0.88, Math.max(0.18, base + add))
}
export function dribbleSuccessFromAdv(localAdv){
  let val = 0.45 + (localAdv / 120)
  return Math.min(0.82, Math.max(0.10, val))
}

// Aggregate a single global average advantage (could be used to gently nudge legacy Poisson strength scaling later)
export function averageAdvantage(clusters){
  const entries = Object.values(clusters)
  if (!entries.length) return 0
  const sum = entries.reduce((s,c)=> s + c.advantage, 0)
  return sum / entries.length
}

// Effective overall (Phase 1 stub) – currently only applies simple OOP penalty & tactical staff boost placeholder.
export function computeEffectiveOverall(player, staff){
  const base = player.overall || player.baseOverall || 50
  const oopMult = player.slot?.penalty ? player.slot.penalty : (player.slot?.oop ? 0.9 : 1)
  // Phase 4: apply stamina curve if liveStamina present
  function staminaMultiplier(st){
    if (st == null) return 1
    if (st >= 90) return 1
    if (st >= 80) return 0.98 + (st-80)*0.002   // 80->0.98, 89->0.998
    if (st >= 70) return 0.94 + (st-70)*0.004   // 70->0.94, 79->0.976
    if (st >= 55) return 0.85 + (st-55)*0.006   // 55->0.85, 69->0.934
    if (st >= 40) return 0.72 + (st-40)*0.00867 // 40->0.72, 54->0.842
    return 0.60 + (st/100)*0.20                 // 0->0.60, 39->~0.678
  }
  const staminaMult = staminaMultiplier(player.liveStamina)
  const moraleMult = 1 // (1 + (player.morale-1)*0.05)
  const tacticalBoost = staff?.tactical?.decisionQualityBoost ? (1 + staff.tactical.decisionQualityBoost) : 1
  return base * oopMult * staminaMult * moraleMult * tacticalBoost
}

// Attach lane & zone metadata to current starters (idempotent if already set)
export function annotatePlayersWithSpatial(team){
  const formation = team.formation || '442'
  const layout = GAME_CONSTANTS.POSITION_ROLES[formation]
  if (!layout) return team
  const sectionOrder = ['GK','DF','MF','FW']
  // Build flattened position slots with x,y for mapping; players expected to already have slot linking done externally.
  // If not, we just infer lane/zone from their role typical coordinates by scanning layout.
  const roleSlots = []
  sectionOrder.forEach(sec => {
    const arr = layout[sec] || []
    arr.forEach(s => roleSlots.push(s))
  })
  team.players.forEach(p => {
    if (p.lane && p.zone) return
    let x = 50, y = 50
    if (p.slot && typeof p.slot.x === 'number') { x = p.slot.x; y = p.slot.y }
    else if (p.primaryRole){
      // try approximate by finding first slot whose natural includes role
      const found = roleSlots.find(s => s.natural?.includes(p.primaryRole))
      if (found){ x = found.x; y = found.y }
    }
    p.lane = laneFromX(x)
    p.zone = zoneFromY(y)
    if (!p.ageDecayMult) p.ageDecayMult = ageDecayMult(p.age || 27)
    if (!p.ageRecoveryFactor) p.ageRecoveryFactor = ageRecoveryFactor(p.age || 27)
  })
  return team
}

// Placeholder cluster rating – returns average effective overall for now; Phase 2 will implement advanced logic.
export function clusterRating(players){
  if (!players || !players.length) return 0
  let sum = 0
  for (const p of players) sum += p.effectiveOverall || p.overall || 50
  return sum / players.length
}

// Compute & cache effectiveOverall for all players on a team (called pre-simulation for baseline).
export function computeTeamEffective(team){
  const staff = normalizeSpecialistStaff(team.finances?.specialistStaff)
  team.players.forEach(p => { p.effectiveOverall = computeEffectiveOverall(p, staff) })
  return team
}

export function teamStrength(team) {
  // Build list of explicit starters (players with slot.starting flag) else fallback to best 11.
  const starters = team.players.filter(p => p.starting && p.slot).sort((a,b)=> (b.overall||0) - (a.overall||0))
  const pool = starters.length >= 11 ? starters.slice(0,11) : team.players.slice().sort((a,b)=> (b.overall||0)-(a.overall||0)).slice(0,11)
  if (!pool.length) return 50
  // Apply out-of-position penalty if recorded (slot.penalty) else infer (simple 0.9 if oop flag)
  let sum = 0
  for (const p of pool) {
    const base = p.overall || 50
    const pen = p.slot?.penalty ? p.slot.penalty : (p.slot?.oop ? 0.9 : 1)
    sum += base * pen
  }
  let avg = sum / pool.length
  // Specialist staff tactical & fitness influence (small additive boosts)
  const fin = team.finances || {}
  const spec = fin.specialistStaff || {}
  const defs = (globalThis.GAME_CONSTANTS || GAME_CONSTANTS).FINANCE.TECHNICAL_SPECIALISTS || {}
  // Tactical analyst performanceBoost directly scales average
  if (spec.tactical != null) {
    const tactEntry = defs.tactical?.levels?.[spec.tactical]
    if (tactEntry?.performanceBoost) avg *= (1 + tactEntry.performanceBoost)
  }
  // Fitness coach slightly offsets penalties: add half of (1 - staminaDecayMult) as bonus * baseline
  if (spec.fitness != null) {
    const fitEntry = defs.fitness?.levels?.[spec.fitness]
    if (fitEntry?.staminaDecayMult && fitEntry.staminaDecayMult < 1) {
      const recoveryBoost = (1 - fitEntry.staminaDecayMult) * 0.5 // cap mild impact (e.g., 0.03 -> 0.015)
      avg *= (1 + recoveryBoost)
    }
  }
  return avg
}

function poisson(lambda) {
  // Simple Poisson-distributed integer using Knuth's algorithm
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

export function simulateMatch(homeTeam, awayTeam, options = {}) {
  // Phase 1 hook: annotate spatial & compute baseline effective overalls (non-event engine yet)
  annotatePlayersWithSpatial(homeTeam)
  annotatePlayersWithSpatial(awayTeam)
  computeTeamEffective(homeTeam)
  computeTeamEffective(awayTeam)
  // Phase 2: compute clusters (stored for potential downstream use / debugging)
  let clusters = computeAllClusters(homeTeam, awayTeam)

  // ---- Phase 9: Tactical system (dynamic adjustments) ----
  // Options shape: { tactics: { HOME:{pressing, tempo, width, verticality, formation}, AWAY:{...} }, tacticChanges:[ { side:'HOME', atMinute: 60, changes:{ pressing:0.7, formation:'433'} } ] }
  const defaultTactic = { pressing:0.5, tempo:0.5, width:0.5, verticality:0.5 }
  const tacticState = {
    HOME: { ...defaultTactic, ...(options.tactics?.HOME || {}) },
    AWAY: { ...defaultTactic, ...(options.tactics?.AWAY || {}) }
  }
  // Apply initial formation overrides from tactics if provided
  if (options.tactics?.HOME?.formation) homeTeam.formation = options.tactics.HOME.formation
  if (options.tactics?.AWAY?.formation) awayTeam.formation = options.tactics.AWAY.formation
  // Re-annotate if formations changed
  annotatePlayersWithSpatial(homeTeam)
  annotatePlayersWithSpatial(awayTeam)
  clusters = computeAllClusters(homeTeam, awayTeam)

  // Normalize tactic change schedule (convert minutes->seconds)
  const tacticChangeQueue = (options.tacticChanges || []).map(ch => ({ ...ch, atSec: (ch.atMinute ?? 0) * 60, applied:false }))
  // Phase 3: Event-driven possession skeleton replacing Poisson (MVP: static clusters, no stamina / cards yet)
  // Phase 4 additions: stamina decay & halftime recovery + fatigue flags/events

  // Normalize staff for stamina calculations
  const homeStaff = normalizeSpecialistStaff(homeTeam.finances?.specialistStaff)
  const awayStaff = normalizeSpecialistStaff(awayTeam.finances?.specialistStaff)

  function pickPitchPlayers(team){
    const starters = team.players.filter(p => p.starting && p.slot)
    if (starters.length) return starters
    // fallback best 11
    return team.players.slice().sort((a,b)=> (b.overall||0)-(a.overall||0)).slice(0,11)
  }
  const homePitch = pickPitchPlayers(homeTeam)
  const awayPitch = pickPitchPlayers(awayTeam)

  // Initialize live stamina (if not already) & fatigue flags
  function initLive(player){
    if (player.liveStamina == null) player.liveStamina = 100
    player.fatigueFlag = staminaFlag(player.liveStamina)
  }
  homePitch.forEach(initLive)
  awayPitch.forEach(initLive)

  // Stamina decay tuning (runtime vs batch): slightly lower base and add early-phase damping
  const BASE_DECAY_PER_MIN = 0.48 // was 0.55; slows overall drop (~45–50 over full match under neutral tactics)
  const HALFTIME_RECOVERY = 8
  function getPressing(side){ return tacticState[side].pressing }
  function getTempo(side){ return tacticState[side].tempo }
  function getVerticality(side){ return tacticState[side].verticality }
  function getWidth(side){ return tacticState[side].width }

  function roleLoad(player){
    const r = player.primaryRole || player.role || (player.slot && player.slot.role)
    return ROLE_LOAD[r] || 1
  }
  function decayPerSecond(player, teamSide){
    const staff = teamSide === 'HOME' ? homeStaff : awayStaff
  const pressingIntensity = getPressing(teamSide)
  const tempo = getTempo(teamSide)
    const load = roleLoad(player)
    const pressingFactor = 1 + pressingIntensity * 0.35
    const tempoFactor = 1 + (tempo - 0.5) * 0.10
    const ageMult = player.ageDecayMult || ageDecayMult(player.age || 27)
    const fitnessMult = staff.fitness?.staminaDecayMult ?? 1
    const perMin = BASE_DECAY_PER_MIN * load * pressingFactor * tempoFactor * ageMult * fitnessMult
    return perMin / 60
  }

  function halftimeRecovery(player, teamSide){
    const staff = teamSide === 'HOME' ? homeStaff : awayStaff
    const ageRec = player.ageRecoveryFactor || ageRecoveryFactor(player.age || 27)
    const rec = HALFTIME_RECOVERY * (staff.conditioning?.staminaRecoveryMult || 1) * ageRec
    player.liveStamina = Math.min(100, player.liveStamina + rec)
  }

  function staminaFlag(st){
    if (st < 55) return 'CRIT'
    if (st < 70) return 'WARN'
    return 'OK'
  }

  function applyStaminaDecay(deltaSec){
    function updateGroup(arr, side){
      for (const p of arr){
        const before = p.liveStamina
        if (before <= 0) continue
        p.liveStamina = Math.max(0, before - decayPerSecond(p, side) * deltaSec)
        const newFlag = staminaFlag(p.liveStamina)
        if (newFlag !== p.fatigueFlag){
          // Only emit worsening flags (OK->WARN / WARN->CRIT)
            if ((p.fatigueFlag === 'OK' && newFlag === 'WARN') || (p.fatigueFlag !== 'CRIT' && newFlag === 'CRIT')){
              pushEvent('FATIGUE_ALERT', { playerId: p.id, newFlag })
            }
          p.fatigueFlag = newFlag
        }
      }
    }
    updateGroup(homePitch,'HOME')
    updateGroup(awayPitch,'AWAY')
  }

  function recomputeEffectiveOnPitch(){
    function recalc(arr, staff){
      arr.forEach(p => { p.effectiveOverall = computeEffectiveOverall(p, staff) })
    }
    recalc(homePitch, homeStaff)
    recalc(awayPitch, awayStaff)
    // Note: clusters remain static this phase (no live recompute for performance); future phase can diff if needed.
  }

  function initialState(){
    return {
      clockSec: 0, // virtual seconds (0..5400)
      half: 1,
      events: [],
      score: { HOME:0, AWAY:0 },
      possession: Math.random() < 0.5 ? 'HOME' : 'AWAY',
      ball: { zone:'MID', lane:'CENTER', chainPasses:0 }
    }
  }
  const state = initialState()
  const HALF_DURATION = 45 * 60
  const MATCH_DURATION = 90 * 60
    const MAX_EVENTS = 650 // safety cap
    // Periodic 5-minute summary (Task 43)
    let nextSummarySec = 5 * 60
    function pushPeriodSummary(boundarySec){
      const windowStart = boundarySec - 5*60
      const windowEnd = boundarySec
      // Gather window events
      const windowEvents = state.events.filter(e => e.t > windowStart && e.t <= windowEnd)
      let passes=0, passSucc=0, advances=0, advSucc=0, shots=0, xg=0, fouls=0, cards=0
      const sideActions = { HOME:0, AWAY:0 }
      windowEvents.forEach(ev => {
        if (ev.type === 'PASS'){ passes++; if (ev.success) passSucc++; sideActions[ev.possession]++ }
        else if (ev.type === 'ADVANCE'){ advances++; if (ev.success) advSucc++; sideActions[ev.possession]++ }
        else if (ev.type === 'SHOT'){ shots++; xg += (ev.xg||0) }
        else if (ev.type.startsWith('FREE_KICK_') && ev.xg != null){ xg += ev.xg }
        else if (ev.type === 'FOUL'){ fouls++ }
        else if (ev.type === 'YELLOW_CARD' || ev.type === 'RED_CARD'){ cards++ }
      })
      const totalActs = sideActions.HOME + sideActions.AWAY
      const homePossPct = totalActs? Math.round((sideActions.HOME/totalActs)*100):50
      const awayPossPct = 100 - homePossPct
      const passFail = passes - passSucc
      const advFail = advances - advSucc
      const minuteStart = Math.floor(windowStart/60)
      const minuteEnd = Math.floor(windowEnd/60)
      const commentary = `Sintesi ${minuteStart}'-${minuteEnd}': possesso ${homePossPct}%-${awayPossPct}%, passaggi ${passSucc}/${passFail}, avanzate ${advSucc}/${advFail}, tiri ${shots} (xG ${xg.toFixed(2)}), falli ${fouls}.`
      const evt = { id: state.events.length + 1, t: boundarySec, half: state.half, type:'PERIOD_SUMMARY', commentary, stats:{ windowStart, windowEnd, homePossPct, awayPossPct, passes, passSucc, advances, advSucc, shots, xg: Number(xg.toFixed(3)), fouls, cards } }
      evt.isKey = true
      state.events.push(evt)
    }

  // Helper to append event
  // ---- Phase 10: Commentary & Key Event Tagging ----
  const HOME_NAME = homeTeam.name || 'Home'
  const AWAY_NAME = awayTeam.name || 'Away'
  const KEY_EVENT_TYPES = new Set(['GOAL','PENALTY_SCORED','PENALTY_SAVED','PENALTY_MISSED','FREE_KICK_GOAL','RED_CARD','INJURY','SUBSTITUTION','TACTIC_CHANGE','PERIOD_SUMMARY'])
  function formatClock(sec){ const m = Math.floor(sec/60); return `${m}'` }
  function advantageDescriptor(lane, adv){
    if (Math.abs(adv) < 28) return null
    const side = adv>0 ? (state.possession==='HOME'?HOME_NAME:AWAY_NAME) : (state.possession==='HOME'?AWAY_NAME:HOME_NAME)
    const dir = lane==='LEFT'?'left flank': (lane==='RIGHT'?'right flank':'central channel')
    if (Math.abs(adv) > 55) return `${side} utterly dominate the ${dir}.`
    if (Math.abs(adv) > 40) return `${side} gaining sustained control on the ${dir}.`
    return `${side} finding space in the ${dir}.`
  }
  function commentaryFor(eventType, base){
    switch(eventType){
      case 'GOAL': return `Goal! ${base.scorerSide==='HOME'?HOME_NAME:AWAY_NAME} take the lead ${formatClock(state.clockSec)} (${base.scoreline}).`
      case 'SHOT':
        if (base.goal) return null // GOAL event handles
        if (base.xg >= 0.25) return `Big chance wasted at ${formatClock(state.clockSec)} (xG ${base.xg}).`
        if (base.xg >= 0.15) return `Decent effort; keeper alert (xG ${base.xg}).`
        return null
      case 'PENALTY_AWARDED': return `Penalty to ${(state.possession==='HOME')?HOME_NAME:AWAY_NAME}!`
      case 'PENALTY_SCORED': return `Converted! ${(base.scorerSide==='HOME')?HOME_NAME:AWAY_NAME} score from the spot (${base.scoreline}).`
      case 'PENALTY_SAVED': return `Penalty saved! Keeper comes up big.`
      case 'PENALTY_MISSED': return `Penalty missed! A huge let off.`
      case 'FREE_KICK_GOAL': return `Brilliant free kick! Curled in with style.`
      case 'FREE_KICK_SAVED': return `Free kick on target but saved.`
      case 'FREE_KICK_WIDE': return `Free kick drifts wide.`
      case 'FREE_KICK_DIRECT': return null
      case 'FREE_KICK_INDIRECT_SEQUENCE': return null
      case 'YELLOW_CARD': return `Booking issued.`
      case 'RED_CARD': return `Red card! Advantage ${(base.side==='HOME')?AWAY_NAME:HOME_NAME}.`
      case 'INJURY': return `Injury stoppage; player down (severity ${base.severity}).`
      case 'SUB_WINDOW_START': return null
      case 'SUBSTITUTION': return `Substitution: ${(base.side==='HOME')?HOME_NAME:AWAY_NAME} fresh legs on.`
      case 'TACTIC_CHANGE': return `Tactical adjustment by ${(base.side==='HOME')?HOME_NAME:AWAY_NAME}.`
      case 'FOUL': return base.penalty? null : `Foul committed.`
      case 'FATIGUE_ALERT': return null
      case 'ADVANTAGE_NOTE': return base.note || null
      default: return null
    }
  }
  function pushEvent(type, data={}){
    const evt = {
      id: state.events.length + 1,
      t: state.clockSec,
      half: state.half,
      type,
      possession: state.possession,
      zone: state.ball.zone,
      lane: state.ball.lane,
      ...data
    }
    // Generate commentary if not explicitly provided
    if (!evt.commentary){
      const c = commentaryFor(type, evt)
      if (c) evt.commentary = c
    }
    // Key flag
    if (KEY_EVENT_TYPES.has(type)) evt.isKey = true
    state.events.push(evt)
  }

  function clusterAdvantageCurrent(){
    const key = `${state.ball.zone}_${state.ball.lane}`
    const c = clusters[key] || { homeRating:0, awayRating:0 }
    return state.possession === 'HOME' ? (c.homeRating - c.awayRating) : (c.awayRating - c.homeRating)
  }

  function actionDelaySec(){
    // Base tempo ~ 5-12 virtual seconds per micro action
    return 4 + Math.floor(Math.random()*7)
  }

  function attemptAdvance(){
    const adv = clusterAdvantageCurrent()
    let pAdvance = advanceProbFromAdv(adv)
    // Verticality adjustment: increase forward progression appetite
    const vert = getVerticality(state.possession)
    pAdvance *= (1 + (vert - 0.5)*0.35) // ±17.5%
    pAdvance = Math.min(0.95, Math.max(0.05, pAdvance))
    if (Math.random() < pAdvance){
      // Advance zone progression DEF->MID->ATT ; from ATT stay ATT (later BOX for shots)
      if (state.ball.zone === 'DEF') state.ball.zone = 'MID'
      else if (state.ball.zone === 'MID') state.ball.zone = 'ATT'
      else if (state.ball.zone === 'ATT') {
        // small chance to shift lane laterally to create shot angle
        let shiftProb = 0.35
        const width = getWidth(state.possession)
        shiftProb *= (1 + (width - 0.5)*0.6) // width amplifies lateral switching
        if (Math.random() < shiftProb){
          if (state.ball.lane === 'CENTER') state.ball.lane = Math.random()<0.5 ? 'LEFT':'RIGHT'
          else state.ball.lane = 'CENTER'
        }
      }
      state.ball.chainPasses++
      pushEvent('ADVANCE', { success:true })
      // Optional advantage note with small chance
      if (Math.random()<0.08){
        const key = `${state.ball.zone}_${state.ball.lane}`
        const c = clusters[key]
        if (c){
          const localAdv = state.possession==='HOME'? (c.homeRating - c.awayRating):(c.awayRating - c.homeRating)
          const note = advantageDescriptor(state.ball.lane, localAdv)
          if (note) pushEvent('ADVANTAGE_NOTE', { note })
        }
      }
      return true
    } else {
      // Failed forward action → treat as pass attempt
      return attemptPass(true)
    }
  }

  function attemptPass(isForwardMiss){
    const adv = clusterAdvantageCurrent()
    let pPass = passSuccessFromAdv(adv) * (isForwardMiss ? 0.92 : 1)
    // High verticality induces risk -> reduce pass success slightly; low verticality increases safety
    const vert = getVerticality(state.possession)
    pPass *= (1 - (vert - 0.5)*0.12) // ±6%
    pPass = Math.min(0.98, Math.max(0.08, pPass))
    if (Math.random() < pPass){
      state.ball.chainPasses++
      pushEvent('PASS', { success:true })
      return true
    } else {
      pushEvent('PASS', { success:false })
      turnover()
      return false
    }
  }

  function turnover(){
    pushEvent('TURNOVER')
    state.possession = state.possession === 'HOME' ? 'AWAY' : 'HOME'
    // Reset chain context; drop ball back one zone sometimes
    if (state.ball.zone === 'ATT') state.ball.zone = 'MID'
    else if (state.ball.zone === 'MID' && Math.random()<0.4) state.ball.zone = 'DEF'
    state.ball.lane = 'CENTER'
    state.ball.chainPasses = 0
  }

  function shotIntent(){
    if (state.ball.zone !== 'ATT') return false
    const adv = clusterAdvantageCurrent()
    // Basic shot intent probability using advantage and chain development
    let base = 0.18
    // Verticality influences base shot intent
    base *= (1 + (getVerticality(state.possession)-0.5)*0.5) // ±25%
    const chainBoost = Math.min(0.12, state.ball.chainPasses * 0.03)
    const advBoost = (1 / (1 + Math.exp(-(adv/18)))) * 0.20 // 0..0.20
    const pShot = Math.min(0.60, base + chainBoost + advBoost)
    return Math.random() < pShot
  }

  function attemptShot(){
    const adv = clusterAdvantageCurrent()
    // Base xG by lane
    let baseXg = state.ball.lane === 'CENTER' ? 0.09 : 0.06
    baseXg += Math.min(0.03, state.ball.chainPasses * 0.01)
    // Advantage contributes positively (diminishing)
    if (adv > 0) baseXg += Math.min(0.04, adv/150)
    else baseXg += adv/300 // slight negative if under pressure
    let xg = Math.max(0.01, Math.min(0.55, baseXg))
    const goal = Math.random() < xg
    pushEvent('SHOT', { xg: Number(xg.toFixed(3)), goal })
    if (goal){
      state.score[state.possession]++
      pushEvent('GOAL', { scorerSide: state.possession, scoreline: `${state.score.HOME}-${state.score.AWAY}` })
      // After goal: kickoff to opponent at MID center
      state.possession = state.possession === 'HOME' ? 'AWAY' : 'HOME'
      state.ball.zone = 'MID'
      state.ball.lane = 'CENTER'
      state.ball.chainPasses = 0
    } else {
      // Simple outcome: 50% keeper claims (turnover), 50% rebound turnover to random side (bias defending)
      if (Math.random() < 0.5) {
        turnover()
      } else {
        // Retained possession (rare) gives new small chain in ATT
        state.ball.chainPasses = 0
        pushEvent('SECOND_PHASE')
      }
    }
  }

  // --- Phase 5: Fouls, Cards, Penalties ---
  // Phase 11: draw from MATCH_BALANCE config (exported)
  const PENALTY_BASE = MATCH_BALANCE.PENALTY_BASE
  const BOX_FOUL_BASE = MATCH_BALANCE.BOX_FOUL_BASE
  const SEASON_YELLOW_THRESHOLD = MATCH_BALANCE.SEASON_YELLOW_THRESHOLD
  const FK_DIRECT_BASE = MATCH_BALANCE.FK_DIRECT_BASE
  const FK_DIRECT_GOAL_BASE_XG = MATCH_BALANCE.FK_DIRECT_GOAL_BASE_XG
  const INJURY_PERIODIC_CHECK_SEC = MATCH_BALANCE.INJURY_PERIODIC_CHECK_SEC
  const FOUL_BASE_INJURY = MATCH_BALANCE.FOUL_BASE_INJURY
  const NON_CONTACT_BASE = MATCH_BALANCE.NON_CONTACT_BASE // base per periodic check for eligible fatigued players

  function onSendOff(side){
    // Remove sent off player from pitch arrays and recompute clusters for realism
    if (side === 'HOME') {
      // homePitch already filtered below; clusters recomputed with full team players (we keep underlying team roster intact)
    }
    clusters = computeAllClusters(homeTeam, awayTeam)
  }

  function sampleDefenderForCard(defSide){
    const arr = defSide === 'HOME' ? homePitch : awayPitch
    // Prefer players in current ball zone if any
    const zone = state.ball.zone
    const zonePlayers = arr.filter(p => p.zone === zone && !p.sentOff)
    const pool = zonePlayers.length ? zonePlayers : arr.filter(p=> !p.sentOff)
    if (!pool.length) return null
    return pool[Math.floor(Math.random()*pool.length)]
  }

  function foulChance(){
    // Based on local advantage magnitude, defender fatigue composition
    const adv = Math.abs(clusterAdvantageCurrent())
    let p = 0.012
    if (adv > 25) p += 0.006
    if (adv > 50) p += 0.006
    // Defender fatigue
    const defSide = state.possession === 'HOME' ? 'AWAY' : 'HOME'
    const arr = defSide === 'HOME' ? homePitch : awayPitch
    if (arr.length){
      const warn = arr.filter(p => p.fatigueFlag === 'WARN').length
      const crit = arr.filter(p => p.fatigueFlag === 'CRIT').length
      p += warn * 0.0008 + crit * 0.0015
    }
    // Pressing increases foul likelihood
    const pressing = getPressing(defSide)
    p *= (1 + (pressing - 0.5)*0.9) // up to +45% / -45%
    return Math.min(0.05, p)
  }

  function maybeFoul(context){
    // context: { afterAction:true, actionType:'PASS'|'ADVANCE'|'SHOT' }
    if (context.actionType === 'SHOT') return // handle fouls prior to shot generation only (simplify)
    if (Math.random() >= foulChance()) return false
    const defendingSide = state.possession === 'HOME' ? 'AWAY' : 'HOME'
    const offender = sampleDefenderForCard(defendingSide)
    if (!offender) return false
    // Determine if penalty (box foul)
    const inAttackingThird = state.ball.zone === 'ATT'
    let isPenalty = false
    if (inAttackingThird && state.possession !== defendingSide){
      const adv = Math.max(0, clusterAdvantageCurrent())
      const boxProb = BOX_FOUL_BASE * (1 + adv/120)
      if (Math.random() < boxProb) isPenalty = true
    }
    pushEvent('FOUL', { against: state.possession, bySide: defendingSide, offenderId: offender.id, penalty: isPenalty })
    // Potential foul injury (victim on attacking side in current zone)
    const victim = pickVictimPlayer(state.possession)
    if (victim){
      maybeInjuryFoulContext(victim)
    }
    // Card decision
    const advMag = Math.abs(clusterAdvantageCurrent())
    let yellowProb = 0.78 + Math.min(0.08, advMag/200)
    let straightRedProb = 0.03 + Math.min(0.04, advMag/300)
    // Fatigue increases recklessness
    if (offender.fatigueFlag === 'WARN') yellowProb += 0.02
    if (offender.fatigueFlag === 'CRIT') { yellowProb += 0.04; straightRedProb += 0.01 }
    let cardType = null
    if (offender.sentOff){
      // shouldn't happen
    } else if (offender.yellowCardsThisMatch >= 1){
      // Second card scenario
      if (Math.random() < yellowProb){
        cardType = 'SECOND_YELLOW'
      }
    } else {
      if (Math.random() < straightRedProb){
        cardType = 'RED'
      } else if (Math.random() < yellowProb){
        cardType = 'YELLOW'
      }
    }
    if (cardType){
      if (cardType === 'YELLOW'){
        offender.yellowCardsThisMatch = (offender.yellowCardsThisMatch||0)+1
        offender.seasonYellowCount = (offender.seasonYellowCount||0)+1
        const suspensionTrigger = offender.seasonYellowCount >= SEASON_YELLOW_THRESHOLD && !offender.suspendedNext
        if (suspensionTrigger) offender.suspendedNext = true
        pushEvent('YELLOW_CARD', { playerId: offender.id, suspensionTrigger })
      } else if (cardType === 'SECOND_YELLOW'){
        offender.yellowCardsThisMatch = 2
        offender.seasonYellowCount = (offender.seasonYellowCount||0)+1 // counts as additional yellow
        const suspensionTrigger = offender.seasonYellowCount >= SEASON_YELLOW_THRESHOLD && !offender.suspendedNext
        if (suspensionTrigger) offender.suspendedNext = true
        offender.sentOff = true
        pushEvent('RED_CARD', { playerId: offender.id, secondYellow:true, suspensionTrigger })
        onSendOff(defendingSide)
      } else if (cardType === 'RED'){
        offender.sentOff = true
        pushEvent('RED_CARD', { playerId: offender.id, straight:true })
        onSendOff(defendingSide)
      }
    }
    if (isPenalty){
      resolvePenalty()
    } else {
      // Phase 6: Resolve free kick (direct or indirect)
      resolveFreeKick({ foulZone: state.ball.zone, foulLane: state.ball.lane })
    }
    return true
  }

  function selectPenaltyTaker(side){
    const arr = side === 'HOME' ? homePitch : awayPitch
    const eligible = arr.filter(p => !p.sentOff)
    if (!eligible.length) return null
    // Prefer ST / FW roles
    const pref = eligible.filter(p => ['ST','FR','FL','FW','ATT'].some(r => p.primaryRole === r || p.role === r))
    const pool = (pref.length ? pref : eligible).slice().sort((a,b)=> (b.effectiveOverall||0)-(a.effectiveOverall||0))
    return pool[0]
  }

  function resolvePenalty(){
    pushEvent('PENALTY_AWARDED', { side: state.possession })
    const taker = selectPenaltyTaker(state.possession)
    const oppSide = state.possession === 'HOME' ? 'AWAY' : 'HOME'
    const keeper = selectPenaltyTaker(oppSide) // crude placeholder; later pick actual GK
    // Conversion probability modifications
    let conv = PENALTY_BASE
    if (taker && taker.liveStamina < 55) conv -= 0.05
    if (taker && taker.liveStamina < 40) conv -= 0.03
    conv = Math.max(0.60, Math.min(0.90, conv))
    pushEvent('PENALTY_TAKEN', { takerId: taker?.id, keeperId: keeper?.id, convProb: Number(conv.toFixed(3)) })
    const rnd = Math.random()
    if (rnd < conv){
      state.score[state.possession]++
      pushEvent('PENALTY_SCORED', { scorerSide: state.possession, scoreline: `${state.score.HOME}-${state.score.AWAY}` })
      // Kickoff to other side
      state.possession = state.possession === 'HOME' ? 'AWAY' : 'HOME'
      state.ball = { zone:'MID', lane:'CENTER', chainPasses:0 }
    } else {
      // Miss vs Save split
      if (Math.random() < 0.55) pushEvent('PENALTY_SAVED', { keeperId: keeper?.id })
      else pushEvent('PENALTY_MISSED')
      // Rebound turnover
      turnover()
    }
    // Time cost for penalty sequence
    state.clockSec += 15
  }

  function selectFreeKickTaker(side){
    // Reuse penalty taker logic for now
    return selectPenaltyTaker(side)
  }

  function resolveFreeKick({ foulZone, foulLane }){
    // Determine dangerous area: attacking zone always; later can refine with distance tiers.
    const adv = Math.max(0, clusterAdvantageCurrent())
    const dangerous = (foulZone === 'ATT')
    // Probability of attempting direct shot
    let pDirect = FK_DIRECT_BASE
    if (dangerous) pDirect += 0.15
    if (foulLane === 'CENTER') pDirect += 0.08
    pDirect += Math.min(0.12, adv/160)
    pDirect = Math.min(0.80, pDirect)
    const isDirect = Math.random() < pDirect
    const side = state.possession
    if (isDirect){
      const taker = selectFreeKickTaker(side)
      pushEvent('FREE_KICK_DIRECT', { takerId: taker?.id, pDirect: Number(pDirect.toFixed(3)) })
      // Compute xG for direct FK
      let xg = FK_DIRECT_GOAL_BASE_XG
      if (dangerous) xg += 0.03
      if (foulLane === 'CENTER') xg += 0.02
      xg += Math.min(0.03, adv/200)
      if (taker && taker.liveStamina < 55) xg -= 0.01
      xg = Math.max(0.01, Math.min(0.25, xg))
      const goal = Math.random() < xg
      if (goal){
        state.score[side]++
        pushEvent('FREE_KICK_GOAL', { takerId: taker?.id, xg: Number(xg.toFixed(3)), scoreline: `${state.score.HOME}-${state.score.AWAY}` })
        // Kickoff
        state.possession = side === 'HOME' ? 'AWAY' : 'HOME'
        state.ball = { zone:'MID', lane:'CENTER', chainPasses:0 }
      } else {
        // Saved vs Wide
        if (Math.random() < 0.55) {
          pushEvent('FREE_KICK_SAVED', { xg: Number(xg.toFixed(3)) })
          turnover()
        } else {
          pushEvent('FREE_KICK_WIDE', { xg: Number(xg.toFixed(3)) })
          turnover()
        }
      }
      // Time cost
      state.clockSec += 10
    } else {
      // Indirect sequence – treat as set-piece leading to possession in ATT with boosted chainPasses
      pushEvent('FREE_KICK_INDIRECT_SEQUENCE', { pDirect: Number(pDirect.toFixed(3)) })
      state.ball.zone = 'ATT'
      state.ball.chainPasses = 1 + (Math.random()<0.35 ? 1:0)
      // Slight chance immediate headed SHOT attempt
      if (Math.random() < 0.18){
        attemptShot()
      }
      state.clockSec += 8
    }
  }

  // ---- Phase 7: Injuries (foul-based & non-contact) ----
  function fatigueInjuryMultiplier(st){
    if (st >= 70) return 1.0
    if (st >= 60) return 1.15
    if (st >= 50) return 1.35
    if (st >= 40) return 1.60
    return 1.95
  }
  function ageStressBonus(age){
    if (age >= 35) return 0.20
    if (age >= 32) return 0.10
    return 0
  }
  function medicalMitigation(player){
    // Placeholder: use conditioning staminaRecoveryMult >1 as proxy
    const teamSide = homePitch.includes(player) ? 'HOME' : 'AWAY'
    const staff = teamSide === 'HOME' ? homeStaff : awayStaff
    const condMult = staff.conditioning?.staminaRecoveryMult || 1
    // If >1, provide mitigation up to 18%
    return Math.min(0.18, Math.max(0, (condMult - 1)*0.4))
  }
  function finalInjuryProbability(base, player){
    const st = player.liveStamina ?? 100
    let mult = fatigueInjuryMultiplier(st)
    mult += ageStressBonus(player.age || 27)
    const mitigation = medicalMitigation(player)
    return base * mult * (1 - mitigation)
  }
  function rollSeverity(player){
    // Distribution before mitigation: Light 50, Minor 25, Moderate 17, Severe 8
    // Medical mitigation shifts one step lighter with probability proportional to mitigation*1.3 (cap 45%).
    const mitigation = medicalMitigation(player)
    const shiftProb = Math.min(0.45, mitigation * 1.3)
    let rnd = Math.random()
    let bucket
    if (rnd < 0.50) bucket = 'LIGHT'
    else if (rnd < 0.75) bucket = 'MINOR'
    else if (rnd < 0.92) bucket = 'MODERATE'
    else bucket = 'SEVERE'
    if (bucket !== 'LIGHT' && Math.random() < shiftProb){
      // shift one step lighter
      if (bucket === 'MINOR') bucket = 'LIGHT'
      else if (bucket === 'MODERATE') bucket = 'MINOR'
      else if (bucket === 'SEVERE') bucket = 'MODERATE'
    }
    // Weeks out mapping
    let weeks = 0
    if (bucket === 'MINOR') weeks = 1 + Math.floor(Math.random()*2) //1-2
    else if (bucket === 'MODERATE') weeks = 3 + Math.floor(Math.random()*4) //3-6
    else if (bucket === 'SEVERE') weeks = 8 + Math.floor(Math.random()*13) //8-20
    return { severity: bucket, weeks }
  }
  function registerInjury(player, context){
    if (player.injury) return // Already injured this match
    const sev = rollSeverity(player)
    player.injury = { matchTime: state.clockSec, type: context.type, severity: sev.severity, weeks: sev.weeks }
    // Remove from pitch (forced substitution placeholder) -> mark inactive & recompute clusters
    player.injuredOut = true
    pushEvent('INJURY', { playerId: player.id, type: context.type, severity: sev.severity, weeks: sev.weeks })
    // Remove from active pitch arrays
    function filterPitch(arr){ return arr.filter(p => !p.injuredOut && !p.sentOff) }
    // We don't mutate original arrays in place for iteration safety; reassign
    if (homePitch.includes(player)){
      for (let i = homePitch.length -1; i >=0; i--) if (homePitch[i].injuredOut) homePitch.splice(i,1)
    } else if (awayPitch.includes(player)) {
      for (let i = awayPitch.length -1; i >=0; i--) if (awayPitch[i].injuredOut) awayPitch.splice(i,1)
    }
    clusters = computeAllClusters(homeTeam, awayTeam)
  }
  function maybeInjuryFoulContext(victim){
    const prob = finalInjuryProbability(FOUL_BASE_INJURY, victim)
    if (Math.random() < prob){
      registerInjury(victim, { type:'FOUL' })
    }
  }
  function pickVictimPlayer(attackingSide){
    const arr = attackingSide === 'HOME' ? homePitch : awayPitch
    if (!arr.length) return null
    // Prefer players in current zone
    const inZone = arr.filter(p => p.zone === state.ball.zone && !p.injury && !p.sentOff)
    const pool = inZone.length ? inZone : arr.filter(p => !p.injury && !p.sentOff)
    if (!pool.length) return null
    return pool[Math.floor(Math.random()*pool.length)]
  }
  let nextPeriodicInjuryCheck = INJURY_PERIODIC_CHECK_SEC
  function periodicNonContactInjuryCheck(){
    if (state.clockSec < nextPeriodicInjuryCheck) return
    while (state.clockSec >= nextPeriodicInjuryCheck) nextPeriodicInjuryCheck += INJURY_PERIODIC_CHECK_SEC
    function scan(arr){
      for (const p of arr){
        if (p.injury || p.sentOff) continue
        const st = p.liveStamina ?? 100
        if (st >= 60) continue
        const prob = finalInjuryProbability(NON_CONTACT_BASE, p)
        if (Math.random() < prob){
          registerInjury(p, { type:'NON_CONTACT' })
        }
      }
    }
    scan(homePitch)
    scan(awayPitch)
  }

  // Apply any scheduled tactic changes whose time has arrived (minute-based schedule)
  function applyScheduledTacticChanges(){
    for (const item of tacticChangeQueue){
      if (item.applied) continue
      if (state.clockSec >= item.atSec){
        const side = item.side
        if (!tacticState[side]) continue
        Object.assign(tacticState[side], item.changes)
        // Formation change handling
        if (item.changes.formation){
          if (side === 'HOME') homeTeam.formation = item.changes.formation
          else awayTeam.formation = item.changes.formation
          annotatePlayersWithSpatial(side === 'HOME' ? homeTeam : awayTeam)
          clusters = computeAllClusters(homeTeam, awayTeam)
        }
        pushEvent('TACTIC_CHANGE', { side, changes: item.changes })
        item.applied = true
      }
    }
  }

  // ---- Phase 8: Substitutions (5 subs / 3 windows excluding HT) ----
  const SUB_RULES = { maxSubs:5, maxWindows:3 }
  const subState = {
    HOME: { subsUsed:0, windowsUsed:0, pending:[] },
    AWAY: { subsUsed:0, windowsUsed:0, pending:[] }
  }

  function benchPlayers(side){
    const team = side === 'HOME' ? homeTeam : awayTeam
    const pitch = side === 'HOME' ? homePitch : awayPitch
    return team.players.filter(p => !pitch.includes(p) && !p.sentOff && !p.injury)
  }
  function subsRemaining(side){ return SUB_RULES.maxSubs - subState[side].subsUsed }
  function windowsRemaining(side){ return SUB_RULES.maxWindows - subState[side].windowsUsed }
  function canOpenWindow(side, isHalfTime){
    if (subState[side].subsUsed >= SUB_RULES.maxSubs) return false
    if (isHalfTime) return true
    return subState[side].windowsUsed < SUB_RULES.maxWindows
  }
  function addPendingSub(side, outId, inId, reason){
    if (subsRemaining(side) <= 0) return false
    const already = subState[side].pending.find(s => s.outId === outId || s.inId === inId)
    if (already) return false
    subState[side].pending.push({ outId, inId, reason })
    return true
  }
  function findOnPitchById(side, id){
    const pitch = side === 'HOME' ? homePitch : awayPitch
    return pitch.find(p => p.id === id)
  }
  function roleMatchScore(benchPlayer, target){
    const role = target.primaryRole || target.role
    if (!role) return 0
    let score = 0
    if (benchPlayer.primaryRole === role) score += 3
    if (benchPlayer.role === role) score += 2
    return score
  }
  function pickReplacement(side, target){
    const bench = benchPlayers(side)
    if (!bench.length) return null
    const scored = bench.map(p => ({ p, score: roleMatchScore(p, target), overall: p.overall||p.baseOverall||50 }))
    scored.sort((a,b)=> b.score - a.score || b.overall - a.overall)
    return scored[0].p
  }
  function queueForcedInjurySubs(){
    // If injury removed player leaves hole, attempt immediate replacement (same stoppage)
    ;['HOME','AWAY'].forEach(side => {
      const pitch = side === 'HOME' ? homePitch : awayPitch
      // Injury removal already happened; we only act if any slot count <11 and we have bench
      if (pitch.length < 11 && benchPlayers(side).length){
        // Choose most impacted zone/lane or simply pick best CRIT bench candidate
        // We just use placeholder: replace highest overall bench
        const bench = benchPlayers(side).slice().sort((a,b)=> (b.overall||0)-(a.overall||0))
        const incoming = bench[0]
        if (incoming){
          addPendingSub(side, null, incoming.id, 'INJURY_FORCED')
        }
      }
    })
  }
  function autoSuggestFatigueSubs(){
    ;['HOME','AWAY'].forEach(side => {
      if (subsRemaining(side) <= 0) return
      // Only start fatigue subs after 45' (second half) or if player critically low earlier
      const afterMinute = state.clockSec >= 45*60
      const pitch = side === 'HOME' ? homePitch : awayPitch
      const critPlayers = pitch.filter(p => p.fatigueFlag === 'CRIT' && !p.injury && !p.sentOff)
      const warnPlayers = pitch.filter(p => p.fatigueFlag === 'WARN' && !p.injury && !p.sentOff)
      if (!critPlayers.length && !(afterMinute && warnPlayers.length)) return
      // Order by lowest stamina first
      critPlayers.sort((a,b)=> (a.liveStamina||0)-(b.liveStamina||0))
      warnPlayers.sort((a,b)=> (a.liveStamina||0)-(b.liveStamina||0))
      const candidates = [...critPlayers, ...warnPlayers]
      for (const target of candidates){
        if (subsRemaining(side) <= 0) break
        const replacement = pickReplacement(side, target)
        if (!replacement) continue
        // Avoid replacing someone just entered (heuristic: replacement has liveStamina near 100 while target < 70)
        if (target.liveStamina != null && target.liveStamina > 70) continue
        addPendingSub(side, target.id, replacement.id, target.injury ? 'INJURY_FORCED':'FATIGUE_AUTO')
        // Limit 2 fatigue subs per window to avoid mass changes
        if (subState[side].pending.filter(p=> p.reason.startsWith('FATIGUE')).length >= 2) break
      }
    })
  }
  function executePendingSubs(isHalfTime, contextType){
    ['HOME','AWAY'].forEach(side => {
      const stateSide = subState[side]
      if (!stateSide.pending.length) return
      if (!canOpenWindow(side, isHalfTime)) { stateSide.pending = []; return }
      const pitch = side === 'HOME' ? homePitch : awayPitch
      const staff = side === 'HOME' ? homeStaff : awayStaff
      const executed = []
      for (const req of stateSide.pending){
        if (subsRemaining(side) <= 0) break
        // Find outgoing
        let outPlayer = req.outId ? findOnPitchById(side, req.outId) : null
        if (!outPlayer && req.outId){
          continue // specified out not found
        }
        if (!outPlayer && req.outId == null){
          // Injury forced w/out identified: choose worst stamina player
            outPlayer = pitch.slice().sort((a,b)=> (a.liveStamina||100)-(b.liveStamina||100))[0]
        }
        const team = side === 'HOME' ? homeTeam : awayTeam
        const incoming = team.players.find(p => p.id === req.inId && !p.injury && !p.sentOff && !pitch.includes(p))
        if (!incoming) continue
        // Perform substitution
        incoming.liveStamina = incoming.liveStamina ?? 100
        incoming.fatigueFlag = staminaFlag(incoming.liveStamina)
        incoming.effectiveOverall = computeEffectiveOverall(incoming, staff)
        if (outPlayer){
          const idx = pitch.indexOf(outPlayer)
          if (idx >= 0) pitch.splice(idx,1)
        }
        pitch.push(incoming)
        executed.push({ outId: outPlayer?.id || null, inId: incoming.id, reason: req.reason })
        stateSide.subsUsed++
        if (stateSide.subsUsed >= SUB_RULES.maxSubs) break
      }
      if (executed.length){
        if (!isHalfTime) stateSide.windowsUsed++
        pushEvent('SUB_WINDOW_START', { side, count: executed.length, context: contextType, windowsUsed: stateSide.windowsUsed, subsUsed: stateSide.subsUsed })
        executed.forEach(ex => pushEvent('SUBSTITUTION', { side, outId: ex.outId, inId: ex.inId, reason: ex.reason }))
        // Recompute clusters after changes
        clusters = computeAllClusters(homeTeam, awayTeam)
      }
      stateSide.pending = []
    })
  }
  function processSubstitutions(isHalfTime, contextType){
    // Queue forced injury replacements first
    queueForcedInjurySubs()
    autoSuggestFatigueSubs()
    executePendingSubs(isHalfTime, contextType)
  }

  // Main simulation loop
  let guard = 0
  while (state.clockSec < MATCH_DURATION && guard < MAX_EVENTS){
    guard++
    // Half-time check
    if (state.half === 1 && state.clockSec >= HALF_DURATION){
      pushEvent('HALF_TIME')
      state.half = 2
      // Halftime recovery
      homePitch.forEach(p => halftimeRecovery(p,'HOME'))
      awayPitch.forEach(p => halftimeRecovery(p,'AWAY'))
      recomputeEffectiveOnPitch()
      // Halftime substitution window (does not consume window count)
      processSubstitutions(true, 'HALF_TIME')
      // Kickoff second half: possession alternates
      state.possession = state.possession === 'HOME' ? 'AWAY' : 'HOME'
      state.ball = { zone:'MID', lane:'CENTER', chainPasses:0 }
    }

    // Decide action sequence
    let actionType = null
    if (shotIntent()) {
      actionType = 'SHOT'
      attemptShot()
    } else {
      // Choose between advance or circulation pass
      if (state.ball.zone === 'ATT') {
        actionType = 'PASS'
        attemptPass(false) // success continues chain
      } else {
        actionType = 'ADVANCE'
        attemptAdvance()
      }
    }
    // After action, attempt foul generation (Phase 5)
    maybeFoul({ afterAction:true, actionType })
    // Substitution processing at stoppage: detect last event types that represent a stoppage
    const lastType = state.events[state.events.length-1]?.type
    if (['GOAL','INJURY','FOUL','RED_CARD','TURNOVER','PENALTY_SCORED','PENALTY_SAVED','PENALTY_MISSED','FREE_KICK_GOAL','FREE_KICK_SAVED','FREE_KICK_WIDE'].includes(lastType)){
      processSubstitutions(false, lastType)
    }

    // Advance virtual time by action delay
    const delta = actionDelaySec()
    state.clockSec += delta
    // Insert any crossed 5-min summaries
    while (state.clockSec >= nextSummarySec && nextSummarySec < MATCH_DURATION){
      pushPeriodSummary(nextSummarySec)
      nextSummarySec += 5*60
    }
    // Stamina decay application
    applyStaminaDecay(delta)
    // Recompute effective overalls periodically (every ~60 virtual sec or when many events) -> simple mod check
    if (state.clockSec % 60 < delta){
      recomputeEffectiveOnPitch()
    }
    // Phase 7: periodic non-contact injury checks
    periodicNonContactInjuryCheck()
    // Phase 9: apply scheduled tactic changes if any due
    applyScheduledTacticChanges()
  }
  if (state.clockSec >= MATCH_DURATION) {
    pushEvent('FULL_TIME')
  } else {
    // Safety termination
    pushEvent('FULL_TIME_GUARD')
  }

  const homeGoals = state.score.HOME
  const awayGoals = state.score.AWAY
  let homePts = 0, awayPts = 0
  if (homeGoals > awayGoals) homePts = 3
  else if (awayGoals > homeGoals) awayPts = 3
  else homePts = awayPts = 1

  return { homeGoals, awayGoals, homePts, awayPts, events: state.events, debug: { clusters } }
}

export function applyResultToTable(table, homeName, awayName, res) {
  const h = table[homeName]
  const a = table[awayName]
  h.p += 1; a.p += 1
  h.gf += res.homeGoals; h.ga += res.awayGoals; h.gd = h.gf - h.ga
  a.gf += res.awayGoals; a.ga += res.homeGoals; a.gd = a.gf - a.ga
  h.pts += res.homePts; a.pts += res.awayPts
  if (res.homePts === 3) { h.w += 1; a.l += 1 }
  else if (res.awayPts === 3) { a.w += 1; h.l += 1 }
  else { h.d += 1; a.d += 1 }
}

export function simulateWeek(state) {
  const { league, teams } = state
  const weekIndex = (league.week - 1)
  const fixtures = league.fixtures[weekIndex]
  if (!fixtures || !fixtures.length) return state // nothing to simulate

  const teamByName = Object.fromEntries(teams.map(t => [t.name, t]))

  const results = []
  fixtures.forEach(({ home, away }) => {
    const res = simulateMatch(teamByName[home], teamByName[away])
    results.push({ week: league.week, home, away, homeGoals: res.homeGoals, awayGoals: res.awayGoals })
    applyResultToTable(league.table, home, away, res)
  })

  const newResults = [...(league.results || []), ...results]
  const matchesPlayed = (league.seasonStats?.matchesPlayed || 0) + fixtures.length
  const totalGoals = (league.seasonStats?.totalGoals || 0) + results.reduce((s, r) => s + r.homeGoals + r.awayGoals, 0)
  const avgGoalsPerGame = matchesPlayed ? Number((totalGoals / matchesPlayed).toFixed(2)) : 0

  const newLeague = {
    ...league,
    week: league.week + 1,
    currentViewWeek: weekIndex + 1,
    results: newResults,
    seasonStats: {
      ...league.seasonStats,
      matchesPlayed,
      totalGoals,
      avgGoalsPerGame,
    },
  }

  return { nextState: { ...state, league: newLeague }, weekResults: results }
}

// ---- Streaming / Incremental Simulation Support (Path A) ----
// createMatchRuntime: builds a match runtime that can be advanced step-by-step for live UI rendering.
// NOTE: This duplicates core logic from simulateMatch; keep changes in sync (future refactor could unify).
export function createMatchRuntime(homeTeamOriginal, awayTeamOriginal, options = {}) {
  // Clone shallow to avoid mutating original references (players mutated for stamina etc.)
  const homeTeam = { ...homeTeamOriginal, players: homeTeamOriginal.players.map(p => ({ ...p })) }
  const awayTeam = { ...awayTeamOriginal, players: awayTeamOriginal.players.map(p => ({ ...p })) }
  annotatePlayersWithSpatial(homeTeam)
  annotatePlayersWithSpatial(awayTeam)
  computeTeamEffective(homeTeam)
  computeTeamEffective(awayTeam)
  let clusters = computeAllClusters(homeTeam, awayTeam)

  const defaultTactic = { pressing:0.5, tempo:0.5, width:0.5, verticality:0.5 }
  const tacticState = {
    HOME: { ...defaultTactic, ...(options.tactics?.HOME || {}) },
    AWAY: { ...defaultTactic, ...(options.tactics?.AWAY || {}) }
  }
  if (options.tactics?.HOME?.formation) homeTeam.formation = options.tactics.HOME.formation
  if (options.tactics?.AWAY?.formation) awayTeam.formation = options.tactics.AWAY.formation
  annotatePlayersWithSpatial(homeTeam)
  annotatePlayersWithSpatial(awayTeam)
  clusters = computeAllClusters(homeTeam, awayTeam)
  const tacticChangeQueue = (options.tacticChanges || []).map(ch => ({ ...ch, atSec: (ch.atMinute ?? 0) * 60, applied:false }))
  const verbosity = options.verbosity || 'normal' // 'high' | 'normal' | 'low'

  const homeStaff = normalizeSpecialistStaff(homeTeam.finances?.specialistStaff)
  const awayStaff = normalizeSpecialistStaff(awayTeam.finances?.specialistStaff)
  function pickPitchPlayers(team){
    const starters = team.players.filter(p => p.starting && p.slot)
    if (starters.length) return starters
    return team.players.slice().sort((a,b)=> (b.overall||0)-(a.overall||0)).slice(0,11)
  }
  const homePitch = pickPitchPlayers(homeTeam)
  const awayPitch = pickPitchPlayers(awayTeam)
  function staminaFlag(st){ if (st < 55) return 'CRIT'; if (st < 70) return 'WARN'; return 'OK' }
  function initLive(p){ if (p.liveStamina == null) p.liveStamina = 100; p.fatigueFlag = staminaFlag(p.liveStamina) }
  homePitch.forEach(initLive); awayPitch.forEach(initLive)
  const BASE_DECAY_PER_MIN = 0.55
  const HALFTIME_RECOVERY = 8
  function getPressing(side){ return tacticState[side].pressing }
  function getTempo(side){ return tacticState[side].tempo }
  function getVerticality(side){ return tacticState[side].verticality }
  function getWidth(side){ return tacticState[side].width }
  function roleLoad(player){ const r = player.primaryRole || player.role || (player.slot && player.slot.role); return ROLE_LOAD[r] || 1 }
  function decayPerSecond(player, side){
    const staff = side === 'HOME' ? homeStaff : awayStaff
    const pressingIntensity = getPressing(side)
    const tempo = getTempo(side)
    const load = roleLoad(player)
    const pressingFactor = 1 + pressingIntensity * 0.35
    const tempoFactor = 1 + (tempo - 0.5) * 0.10
    const ageMult = player.ageDecayMult || ageDecayMult(player.age || 27)
    const fitnessMult = staff.fitness?.staminaDecayMult ?? 1
    let perMin = BASE_DECAY_PER_MIN * load * pressingFactor * tempoFactor * ageMult * fitnessMult
    // Early-phase damping: first 5' very mild, up to 15' slightly reduced to avoid instant WARN flags
    if (state.clockSec < 5*60) perMin *= 0.70
    else if (state.clockSec < 15*60) perMin *= 0.85
    return perMin / 60
  }
  function halftimeRecovery(player, side){
    const staff = side === 'HOME' ? homeStaff : awayStaff
    const ageRec = player.ageRecoveryFactor || ageRecoveryFactor(player.age || 27)
    const rec = HALFTIME_RECOVERY * (staff.conditioning?.staminaRecoveryMult || 1) * ageRec
    player.liveStamina = Math.min(100, player.liveStamina + rec)
  }
  function recomputeEffectiveOnPitch(){
    function recalc(arr, staff){ arr.forEach(p => { p.effectiveOverall = computeEffectiveOverall(p, staff) }) }
    recalc(homePitch, homeStaff); recalc(awayPitch, awayStaff)
  }
  function applyStaminaDecay(deltaSec){
    function updateGroup(arr, side){
      for (const p of arr){
        const before = p.liveStamina
        if (before <= 0) continue
        p.liveStamina = Math.max(0, before - decayPerSecond(p, side) * deltaSec)
        // Do not let stamina visibly drop too early to avoid immediate warning perception
        if (state.clockSec < 120 && p.liveStamina < 95) p.liveStamina = 95
        const nf = staminaFlag(p.liveStamina)
        if (nf !== p.fatigueFlag){
          if ((p.fatigueFlag === 'OK' && nf === 'WARN') || (p.fatigueFlag !== 'CRIT' && nf === 'CRIT')){
            pushEvent('FATIGUE_ALERT', { playerId: p.id, newFlag: nf })
          }
          p.fatigueFlag = nf
        }
      }
    }
    updateGroup(homePitch,'HOME'); updateGroup(awayPitch,'AWAY')
  }
  const state = { clockSec:0, half:1, events:[], score:{ HOME:0, AWAY:0 }, possession: Math.random()<0.5?'HOME':'AWAY', ball:{ zone:'MID', lane:'CENTER', chainPasses:0 }, done:false }
  const HALF_DURATION = 45*60
  const MATCH_DURATION = 90*60
  const MAX_EVENTS = 650
  const HOME_NAME = homeTeam.name || 'Home'
  const AWAY_NAME = awayTeam.name || 'Away'
  const KEY_EVENT_TYPES = new Set(['GOAL','PENALTY_SCORED','PENALTY_SAVED','PENALTY_MISSED','FREE_KICK_GOAL','RED_CARD','INJURY','SUBSTITUTION','TACTIC_CHANGE','SHOT_SAVED'])
  function formatClock(sec){ const m = Math.floor(sec/60); return `${m}'` }
  function advantageDescriptor(lane, adv){
    if (Math.abs(adv) < 28) return null
    const side = adv>0 ? (state.possession==='HOME'?HOME_NAME:AWAY_NAME) : (state.possession==='HOME'?AWAY_NAME:HOME_NAME)
    const dir = lane==='LEFT'?'left flank': (lane==='RIGHT'?'right flank':'central channel')
    if (Math.abs(adv) > 55) return `${side} utterly dominate the ${dir}.`
    if (Math.abs(adv) > 40) return `${side} gaining sustained control on the ${dir}.`
    return `${side} finding space in the ${dir}.`
  }
  function goalPhrase(prevHome, prevAway, newHome, newAway, scorerSide){
    const scoringName = scorerSide==='HOME'? HOME_NAME: AWAY_NAME
    const otherName = scorerSide==='HOME'? AWAY_NAME: HOME_NAME
    const beforeDiff = prevHome - prevAway
    const afterDiff = newHome - newAway
    const wasBehind = (scorerSide==='HOME'? beforeDiff<0: beforeDiff>0)
    const wasLevel = beforeDiff === 0
    const nowLevel = afterDiff === 0
    const nowAhead = (scorerSide==='HOME'? afterDiff>0: afterDiff<0)
    const extendedLead = (scorerSide==='HOME'? beforeDiff>0 && afterDiff>beforeDiff : beforeDiff<0 && afterDiff<beforeDiff)
    if (wasLevel && nowAhead) return `${scoringName} take the lead (${newHome}-${newAway}).`
    if (wasBehind && nowLevel) return `${scoringName} equalise (${newHome}-${newAway}).`
    if (wasBehind && nowAhead) return `${scoringName} complete the turnaround (${newHome}-${newAway}).`
    if (extendedLead) return `${scoringName} extend the lead (${newHome}-${newAway}).`
    if (!wasBehind && nowLevel) return `${otherName} are pegged back (${newHome}-${newAway}).`
    if (wasBehind && !nowLevel && !nowAhead) return `${scoringName} pull one back (${newHome}-${newAway}).`
    return `Goal for ${scoringName}! (${newHome}-${newAway}).`
  }
  function passPhrase(success, passerName, receiverName, interceptedBy){
    if (success && passerName && receiverName) return `${passerName} passes to ${receiverName}.`
    if (success && passerName) return `${passerName} completes a pass.`
    if (!success && interceptedBy && passerName) return `${interceptedBy} wins it from ${passerName}.`
    if (!success && passerName) return `${passerName} gives it away.`
    return `Pass attempted.`
  }
  function advancePhrase(success, dribbler){
    if (success && dribbler) return `${dribbler} drives forward.`
    if (!success && dribbler) return `${dribbler} is stopped.`
    return success? 'Progress made.' : 'Advance halted.'
  }
  function shotPhrase(goal, shooter, xg, saved, keeper){
    if (goal && shooter) return `${shooter} scores (xG ${xg}).`
    if (saved && shooter && keeper) return `${keeper} saves from ${shooter} (xG ${xg}).`
    if (shooter) return `${shooter} shoots (xG ${xg}).`
    return `Shot (xG ${xg}).`
  }
  function foulPhrase(offenderName, victimName, isPenalty){
    if (isPenalty) return `${offenderName} fouls ${victimName}: penalty!`
    return `${offenderName} fouls ${victimName}.`
  }
  function cardPhrase(type, playerName){
    if (type==='YELLOW_CARD') return `${playerName} booked.`
    return `${playerName} sent off!`
  }
  function commentaryFor(type, base){
    switch(type){
      case 'GOAL': return base.goalPhrase || goalPhrase(base.prevHome, base.prevAway, base.newHome, base.newAway, base.scorerSide)
      case 'PENALTY_AWARDED': return `Penalty to ${(state.possession==='HOME')?HOME_NAME:AWAY_NAME}!`
      case 'PENALTY_SCORED': return `Converted! ${(base.scorerSide==='HOME')?HOME_NAME:AWAY_NAME} score from the spot (${base.scoreline}).`
      case 'PENALTY_SAVED': return `Penalty saved! Keeper comes up big.`
      case 'PENALTY_MISSED': return `Penalty missed! A huge let off.`
      case 'FREE_KICK_GOAL': return `Brilliant free kick! Curled in with style.`
      case 'FREE_KICK_SAVED': return `Free kick on target but saved.`
      case 'FREE_KICK_WIDE': return `Free kick drifts wide.`
      case 'YELLOW_CARD': return `Booking issued.`
      case 'RED_CARD': return `Red card! Advantage ${(base.side==='HOME')?AWAY_NAME:HOME_NAME}.`
      case 'INJURY': return `Injury stoppage; player down (severity ${base.severity}).`
      case 'SUBSTITUTION': return `Substitution: ${(base.side==='HOME')?HOME_NAME:AWAY_NAME} fresh legs on.`
      case 'TACTIC_CHANGE': return `Tactical adjustment by ${(base.side==='HOME')?HOME_NAME:AWAY_NAME}.`
      default: return null
    }
  }
  function pushEvent(type, data={}){
    const evt = { id: state.events.length+1, t: state.clockSec, half: state.half, type, possession: state.possession, zone: state.ball.zone, lane: state.ball.lane, ...data }
    if (!evt.commentary){ const c = commentaryFor(type, evt); if (c) evt.commentary = c }
    if (KEY_EVENT_TYPES.has(type)) evt.isKey = true
    state.events.push(evt)
    return evt
  }
  // --- Kickoff initialization (ensure immediate visible ball holder & timeline entry) ---
  if (!state.initializedKickoff){
    const kickoffAttacker = pickAttacker(state.possession)
    if (kickoffAttacker){
      state.ballHolder = kickoffAttacker.id
      // Provide a clear commentary line so timeline is not empty for first seconds
      pushEvent('KICKOFF',{ holderId: kickoffAttacker.id, commentary: `Kickoff: ${(state.possession==='HOME'? HOME_NAME: AWAY_NAME)} get us underway.` })
    } else {
      // Fallback: still emit kickoff event
      pushEvent('KICKOFF',{ commentary: 'Kickoff.' })
    }
    state.initializedKickoff = true
  }
  function clusterAdvantageCurrent(){ const key = `${state.ball.zone}_${state.ball.lane}`; const c = clusters[key]||{homeRating:0,awayRating:0}; return state.possession==='HOME' ? (c.homeRating - c.awayRating):(c.awayRating - c.homeRating) }
  function actionDelaySec(){
    // Task 41 (A) – Extended pacing & adaptive sparsity
    // New base range: 8–16s (previously 7–14)
    // Tempo scaling formula per design: effectiveDelay = base * (1 - 0.22*(tempo-0.5))
    // Adaptive sparsity: if too many routine events (PASS/ADVANCE) in last 60s, inflate next delay +10% (one-shot)
    // Key event snap: if last event was a key event (goal, card, injury, substitution, tactic change, penalty/fk goal) cap immediate next delay to max 6s (min 4)
    let base = 8 + Math.floor(Math.random()*9) // 8..16
    const tempo = getTempo(state.possession)
    const tempoFactor = 1 - 0.22 * (tempo - 0.5)
    base *= tempoFactor

    // Count routine events (PASS & ADVANCE) inside last 60 virtual seconds
    const now = state.clockSec
    let routineCount = 0
    for (let i = state.events.length - 1; i >= 0; i--) {
      const ev = state.events[i]
      if (now - ev.t > 60) break
      if (ev.type === 'PASS' || ev.type === 'ADVANCE') routineCount++
    }
    const ROUTINE_BURST_THRESHOLD = 8
    if (routineCount > ROUTINE_BURST_THRESHOLD) base *= 1.10 // gentle expansion

    // If previous event is key, keep momentum by snapping upper bound lower
    const lastEv = state.events[state.events.length-1]
    if (lastEv && KEY_EVENT_TYPES.has(lastEv.type)) {
      if (base > 6) base = 4 + (base%3) // produce 4–6-ish variation
    }

    if (base < 4) base = 4
    return Math.round(base)
  }
  function shouldLogRoutine(){
    if (verbosity === 'high') return true
    if (verbosity === 'normal') return Math.random() < 0.5
    return Math.random() < 0.25 // low verbosity
  }
  function pickAttacker(side){
    const pitch = side==='HOME'? homePitch:awayPitch
    // weight by effectiveOverall
    const arr = pitch.filter(p=> !p.sentOff && !p.injury)
    if (!arr.length) return null
    const total = arr.reduce((s,p)=> s + (p.effectiveOverall||p.overall||50),0)
    let r = Math.random()*total
    for (const p of arr){ r -= (p.effectiveOverall||p.overall||50); if (r<=0) return p }
    return arr[0]
  }
  function pickDefender(side){
    const pitch = side==='HOME'? homePitch:awayPitch
    const arr = pitch.filter(p=> !p.sentOff && !p.injury)
    if (!arr.length) return null
    return arr[Math.floor(Math.random()*arr.length)]
  }
  function attemptPass(isForwardMiss){
    const adv = clusterAdvantageCurrent();
    let pPass = passSuccessFromAdv(adv)*(isForwardMiss?0.92:1);
    const vert = getVerticality(state.possession);
    pPass *= (1 - (vert - 0.5)*0.12);
    pPass = Math.min(0.98, Math.max(0.08,pPass));
    const passer = pickAttacker(state.possession)
    const receiver = pickAttacker(state.possession)
    const defender = pickDefender(state.possession==='HOME'? 'AWAY':'HOME')
    const success = Math.random()<pPass
    if (success){
      state.ball.chainPasses++;
      state.ballHolder = receiver?.id || passer?.id;
      if (shouldLogRoutine()) {
        pushEvent('PASS',{
          success,
            passerId: passer?.id,
            receiverId: receiver?.id,
            commentary: passer? passPhrase(true, passer.name, receiver?.name, null): undefined
        })
      }
      return true
    }
    // failure always logged
    pushEvent('PASS',{
      success:false,
      passerId: passer?.id,
      defenderId: defender?.id,
      commentary: passer? passPhrase(false, passer.name, null, defender?.name): undefined
    })
    turnover();
    return false
  }
  function attemptAdvance(){
    const adv = clusterAdvantageCurrent();
    let pAdvance = advanceProbFromAdv(adv);
    const vert = getVerticality(state.possession);
    pAdvance *= (1 + (vert - 0.5)*0.35);
    pAdvance = Math.min(0.95, Math.max(0.05,pAdvance));
    const dribbler = pickAttacker(state.possession)
    if (Math.random()<pAdvance){
      if (state.ball.zone==='DEF') state.ball.zone='MID'; else if (state.ball.zone==='MID') state.ball.zone='ATT'; else if (state.ball.zone==='ATT'){ let shiftProb=0.35; const width=getWidth(state.possession); shiftProb*=(1+(width-0.5)*0.6); if (Math.random()<shiftProb){ if (state.ball.lane==='CENTER') state.ball.lane=Math.random()<0.5?'LEFT':'RIGHT'; else state.ball.lane='CENTER' } }
      state.ball.chainPasses++;
      state.ballHolder = dribbler?.id;
  if (shouldLogRoutine()) pushEvent('ADVANCE',{ success:true, playerId: dribbler?.id, commentary: dribbler? advancePhrase(true, dribbler.name, state.ball.lane, state.ball.zone): undefined });
      if (Math.random()<0.08){ const key = `${state.ball.zone}_${state.ball.lane}`; const c=clusters[key]; if (c){ const localAdv = state.possession==='HOME'? (c.homeRating-c.awayRating):(c.awayRating-c.homeRating); const note=advantageDescriptor(state.ball.lane, localAdv); if (note) pushEvent('ADVANTAGE_NOTE',{note}) } }
      return true
    } else {
      // Failed advance logged with higher chance; in low verbosity still show most failures
      if (verbosity==='high' || Math.random()< (verbosity==='normal'?0.7:0.9)) {
        pushEvent('ADVANCE',{ success:false, playerId: dribbler?.id, commentary: dribbler? advancePhrase(false, dribbler.name, state.ball.lane, state.ball.zone): undefined })
      }
      return attemptPass(true)
    }
  }
  function turnover(){ pushEvent('TURNOVER'); state.possession = state.possession==='HOME'?'AWAY':'HOME'; if (state.ball.zone==='ATT') state.ball.zone='MID'; else if (state.ball.zone==='MID' && Math.random()<0.4) state.ball.zone='DEF'; state.ball.lane='CENTER'; state.ball.chainPasses=0; state.ballHolder=null }
  function shotIntent(){ if (state.ball.zone!=='ATT') return false; const adv=clusterAdvantageCurrent(); let base=0.18; base *= (1 + (getVerticality(state.possession)-0.5)*0.5); const chainBoost = Math.min(0.12, state.ball.chainPasses*0.03); const advBoost=(1/(1+Math.exp(-(adv/18))))*0.20; const pShot=Math.min(0.60, base + chainBoost + advBoost); return Math.random()<pShot }
  function attemptShot(){
    const shooter = pickAttacker(state.possession)
    const adv=clusterAdvantageCurrent();
    let baseXg = state.ball.lane==='CENTER'?0.09:0.06; 
    baseXg += Math.min(0.03, state.ball.chainPasses*0.01); 
    if (adv>0) baseXg += Math.min(0.04,adv/150); else baseXg += adv/300; 
    let xg = Math.max(0.01, Math.min(0.55, baseXg)); 
    const goal = Math.random()<xg;
    if (goal){
      pushEvent('SHOT',{ xg:Number(xg.toFixed(3)), goal:true, shooterId: shooter?.id, commentary: shooter? shotPhrase(true, shooter.name, Number(xg.toFixed(2))): undefined });
      const prevHome=state.score.HOME, prevAway=state.score.AWAY
      state.score[state.possession]++;
      const newHome=state.score.HOME, newAway=state.score.AWAY
      const phrase = goalPhrase(prevHome, prevAway, newHome, newAway, state.possession)
      pushEvent('GOAL',{ scorerSide: state.possession, scorerId: shooter?.id, scoreline:`${state.score.HOME}-${state.score.AWAY}`, prevHome, prevAway, newHome, newAway, goalPhrase: phrase, commentary: shooter? `${phrase.replace('Gol!', 'Gol!')} (${shooter.name})`: phrase });
      // Switch possession (conceding team restarts) and create immediate restart kickoff with holder
      state.possession = state.possession==='HOME'?'AWAY':'HOME';
      state.ball={zone:'MID', lane:'CENTER', chainPasses:0};
      const restartAttacker = pickAttacker(state.possession)
      if (restartAttacker){
        state.ballHolder = restartAttacker.id
        pushEvent('KICKOFF',{ holderId: restartAttacker.id, commentary:`Restart: ${(state.possession==='HOME'? HOME_NAME: AWAY_NAME)} riparte dal centro.` })
      } else {
        state.ballHolder=null
      }
    } else {
      // Saved shot logic: ball goes to goalkeeper of defending side
      const defendingSide = state.possession==='HOME' ? 'AWAY':'HOME'
      const defPitch = defendingSide==='HOME'? homePitch: awayPitch
      let keeper = defPitch.find(p=> (p.primaryRole==='GK' || p.role==='GK') && !p.sentOff && !p.injury)
      if (!keeper) keeper = defPitch.find(p=> !p.sentOff && !p.injury) || null
      pushEvent('SHOT',{ xg:Number(xg.toFixed(3)), goal:false, saved:true, shooterId: shooter?.id, keeperId: keeper?.id, commentary: shooter? shotPhrase(false, shooter.name, Number(xg.toFixed(2)), true, keeper?.name): undefined });
      pushEvent('SHOT_SAVED',{ shooterId: shooter?.id, keeperId: keeper?.id, xg:Number(xg.toFixed(3)), commentary: keeper && shooter ? `${keeper.name} para il tiro di ${shooter.name}` : 'Parata del portiere.' })
      // Possession change to defending side with keeper holding ball deep in DEF zone
      state.possession = defendingSide;
      state.ball={ zone:'DEF', lane:'CENTER', chainPasses:0 };
      state.ballHolder = keeper?.id || null;
    }
  }
  // Balance constants reused
  const PENALTY_BASE = MATCH_BALANCE.PENALTY_BASE
  const BOX_FOUL_BASE = MATCH_BALANCE.BOX_FOUL_BASE
  const SEASON_YELLOW_THRESHOLD = MATCH_BALANCE.SEASON_YELLOW_THRESHOLD
  const FK_DIRECT_BASE = MATCH_BALANCE.FK_DIRECT_BASE
  const FK_DIRECT_GOAL_BASE_XG = MATCH_BALANCE.FK_DIRECT_GOAL_BASE_XG
  const INJURY_PERIODIC_CHECK_SEC = MATCH_BALANCE.INJURY_PERIODIC_CHECK_SEC
  const FOUL_BASE_INJURY = MATCH_BALANCE.FOUL_BASE_INJURY
  const NON_CONTACT_BASE = MATCH_BALANCE.NON_CONTACT_BASE
  function onSendOff(){ clusters = computeAllClusters(homeTeam, awayTeam) }
  function sampleDefenderForCard(defSide){ const arr = defSide==='HOME'? homePitch:awayPitch; const zone=state.ball.zone; const zonePlayers = arr.filter(p=> p.zone===zone && !p.sentOff); const pool = zonePlayers.length? zonePlayers: arr.filter(p=> !p.sentOff); if (!pool.length) return null; return pool[Math.floor(Math.random()*pool.length)] }
  function foulChance(){ const adv=Math.abs(clusterAdvantageCurrent()); let p=0.012; if (adv>25) p+=0.006; if (adv>50) p+=0.006; const defSide = state.possession==='HOME'?'AWAY':'HOME'; const arr = defSide==='HOME'? homePitch:awayPitch; if (arr.length){ const warn=arr.filter(p=> p.fatigueFlag==='WARN').length; const crit=arr.filter(p=> p.fatigueFlag==='CRIT').length; p += warn*0.0008 + crit*0.0015 } const pressing=getPressing(defSide); p *= (1 + (pressing - 0.5)*0.9); return Math.min(0.05,p) }
  function pickVictimPlayer(attackingSide){ const arr = attackingSide==='HOME'? homePitch:awayPitch; if (!arr.length) return null; const inZone = arr.filter(p=> p.zone===state.ball.zone && !p.injury && !p.sentOff); const pool = inZone.length? inZone: arr.filter(p=> !p.injury && !p.sentOff); if (!pool.length) return null; return pool[Math.floor(Math.random()*pool.length)] }
  function fatigueInjuryMultiplier(st){ if (st>=70) return 1; if (st>=60) return 1.15; if (st>=50) return 1.35; if (st>=40) return 1.60; return 1.95 }
  function ageStressBonus(age){ if (age>=35) return 0.20; if (age>=32) return 0.10; return 0 }
  function medicalMitigation(player){ const teamSide = homePitch.includes(player)? 'HOME':'AWAY'; const staff = teamSide==='HOME'? homeStaff:awayStaff; const condMult = staff.conditioning?.staminaRecoveryMult || 1; return Math.min(0.18, Math.max(0,(condMult-1)*0.4)) }
  function finalInjuryProbability(base, player){ const st=player.liveStamina??100; let mult=fatigueInjuryMultiplier(st); mult += ageStressBonus(player.age||27); const mitigation=medicalMitigation(player); return base*mult*(1-mitigation) }
  function rollSeverity(player){ const mitigation=medicalMitigation(player); const shiftProb=Math.min(0.45, mitigation*1.3); let rnd=Math.random(); let bucket; if (rnd<0.50) bucket='LIGHT'; else if (rnd<0.75) bucket='MINOR'; else if (rnd<0.92) bucket='MODERATE'; else bucket='SEVERE'; if (bucket!=='LIGHT' && Math.random()<shiftProb){ if (bucket==='MINOR') bucket='LIGHT'; else if (bucket==='MODERATE') bucket='MINOR'; else if (bucket==='SEVERE') bucket='MODERATE' } let weeks=0; if (bucket==='MINOR') weeks=1+Math.floor(Math.random()*2); else if (bucket==='MODERATE') weeks=3+Math.floor(Math.random()*4); else if (bucket==='SEVERE') weeks=8+Math.floor(Math.random()*13); return { severity:bucket, weeks } }
  function registerInjury(player, context){ if (player.injury) return; const sev=rollSeverity(player); player.injury={ matchTime: state.clockSec, type: context.type, severity: sev.severity, weeks: sev.weeks }; player.injuredOut=true; pushEvent('INJURY',{ playerId: player.id, type: context.type, severity: sev.severity, weeks: sev.weeks }); function remove(arr){ for (let i=arr.length-1;i>=0;i--) if (arr[i].injuredOut) arr.splice(i,1) } if (homePitch.includes(player)) remove(homePitch); else if (awayPitch.includes(player)) remove(awayPitch); clusters = computeAllClusters(homeTeam, awayTeam) }
  function maybeInjuryFoulContext(victim){ const prob = finalInjuryProbability(FOUL_BASE_INJURY, victim); if (Math.random()<prob) registerInjury(victim,{type:'FOUL'}) }
  let nextPeriodicInjuryCheck = INJURY_PERIODIC_CHECK_SEC
  function periodicNonContactInjuryCheck(){ if (state.clockSec < nextPeriodicInjuryCheck) return; while (state.clockSec >= nextPeriodicInjuryCheck) nextPeriodicInjuryCheck += INJURY_PERIODIC_CHECK_SEC; function scan(arr){ for (const p of arr){ if (p.injury || p.sentOff) continue; const st=p.liveStamina??100; if (st>=60) continue; const prob=finalInjuryProbability(NON_CONTACT_BASE,p); if (Math.random()<prob) registerInjury(p,{type:'NON_CONTACT'}) } } scan(homePitch); scan(awayPitch) }
  function selectPenaltyTaker(side){ const arr = side==='HOME'? homePitch:awayPitch; const eligible=arr.filter(p=> !p.sentOff); if (!eligible.length) return null; const pref = eligible.filter(p=> ['ST','FR','FL','FW','ATT'].some(r=> p.primaryRole===r || p.role===r)); const pool = (pref.length?pref:eligible).slice().sort((a,b)=> (b.effectiveOverall||0)-(a.effectiveOverall||0)); return pool[0] }
  function resolvePenalty(){ pushEvent('PENALTY_AWARDED',{ side: state.possession }); const taker=selectPenaltyTaker(state.possession); const oppSide= state.possession==='HOME'?'AWAY':'HOME'; const keeper=selectPenaltyTaker(oppSide); let conv=PENALTY_BASE; if (taker && taker.liveStamina<55) conv-=0.05; if (taker && taker.liveStamina<40) conv-=0.03; conv=Math.max(0.60, Math.min(0.90, conv)); pushEvent('PENALTY_TAKEN',{ takerId:taker?.id, keeperId:keeper?.id, convProb:Number(conv.toFixed(3)) }); const rnd=Math.random(); if (rnd<conv){ state.score[state.possession]++; pushEvent('PENALTY_SCORED',{ scorerSide: state.possession, scoreline:`${state.score.HOME}-${state.score.AWAY}` }); state.possession = state.possession==='HOME'?'AWAY':'HOME'; state.ball={zone:'MID', lane:'CENTER', chainPasses:0} } else { if (Math.random()<0.55) pushEvent('PENALTY_SAVED',{ keeperId: keeper?.id }); else pushEvent('PENALTY_MISSED'); turnover() } state.clockSec += 15 }
  function resolveFreeKick({ foulZone, foulLane }){ const adv=Math.max(0, clusterAdvantageCurrent()); const dangerous=(foulZone==='ATT'); let pDirect = FK_DIRECT_BASE; if (dangerous) pDirect += 0.15; if (foulLane==='CENTER') pDirect+=0.08; pDirect += Math.min(0.12, adv/160); pDirect = Math.min(0.80, pDirect); const isDirect=Math.random()<pDirect; const side=state.possession; if (isDirect){ const taker=selectPenaltyTaker(side); pushEvent('FREE_KICK_DIRECT',{ takerId:taker?.id, pDirect:Number(pDirect.toFixed(3)) }); let xg=FK_DIRECT_GOAL_BASE_XG; if (dangerous) xg+=0.03; if (foulLane==='CENTER') xg+=0.02; xg+=Math.min(0.03, adv/200); if (taker && taker.liveStamina<55) xg-=0.01; xg=Math.max(0.01, Math.min(0.25, xg)); const goal=Math.random()<xg; if (goal){ state.score[side]++; pushEvent('FREE_KICK_GOAL',{ takerId:taker?.id, xg:Number(xg.toFixed(3)), scoreline:`${state.score.HOME}-${state.score.AWAY}` }); state.possession = side==='HOME'?'AWAY':'HOME'; state.ball={zone:'MID', lane:'CENTER', chainPasses:0} } else { if (Math.random()<0.55){ pushEvent('FREE_KICK_SAVED',{ xg:Number(xg.toFixed(3)) }); turnover() } else { pushEvent('FREE_KICK_WIDE',{ xg:Number(xg.toFixed(3)) }); turnover() } } state.clockSec += 10 } else { pushEvent('FREE_KICK_INDIRECT_SEQUENCE',{ pDirect:Number(pDirect.toFixed(3)) }); state.ball.zone='ATT'; state.ball.chainPasses=1+(Math.random()<0.35?1:0); if (Math.random()<0.18){ attemptShot() } state.clockSec += 8 } }
  function maybeFoul(context){ if (context.actionType==='SHOT') return false; if (Math.random() >= foulChance()) return false; const defendingSide = state.possession==='HOME'?'AWAY':'HOME'; const offender=sampleDefenderForCard(defendingSide); if (!offender) return false; const inAttackingThird = state.ball.zone==='ATT'; let isPenalty=false; if (inAttackingThird && state.possession !== defendingSide){ const adv=Math.max(0, clusterAdvantageCurrent()); const boxProb=BOX_FOUL_BASE * (1 + adv/120); if (Math.random()<boxProb) isPenalty=true } const victim=pickVictimPlayer(state.possession); pushEvent('FOUL',{ against: state.possession, bySide:defendingSide, offenderId: offender.id, victimId: victim?.id, penalty:isPenalty, commentary: foulPhrase(offender.name, victim?.name || 'avversario', isPenalty) }); if (victim) maybeInjuryFoulContext(victim); const advMag=Math.abs(clusterAdvantageCurrent()); let yellowProb=0.78 + Math.min(0.08, advMag/200); let straightRedProb=0.03 + Math.min(0.04, advMag/300); if (offender.fatigueFlag==='WARN') yellowProb+=0.02; if (offender.fatigueFlag==='CRIT'){ yellowProb+=0.04; straightRedProb+=0.01 } let cardType=null; if (!offender.sentOff){ if (offender.yellowCardsThisMatch>=1){ if (Math.random()<yellowProb) cardType='SECOND_YELLOW' } else { if (Math.random()<straightRedProb) cardType='RED'; else if (Math.random()<yellowProb) cardType='YELLOW' } } if (cardType){ if (cardType==='YELLOW'){ offender.yellowCardsThisMatch=(offender.yellowCardsThisMatch||0)+1; offender.seasonYellowCount=(offender.seasonYellowCount||0)+1; const suspensionTrigger = offender.seasonYellowCount >= SEASON_YELLOW_THRESHOLD && !offender.suspendedNext; if (suspensionTrigger) offender.suspendedNext=true; pushEvent('YELLOW_CARD',{ playerId: offender.id, suspensionTrigger, commentary: cardPhrase('YELLOW_CARD', offender.name) }) } else if (cardType==='SECOND_YELLOW'){ offender.yellowCardsThisMatch=2; offender.seasonYellowCount=(offender.seasonYellowCount||0)+1; const suspensionTrigger = offender.seasonYellowCount >= SEASON_YELLOW_THRESHOLD && !offender.suspendedNext; if (suspensionTrigger) offender.suspendedNext=true; offender.sentOff=true; pushEvent('RED_CARD',{ playerId: offender.id, secondYellow:true, suspensionTrigger, commentary: cardPhrase('RED_CARD', offender.name) }); onSendOff(defendingSide) } else if (cardType==='RED'){ offender.sentOff=true; pushEvent('RED_CARD',{ playerId: offender.id, straight:true, commentary: cardPhrase('RED_CARD', offender.name) }); onSendOff(defendingSide) } }
    if (isPenalty){ resolvePenalty() } else { resolveFreeKick({ foulZone: state.ball.zone, foulLane: state.ball.lane }) }
    return true }
  // Substitution system (simplified reuse)
  const SUB_RULES = { maxSubs:5, maxWindows:3 }
  const subState = { HOME:{ subsUsed:0, windowsUsed:0, pending:[] }, AWAY:{ subsUsed:0, windowsUsed:0, pending:[] } }
  function benchPlayers(side){ const team = side==='HOME'? homeTeam:awayTeam; const pitch = side==='HOME'? homePitch:awayPitch; return team.players.filter(p=> !pitch.includes(p) && !p.sentOff && !p.injury) }
  function subsRemaining(side){ return SUB_RULES.maxSubs - subState[side].subsUsed }
  function canOpenWindow(side,isHT){ if (subState[side].subsUsed>=SUB_RULES.maxSubs) return false; if (isHT) return true; return subState[side].windowsUsed < SUB_RULES.maxWindows }
  function addPendingSub(side,outId,inId,reason){ if (subsRemaining(side)<=0) return false; const already=subState[side].pending.find(s=> s.outId===outId || s.inId===inId); if (already) return false; subState[side].pending.push({ outId,inId,reason }); return true }
  function findOnPitchById(side,id){ const pitch= side==='HOME'? homePitch:awayPitch; return pitch.find(p=> p.id===id) }
  function roleMatchScore(bp,target){ const role = target?.primaryRole || target?.role; if (!role) return 0; let s=0; if (bp.primaryRole===role) s+=3; if (bp.role===role) s+=2; return s }
  function pickReplacement(side,target){ const bench=benchPlayers(side); if (!bench.length) return null; const scored=bench.map(p=> ({ p, score: roleMatchScore(p,target), overall: p.overall||p.baseOverall||50 })); scored.sort((a,b)=> b.score - a.score || b.overall - a.overall); return scored[0].p }
  function queueForcedInjurySubs(){ ['HOME','AWAY'].forEach(side=> { const pitch = side==='HOME'? homePitch:awayPitch; if (pitch.length < 11 && benchPlayers(side).length){ const bench=benchPlayers(side).slice().sort((a,b)=> (b.overall||0)-(a.overall||0)); const incoming=bench[0]; if (incoming) addPendingSub(side,null,incoming.id,'INJURY_FORCED') } }) }
  function autoSuggestFatigueSubs(){ ['HOME','AWAY'].forEach(side=> { if (subsRemaining(side)<=0) return; const afterMinute = state.clockSec >= 45*60; const pitch = side==='HOME'? homePitch:awayPitch; const crit = pitch.filter(p=> p.fatigueFlag==='CRIT' && !p.injury && !p.sentOff); const warn = pitch.filter(p=> p.fatigueFlag==='WARN' && !p.injury && !p.sentOff); if (!crit.length && !(afterMinute && warn.length)) return; crit.sort((a,b)=> (a.liveStamina||0)-(b.liveStamina||0)); warn.sort((a,b)=> (a.liveStamina||0)-(b.liveStamina||0)); const candidates=[...crit,...warn]; for (const target of candidates){ if (subsRemaining(side)<=0) break; const rep = pickReplacement(side,target); if (!rep) continue; if (target.liveStamina>70) continue; addPendingSub(side,target.id,rep.id,target.injury?'INJURY_FORCED':'FATIGUE_AUTO'); if (subState[side].pending.filter(p=> p.reason.startsWith('FATIGUE')).length>=2) break } }) }
  function executePendingSubs(isHalfTime, contextType){ ['HOME','AWAY'].forEach(side=> { const st=subState[side]; if (!st.pending.length) return; if (!canOpenWindow(side,isHalfTime)){ st.pending=[]; return } const pitch= side==='HOME'? homePitch:awayPitch; const staff = side==='HOME'? homeStaff:awayStaff; const executed=[]; for (const req of st.pending){ if (subsRemaining(side)<=0) break; let outPlayer = req.outId ? findOnPitchById(side,req.outId): null; if (!outPlayer && req.outId){ continue } if (!outPlayer && req.outId==null){ outPlayer = pitch.slice().sort((a,b)=> (a.liveStamina||100)-(b.liveStamina||100))[0] } const team = side==='HOME'? homeTeam:awayTeam; const incoming = team.players.find(p=> p.id===req.inId && !p.injury && !p.sentOff && !pitch.includes(p)); if (!incoming) continue; incoming.liveStamina = incoming.liveStamina ?? 100; incoming.fatigueFlag = staminaFlag(incoming.liveStamina); incoming.effectiveOverall = computeEffectiveOverall(incoming, staff); if (outPlayer){ const idx=pitch.indexOf(outPlayer); if (idx>=0) pitch.splice(idx,1) } pitch.push(incoming); executed.push({ outId: outPlayer?.id||null, inId: incoming.id, reason:req.reason }); st.subsUsed++; if (st.subsUsed>=SUB_RULES.maxSubs) break }
    if (executed.length){ if (!isHalfTime) st.windowsUsed++; pushEvent('SUB_WINDOW_START',{ side, count:executed.length, context: contextType, windowsUsed: st.windowsUsed, subsUsed: st.subsUsed }); executed.forEach(ex=> pushEvent('SUBSTITUTION',{ side, outId: ex.outId, inId: ex.inId, reason: ex.reason })); clusters = computeAllClusters(homeTeam, awayTeam) } st.pending=[] }) }
  function processSubstitutions(isHalfTime, contextType){ queueForcedInjurySubs(); autoSuggestFatigueSubs(); executePendingSubs(isHalfTime, contextType) }
  function applyScheduledTacticChanges(){ for (const item of tacticChangeQueue){ if (item.applied) continue; if (state.clockSec >= item.atSec){ const side=item.side; if (!tacticState[side]) continue; Object.assign(tacticState[side], item.changes); if (item.changes.formation){ if (side==='HOME') homeTeam.formation=item.changes.formation; else awayTeam.formation=item.changes.formation; annotatePlayersWithSpatial(side==='HOME'? homeTeam:awayTeam); clusters = computeAllClusters(homeTeam, awayTeam) } pushEvent('TACTIC_CHANGE',{ side, changes:item.changes }); item.applied=true } } }
  let guard=0
  // Task 43: periodic 5-min summary for streaming runtime
  let nextSummarySec = 5*60
  function pushPeriodSummary(boundarySec){
    const windowStart = boundarySec - 5*60
    const windowEnd = boundarySec
    const windowEvents = state.events.filter(e => e.t > windowStart && e.t <= windowEnd)
    let passes=0, passSucc=0, advances=0, advSucc=0, shots=0, xg=0, fouls=0, cards=0
    const sideActions={ HOME:0, AWAY:0 }
    windowEvents.forEach(ev => {
      if (ev.type==='PASS'){ passes++; if (ev.success) passSucc++; sideActions[ev.possession]++ }
      else if (ev.type==='ADVANCE'){ advances++; if (ev.success) advSucc++; sideActions[ev.possession]++ }
      else if (ev.type==='SHOT'){ shots++; xg += (ev.xg||0) }
      else if (ev.type.startsWith('FREE_KICK_') && ev.xg != null){ xg += ev.xg }
      else if (ev.type==='FOUL'){ fouls++ }
      else if (ev.type==='YELLOW_CARD' || ev.type==='RED_CARD'){ cards++ }
    })
    const totalActs = sideActions.HOME + sideActions.AWAY
    const homePossPct = totalActs? Math.round((sideActions.HOME/totalActs)*100):50
    const awayPossPct = 100 - homePossPct
    const passFail = passes - passSucc
    const advFail = advances - advSucc
    const minuteStart = Math.floor(windowStart/60)
    const minuteEnd = Math.floor(windowEnd/60)
  const commentary = `Summary ${minuteStart}'-${minuteEnd}': possession ${homePossPct}%-${awayPossPct}%, passes ${passSucc}/${passFail}, advances ${advSucc}/${advFail}, shots ${shots} (xG ${xg.toFixed(2)}), fouls ${fouls}.`
    const evt = { id: state.events.length+1, t: boundarySec, half: state.half, type:'PERIOD_SUMMARY', commentary, stats:{ windowStart, windowEnd, homePossPct, awayPossPct, passes, passSucc, advances, advSucc, shots, xg:Number(xg.toFixed(3)), fouls, cards }, isKey:true }
    state.events.push(evt)
    return evt
  }
  let lastEventCount=0
  function step(){
    if (state.done) return { done:true, newEvents:[] }
    const startIndex = state.events.length
    guard++
    if (state.half===1 && state.clockSec >= HALF_DURATION){
      pushEvent('HALF_TIME'); state.half=2; homePitch.forEach(p=> halftimeRecovery(p,'HOME')); awayPitch.forEach(p=> halftimeRecovery(p,'AWAY')); recomputeEffectiveOnPitch(); processSubstitutions(true,'HALF_TIME'); state.possession = state.possession==='HOME'?'AWAY':'HOME'; state.ball={ zone:'MID', lane:'CENTER', chainPasses:0 }
    }
    let actionType=null
    if (shotIntent()){ actionType='SHOT'; attemptShot() } else { if (state.ball.zone==='ATT'){ actionType='PASS'; attemptPass(false) } else { actionType='ADVANCE'; attemptAdvance() } }
    maybeFoul({ afterAction:true, actionType })
    const lastType = state.events[state.events.length-1]?.type
    if (['GOAL','INJURY','FOUL','RED_CARD','TURNOVER','PENALTY_SCORED','PENALTY_SAVED','PENALTY_MISSED','FREE_KICK_GOAL','FREE_KICK_SAVED','FREE_KICK_WIDE'].includes(lastType)){
      processSubstitutions(false,lastType)
    }
    const delta = actionDelaySec(); state.clockSec += delta; 
    // Period summaries if boundary crossed
    while (state.clockSec >= nextSummarySec && nextSummarySec < MATCH_DURATION){
      pushPeriodSummary(nextSummarySec)
      nextSummarySec += 5*60
    }
    applyStaminaDecay(delta); if (state.clockSec % 60 < delta) recomputeEffectiveOnPitch(); periodicNonContactInjuryCheck(); applyScheduledTacticChanges()
    if (state.clockSec >= MATCH_DURATION || guard >= MAX_EVENTS){ if (!state.events.find(e=> e.type==='FULL_TIME')) pushEvent(state.clockSec>=MATCH_DURATION?'FULL_TIME':'FULL_TIME_GUARD'); state.done=true }
    const slice = state.events.slice(startIndex)
    lastEventCount = state.events.length
    return { done: state.done, newEvents: slice }
  }
  function fastForward(){ while(!state.done){ step() } return finalizeResult() }
  function finalizeResult(){ const homeGoals=state.score.HOME; const awayGoals=state.score.AWAY; let homePts=0, awayPts=0; if (homeGoals>awayGoals) homePts=3; else if (awayGoals>homeGoals) awayPts=3; else homePts=awayPts=1; return { homeGoals, awayGoals, homePts, awayPts, events: state.events, debug:{ clusters } } }
  // Public API for external control (UI)
  function queueTacticChange(side, minuteFromNow, changes){ const atMinute = Math.floor(state.clockSec/60) + (minuteFromNow||0); tacticChangeQueue.push({ side, changes, atSec: atMinute*60, applied:false }) }
  function queueSub(side, outId, inId, reason='UI'){ addPendingSub(side, outId||null, inId, reason) }
  return { state, step, fastForward, finalizeResult, queueTacticChange, queueSub, homeTeam, awayTeam, tacticState }
}

