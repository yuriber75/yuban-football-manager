import { GAME_CONSTANTS } from '../constants'
import { makePlayer } from './playerGenerator'

const ROLE_POOL = ['GK','DR','DC','DL','MR','MC','ML','FR','ST','FL']

function makeMany(role, count) {
  const arr = []
  for (let i = 0; i < count; i++) arr.push(makePlayer(role))
  return arr
}

function roleSection(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

function assignJerseyNumbers(squad) {
  // Classic-ish pools, fallback to next free number starting at 30+
  const POOLS = {
    GK: [1, 12, 13, 22, 23, 31],
    DF: [2, 3, 4, 5, 6, 15, 16, 20, 21, 24, 25],
    MF: [6, 7, 8, 10, 11, 14, 17, 18, 19, 26],
    FW: [9, 10, 17, 18, 19, 27, 28],
  }
  const used = new Set()
  let fallback = 30
  // Distribute by section using pools; ensure uniqueness
  for (const p of squad) {
    const sec = roleSection(p.primaryRole)
    const pool = POOLS[sec] || []
    let assigned = null
    for (const n of pool) {
      if (!used.has(n)) { assigned = n; break }
    }
    if (assigned == null) {
      while (used.has(fallback)) fallback++
      assigned = fallback
      fallback++
    }
    p.number = assigned
    used.add(assigned)
  }
  return squad
}

function generateSquadByCounts() {
  // 3 GK, 7 DF, 7 MF, 4 FW
  const squad = []
  squad.push(...makeMany('GK', 3))
  // defenders distribution: 3 DC, 2 DR, 2 DL
  squad.push(...makeMany('DC', 3))
  squad.push(...makeMany('DR', 2))
  squad.push(...makeMany('DL', 2))
  // midfielders: 3 MC, 2 MR, 2 ML
  squad.push(...makeMany('MC', 3))
  squad.push(...makeMany('MR', 2))
  squad.push(...makeMany('ML', 2))
  // forwards: 2 ST, 1 FR, 1 FL
  squad.push(...makeMany('ST', 2))
  squad.push(...makeMany('FR', 1))
  squad.push(...makeMany('FL', 1))
  return squad
}

export function makeTeam(name, formation = '442') {
  // generate fixed-size squad by role buckets
  const squad = assignJerseyNumbers(generateSquadByCounts().map(p => ({ ...p, starting: false })))

  const finances = {
    cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
    wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
    stadiumCapacity: Math.floor(
      GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY + Math.random() * (GAME_CONSTANTS.FINANCE.MAX_STADIUM_CAPACITY - GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY)
    ),
    attendance: Math.min(
      GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE,
      GAME_CONSTANTS.FINANCE.MAX_STADIUM_CAPACITY
    ),
  }

  return {
    name,
    formation,
    tactics: { formation },
    players: squad,
    finances,
  }
}
