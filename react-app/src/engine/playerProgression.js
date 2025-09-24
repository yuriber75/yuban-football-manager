import { GAME_CONSTANTS } from '../constants'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function baseWeeklyDeltaForAge(age) {
  if (age <= 21) return 0.06
  if (age <= 24) return 0.05
  if (age <= 27) return 0.03
  if (age <= 30) return 0.00
  if (age <= 33) return -0.03
  return -0.05
}

function staffBoostForTeam(finances) {
  const id = finances?.technicalStaffId || 'basic'
  const opt = (GAME_CONSTANTS.FINANCE.TECHNICAL_STAFF || []).find(s => s.id === id)
  return opt?.boost || 0
}

function trainingPitchesMultiplier(finances) {
  const lvl = finances?.trainingFacility?.pitches || 0
  // 0 => 0%, 1 => 5%, 2 => 10%, 3 => 15%
  const table = [0, 0.05, 0.10, 0.15]
  return table[clamp(lvl, 0, table.length - 1)] || 0
}

/**
 * Apply weekly player progression/regression across ALL teams.
 * - Age-based base delta (young grow, seniors decline)
 * - Multiplied by training pitches level and technical staff boost
 * - Updates player.overall with one-decimal precision, clamped to [55, 95]
 */
export function applyWeeklyPlayerProgression(state) {
  const nextTeams = state.teams.map(team => {
    const fin = team.finances || {}
    const mult = 1 + trainingPitchesMultiplier(fin) + staffBoostForTeam(fin)
    const nextPlayers = (team.players || []).map(p => {
      const base = baseWeeklyDeltaForAge(p.age || 25)
      const delta = base * mult
      const nextOvr = clamp(Number(((p.overall || 60) + delta).toFixed(1)), 55, 95)
      // Age up very slowly: +1 year every 52 weeks is handled elsewhere; here we keep age constant.
      return { ...p, overall: nextOvr }
    })
    return { ...team, players: nextPlayers }
  })
  return { ...state, teams: nextTeams }
}
