import { GAME_CONSTANTS } from '../constants'
import { makePlayer } from './playerGenerator'

const ROLE_POOL = ['GK','DR','DC','DL','MR','MC','ML','FR','ST','FL']

function pickRolesForFormation(formation = '442') {
  const structure = GAME_CONSTANTS.FORMATIONS[formation] || GAME_CONSTANTS.FORMATIONS['442']
  const roles = []
  // GK
  roles.push('GK')
  // DF
  for (let i = 0; i < (structure.DF || 4); i++) roles.push(i === 0 ? 'DL' : i === (structure.DF - 1) ? 'DR' : 'DC')
  // MF
  for (let i = 0; i < (structure.MF || 4); i++) roles.push(i === 0 ? 'ML' : i === (structure.MF - 1) ? 'MR' : 'MC')
  // FW
  for (let i = 0; i < (structure.FW || 2); i++) roles.push('ST')
  return roles
}

export function makeTeam(name, formation = '442') {
  const starterRoles = pickRolesForFormation(formation)
  const starters = starterRoles.map((r, idx) => ({ ...makePlayer(r), starting: true }))

  // bench/depth up to at least MIN_SQUAD_SIZE
  const squad = [...starters]
  while (squad.length < GAME_CONSTANTS.FINANCE.MIN_SQUAD_SIZE) {
    const r = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)]
    squad.push(makePlayer(r))
  }

  const finances = {
    cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
    wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
  }

  return {
    name,
    formation,
    tactics: { formation },
    players: squad,
    finances,
  }
}
