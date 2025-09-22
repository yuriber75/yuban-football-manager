import { GAME_CONSTANTS } from '../constants'
import { makeTeam } from './teamGenerator'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createRoundRobinFixtures(teams) {
  // Simple round-robin, one leg
  const fixtures = []
  const n = teams.length
  const rounds = n - 1
  let home = teams.slice(0, n / 2)
  let away = teams.slice(n / 2).reverse()

  for (let r = 0; r < rounds; r++) {
    const week = []
    for (let i = 0; i < home.length; i++) {
      week.push({ home: home[i].name, away: away[i].name })
    }
    fixtures.push(week)
    // rotate
    if (n > 2) {
      const fixed = home[0]
      const arr = [...home.slice(1), ...away]
      arr.unshift(arr.pop())
      home = [fixed, ...arr.slice(0, arr.length / 2 - 0)]
      away = arr.slice(arr.length / 2).reverse()
    }
  }

  return fixtures
}

export function setupNewLeague(count = 8, managerName, myTeamName, formation = '442') {
  const pool = [...GAME_CONSTANTS.TEAMS.NAMES]
  const picked = []
  while (picked.length < count - 1 && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  const otherTeams = picked.map((n) => makeTeam(n, formation))
  const myTeam = makeTeam(myTeamName || 'My FC', formation)
  const teams = shuffle([myTeam, ...otherTeams])

  const fixtures = createRoundRobinFixtures(teams)
  const table = Object.fromEntries(teams.map((t) => [t.name, { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }]))

  return {
    manager: managerName || 'Manager',
    teamName: myTeam.name,
    teams,
    league: {
      week: 1,
      currentViewWeek: 0,
      fixtures,
      table,
      results: [],
      statistics: {
        topScorers: [],
        topAssisters: [],
        bestRatings: [],
        cleanSheets: [],
        yellowCards: [],
        redCards: [],
      },
      seasonStats: {
        matchesPlayed: 0,
        totalGoals: 0,
        avgGoalsPerGame: 0,
        cleanSheets: 0,
        cardsTotal: 0,
      },
    },
    career: {
      cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
      wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
      sponsorTech: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH,
      sponsorShirt: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT,
    },
    freeAgents: [], // can be seeded later
    negotiations: { pendingOffers: [], rejectedPlayers: new Set(), attemptsCount: {} },
  }
}
