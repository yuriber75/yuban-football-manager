import { GAME_CONSTANTS } from '../constants'

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedAverage(stats, weights) {
  return Math.round(
    Object.keys(weights).reduce((sum, key) => sum + stats[key] * weights[key], 0)
  )
}

export function makePlayer(primaryRole = 'MC') {
  // Use vanilla-like GK styles for goalkeepers; otherwise use role base stats
  let posBase
  if (primaryRole === 'GK') {
    const gkStyles = [
      { speed: 35, pass: 70, shot: 55, def: 75, freeKick: 40, penalty: 65, oneOnOne: 72, aerial: 68 }, // modern GK
      { speed: 40, pass: 50, shot: 50, def: 85, freeKick: 35, penalty: 70, oneOnOne: 66, aerial: 74 }, // classic GK
      { speed: 45, pass: 55, shot: 60, def: 80, freeKick: 45, penalty: 60, oneOnOne: 74, aerial: 66 }, // athletic GK
    ]
    posBase = gkStyles[Math.floor(Math.random() * gkStyles.length)]
  } else {
    posBase = GAME_CONSTANTS.PLAYER_STATS.BASE_STATS[primaryRole] || GAME_CONSTANTS.PLAYER_STATS.BASE_STATS.MC
  }
  const posWeights = GAME_CONSTANTS.PLAYER_STATS.WEIGHTS[primaryRole] || GAME_CONSTANTS.PLAYER_STATS.WEIGHTS.MC

  const age = randomBetween(17, 36)
  const nameFirst = GAME_CONSTANTS.NAMES.FIRST[randomBetween(0, GAME_CONSTANTS.NAMES.FIRST.length - 1)] || 'Alex'
  const nameLast = GAME_CONSTANTS.NAMES.LAST[randomBetween(0, GAME_CONSTANTS.NAMES.LAST.length - 1)] || 'Smith'

  // Generate stats for all weighted keys to ensure overall is valid
  const stats = {}
  for (const key of Object.keys(posWeights)) {
    const base = typeof posBase[key] === 'number' ? posBase[key] : 55
    stats[key] = randomBetween(base - 8, base + 8)
  }

  const overall = weightedAverage(stats, posWeights)

  const value = Math.max(
    GAME_CONSTANTS.FINANCE.MIN_TRANSFER_VALUE,
    Math.round((overall / 100) * GAME_CONSTANTS.FINANCE.BASE_VALUE_MULTIPLIER)
  )

  const wage = Math.max(
    GAME_CONSTANTS.FINANCE.MIN_PLAYER_WAGE,
    Number(((overall / 100) * GAME_CONSTANTS.FINANCE.BASE_WAGE_MULTIPLIER).toFixed(2))
  )

  // Assign roles: primary plus optional secondary/tertiary per mapping
  // 30% chance for a second role; 10% for a third role (if available).
  // Exclude GK from multi-role assignment.
  const roles = [primaryRole]
  if (primaryRole !== 'GK') {
    const SECONDARY_ROLE_MAP = {
      DL: ['DC', 'ML'],
      DC: ['DL', 'DR'],
      DR: ['DC', 'DL'],
      MR: ['ML', 'MC', 'DR', 'FR'],
      ML: ['MR', 'MC', 'DL', 'FL'],
      ST: ['MC', 'FR', 'FL'],
      MC: ['MR', 'ML', 'DC'],
      // FR/FL not specified in mapping; leave as single-role unless primary is something else that maps to them
    }
    const options = SECONDARY_ROLE_MAP[primaryRole] || []
    // Helper to pick a random element not already in roles
    const pickUnique = (arr) => {
      const pool = arr.filter(r => !roles.includes(r))
      if (!pool.length) return null
      return pool[Math.floor(Math.random() * pool.length)]
    }
    if (Math.random() < 0.30 && options.length) {
      const second = pickUnique(options)
      if (second) roles.push(second)
    }
    if (Math.random() < 0.10 && options.length) {
      const third = pickUnique(options)
      if (third) roles.push(third)
    }
  }

  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    name: `${nameFirst} ${nameLast}`,
    age,
    roles,
    primaryRole,
    stats,
    overall,
    value,
    wage,
    listedForSale: false,
    starting: false,
  }
}
