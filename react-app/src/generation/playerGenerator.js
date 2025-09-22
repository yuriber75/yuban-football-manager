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
  const posBase = GAME_CONSTANTS.PLAYER_STATS.BASE_STATS[primaryRole] || GAME_CONSTANTS.PLAYER_STATS.BASE_STATS.MC
  const posWeights = GAME_CONSTANTS.PLAYER_STATS.WEIGHTS[primaryRole] || GAME_CONSTANTS.PLAYER_STATS.WEIGHTS.MC

  const age = randomBetween(17, 36)
  const nameFirst = GAME_CONSTANTS.NAMES.FIRST[randomBetween(0, GAME_CONSTANTS.NAMES.FIRST.length - 1)] || 'Alex'
  const nameLast = GAME_CONSTANTS.NAMES.LAST[randomBetween(0, GAME_CONSTANTS.NAMES.LAST.length - 1)] || 'Smith'

  const stats = {
    speed: randomBetween(posBase.speed - 8, posBase.speed + 8),
    pass: randomBetween(posBase.pass - 8, posBase.pass + 8),
    shot: randomBetween(posBase.shot - 8, posBase.shot + 8),
    def: randomBetween(posBase.def - 8, posBase.def + 8),
    drib: randomBetween(posBase.drib - 8, posBase.drib + 8),
    tackle: randomBetween(posBase.tackle - 8, posBase.tackle + 8),
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

  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    name: `${nameFirst} ${nameLast}`,
    age,
    roles: [primaryRole],
    primaryRole,
    stats,
    overall,
    value,
    wage,
    listedForSale: false,
    starting: false,
  }
}
