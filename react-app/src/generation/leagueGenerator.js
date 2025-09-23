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
  // Double round-robin (home and away), circle method
  // Handles odd team count via BYE padding
  const fixtures = []
  const teamList = [...teams]
  const names = teamList.map(t => t.name)
  const isOdd = names.length % 2 === 1
  if (isOdd) names.push('__BYE__')
  const n = names.length
  const half = n / 2
  const rounds = n - 1 // number of weeks per leg

  let left = names.slice(0, half)
  let right = names.slice(half).reverse()

  const buildLeg = (swapHomeAway = false) => {
    for (let r = 0; r < rounds; r++) {
      const week = []
      for (let i = 0; i < half; i++) {
        const a = left[i]
        const b = right[i]
        if (a === '__BYE__' || b === '__BYE__') continue
        const home = swapHomeAway ? b : a
        const away = swapHomeAway ? a : b
        week.push({ home, away })
      }
      fixtures.push(week)
      // rotate using circle method, keeping left[0] fixed
      if (n > 2) {
        const fixed = left[0]
        const arr = [...left.slice(1), ...right]
        arr.unshift(arr.pop())
        left = [fixed, ...arr.slice(0, half - 1)]
        right = arr.slice(half - 1).reverse()
      }
    }
  }

  // First leg
  buildLeg(false)
  // Reset arrays for second leg rotation
  left = names.slice(0, half)
  right = names.slice(half).reverse()
  // Second leg with inverted venues
  buildLeg(true)

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
