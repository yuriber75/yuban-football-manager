import { GAME_CONSTANTS } from '../constants'
import { makePlayer } from './playerGenerator'

const ROLE_POOL = ['GK','DR','DC','DL','MR','MC','ML','FR','ST','FL']

function makeMany(role, count) {
  const arr = []
  for (let i = 0; i < count; i++) arr.push(makePlayer(role))
  return arr
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
  const squad = generateSquadByCounts().map(p => ({ ...p, starting: false }))

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
