import { GAME_CONSTANTS } from '../constants'

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function weightedAverage(stats, weights) {
  return Math.round(
    Object.keys(weights).reduce((sum, key) => sum + stats[key] * weights[key], 0)
  )
}

// Sample a target overall in 55–95 with a custom distribution:
// 15% 86–95, 30% 80–85, 20% 71–79, 20% 65–70, 15% 55–64
function sampleTargetOverall() {
  const r = Math.random()
  if (r < 0.15) return randomBetween(86, 95)
  if (r < 0.45) return randomBetween(80, 85)
  if (r < 0.65) return randomBetween(71, 79)
  if (r < 0.85) return randomBetween(65, 70)
  return randomBetween(55, 64)
}

// Apply a smooth age-based adjustment: slight penalty after 30, slight boost at 23–27
function adjustOverallForAge(target, age) {
  // Base curve: peak ~25, small dip after 30
  let delta = 0
  if (age >= 31 && age <= 33) delta = -2
  else if (age >= 34 && age <= 36) delta = -4
  else if (age <= 21) delta = -2
  else if (age >= 22 && age <= 24) delta = +1
  else if (age >= 25 && age <= 27) delta = +2
  else if (age >= 28 && age <= 30) delta = 0
  const adjusted = clamp(target + delta, 55, 95)
  return adjusted
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
  // Wider spread to allow higher-ceiling players and clamp to [55, 95]
  const SPREAD = 18
  for (const key of Object.keys(posWeights)) {
    const base = typeof posBase[key] === 'number' ? posBase[key] : 55
    const lo = Math.max(55, base - SPREAD)
    const hi = Math.min(95, base + SPREAD)
    stats[key] = clamp(randomBetween(lo, hi), 55, 95)
  }

  // Aim overall to follow the requested distribution
  let targetOverall = sampleTargetOverall()
  // age-aware tweak
  targetOverall = adjustOverallForAge(targetOverall, age)
  let overall = weightedAverage(stats, posWeights)
  if (overall !== targetOverall) {
    // Scale stats toward target overall; then fine-tune on high-weight attributes
    const scale = targetOverall / Math.max(1, overall)
    for (const key of Object.keys(posWeights)) {
      stats[key] = clamp(Math.round(stats[key] * scale), 55, 95)
    }
    overall = weightedAverage(stats, posWeights)
    // If still off by more than 2, adjust top-weighted keys greedily
    let attempts = 0
    while (Math.abs(overall - targetOverall) > 2 && attempts < 3) {
      const diff = targetOverall - overall
      // sort keys by weight desc
      const keysByWeight = Object.keys(posWeights).sort((a,b)=> posWeights[b] - posWeights[a])
      let remaining = Math.abs(diff)
      for (const k of keysByWeight) {
        if (remaining <= 0) break
        const w = posWeights[k]
        // allocate adjustment proportional to weight (at least 1)
        const step = Math.max(1, Math.round(remaining * w))
        if (diff > 0) {
          stats[k] = clamp(stats[k] + step, 55, 95)
        } else {
          stats[k] = clamp(stats[k] - step, 55, 95)
        }
        remaining -= step
      }
      overall = weightedAverage(stats, posWeights)
      attempts++
    }
  }

  // Compute transfer value using OVR buckets and age multipliers (in Millions)
  function bucketRange(ovr) {
    if (ovr >= 92) return [56, 80]
    if (ovr >= 89) return [41, 55]
    if (ovr >= 86) return [31, 40]
    if (ovr >= 83) return [26, 30]
    if (ovr >= 80) return [21, 25] // matches vanilla example 21–25M
    if (ovr >= 77) return [14, 18]
    if (ovr >= 74) return [10, 14]
    if (ovr >= 71) return [7, 10]
    if (ovr >= 68) return [5, 7]   // matches vanilla example 5–7M
    if (ovr >= 65) return [4, 6]
    if (ovr >= 61) return [2, 4]
    return [1, 3]
  }
  const [lo, hi] = bucketRange(overall)
  let value = lo + Math.random() * (hi - lo)
  // Age multiplier
  const mult = (age < 23) ? GAME_CONSTANTS.FINANCE.TRANSFER_VALUE_MULTIPLIER.YOUNG_TALENT
    : (age <= 28) ? GAME_CONSTANTS.FINANCE.TRANSFER_VALUE_MULTIPLIER.PRIME
    : (age <= 32) ? GAME_CONSTANTS.FINANCE.TRANSFER_VALUE_MULTIPLIER.EXPERIENCED
    : GAME_CONSTANTS.FINANCE.TRANSFER_VALUE_MULTIPLIER.VETERAN
  value *= mult
  if (age < 21) {
    const bonusYears = 21 - age
    value += bonusYears * (GAME_CONSTANTS.FINANCE.TRANSFER_VALUE_MULTIPLIER.YOUTH_BONUS || 0)
  }
  // Small role premium for GK/ST scarcity
  if (primaryRole === 'ST' || primaryRole === 'GK') value *= 1.05
  value = Math.min(GAME_CONSTANTS.FINANCE.MAX_TRANSFER_VALUE, Math.max(GAME_CONSTANTS.FINANCE.MIN_TRANSFER_VALUE, Number(value.toFixed(2))))

  // Wage baseline in M/wk; stars earn premium
  let wage = (overall / 100) * GAME_CONSTANTS.FINANCE.BASE_WAGE_MULTIPLIER
  if (overall >= 90) wage *= 1.4
  else if (overall >= 85) wage *= 1.2
  else if (overall <= 65) wage *= 0.9
  wage = Math.max(GAME_CONSTANTS.FINANCE.MIN_PLAYER_WAGE, Number(wage.toFixed(2)))

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
