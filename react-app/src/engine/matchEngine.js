import { GAME_CONSTANTS } from '../constants'

function teamStrength(team) {
  // Average overall of likely starters (first 11)
  const players = team.players.slice(0, 11)
  if (!players.length) return 50
  const avg = players.reduce((s, p) => s + (p.overall || 50), 0) / players.length
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

export function simulateMatch(homeTeam, awayTeam) {
  // Derive expected goals from strength and small home advantage
  const homeStr = teamStrength(homeTeam)
  const awayStr = teamStrength(awayTeam)
  const base = 1.2
  const homeAdv = 0.15
  const scale = 0.015
  const homeLambda = base + homeAdv + (homeStr - 60) * scale
  const awayLambda = base + (awayStr - 60) * scale

  const homeGoals = Math.max(0, poisson(Math.max(0.2, homeLambda)))
  const awayGoals = Math.max(0, poisson(Math.max(0.2, awayLambda)))

  let homePts = 0, awayPts = 0
  if (homeGoals > awayGoals) homePts = 3
  else if (homeGoals < awayGoals) awayPts = 3
  else homePts = awayPts = 1

  return { homeGoals, awayGoals, homePts, awayPts }
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
