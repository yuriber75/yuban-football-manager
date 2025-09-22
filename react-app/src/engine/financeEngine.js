import { GAME_CONSTANTS } from '../constants'

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

export function computeAttendance(prevAttendance, resultTrend = 0, capacity) {
  const base = prevAttendance || GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE
  const trendMult = resultTrend > 0 ? GAME_CONSTANTS.FINANCE.ATTENDANCE_WIN_BOOST : resultTrend < 0 ? GAME_CONSTANTS.FINANCE.ATTENDANCE_LOSS_PENALTY : 1
  const next = Math.floor(base * trendMult)
  const min = Math.floor(capacity * GAME_CONSTANTS.FINANCE.MIN_ATTENDANCE_PERCENTAGE)
  return clamp(next, min, capacity)
}

export function weeklyTeamFinances(team, lastWeekResultForTeam) {
  const fin = { ...team.finances }
  const capacity = fin.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
  const trend = !lastWeekResultForTeam ? 0 : lastWeekResultForTeam.homeTeamWon === undefined ? 0 : (lastWeekResultForTeam.homeTeamWon ? (lastWeekResultForTeam.isHome ? 1 : -1) : (lastWeekResultForTeam.isHome ? -1 : 1))
  fin.attendance = computeAttendance(fin.attendance, trend, capacity)

  const gate = (fin.attendance * GAME_CONSTANTS.FINANCE.TICKET_PRICE) / 1_000_000 // in millions
  const sponsor = (GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT + GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH) / 52
  const maintenance = (capacity * GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT) / 1_000_000 + (fin.cash * GAME_CONSTANTS.FINANCE.MAINTENANCE_COST_PERCENTAGE) / 52
  const wages = team.players.reduce((s, p) => s + (p.wage || 0), 0)
  const wagesWeekly = wages // wages are already weekly in this sim

  const income = gate + sponsor
  const expenses = maintenance + wagesWeekly
  fin.cash = Number((fin.cash + income - expenses).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))

  return { finances: fin, breakdown: { gate, sponsor, maintenance, wages: wagesWeekly } }
}

export function applyWeeklyFinances(state, weekResults) {
  const teamIndex = Object.fromEntries(state.teams.map((t, i) => [t.name, i]))
  // Build quick lookup for win/loss per team for trend calculation
  const perTeam = {}
  for (const r of weekResults) {
    const homeTeamWon = r.homeGoals > r.awayGoals
    const awayTeamWon = r.awayGoals > r.homeGoals
    perTeam[r.home] = { isHome: true, homeTeamWon }
    perTeam[r.away] = { isHome: false, homeTeamWon }
  }

  const nextTeams = state.teams.map((team) => {
    const res = perTeam[team.name]
    const { finances } = weeklyTeamFinances(team, res)
    return { ...team, finances }
  })

  return { ...state, teams: nextTeams }
}
