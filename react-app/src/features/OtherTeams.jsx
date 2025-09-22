import React, { useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { GAME_CONSTANTS } from '../constants'

function roleSection(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

function autopickTeam(players, formation) {
  const positions = GAME_CONSTANTS.POSITION_ROLES[formation] || GAME_CONSTANTS.POSITION_ROLES['442']
  const next = players.map(p => ({ ...p, starting: false, slot: undefined, benchIndex: undefined }))
  const pickForSection = (sec) => {
    const slots = positions[sec]
    const pool = next.filter(p => roleSection(p.primaryRole) === sec).sort((a,b)=> b.overall - a.overall)
    for (let i = 0; i < slots.length && i < pool.length; i++) {
      const p = pool[i]
      p.starting = true
      p.slot = { section: sec, index: i }
    }
  }
  pickForSection('GK'); pickForSection('DF'); pickForSection('MF'); pickForSection('FW')
  // Bench: best remaining 7 with max 1 GK
  const startersIds = new Set(next.filter(p => p.slot).map(p => p.id))
  const remaining = next.filter(p => !startersIds.has(p.id)).sort((a,b)=> b.overall - a.overall)
  let gkOnBench = 0
  let benchIdx = 0
  for (const p of remaining) {
    if (benchIdx >= 7) break
    if (p.primaryRole === 'GK') {
      if (gkOnBench >= 1) continue
      gkOnBench++
    }
    p.benchIndex = benchIdx++
  }
  return next
}

export default function OtherTeams() {
  const { state } = useGameState()
  const teams = state.teams || []
  const myName = state.teamName
  const aiTeams = teams.filter(t => t.name !== myName)
  const [selected, setSelected] = useState(aiTeams[0]?.name || '')
  const team = aiTeams.find(t => t.name === selected) || aiTeams[0]
  const formation = team?.tactics?.formation || team?.formation || '442'
  const viewSquad = useMemo(() => team ? autopickTeam(team.players, formation) : [], [team, formation])

  if (!aiTeams.length) return <div className="card">No other teams yet.</div>

  const starters = viewSquad.filter(p => p.slot).sort((a,b)=> a.slot.index - b.slot.index)
  const bench = viewSquad.filter(p => p.benchIndex !== undefined).sort((a,b)=> a.benchIndex - b.benchIndex)

  return (
    <div className="card">
      <div className="row2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Other Teams</h3>
        <div>
          <label style={{ marginRight: 6 }}>Team</label>
          <select value={team?.name} onChange={(e)=> setSelected(e.target.value)}>
            {aiTeams.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          <span style={{ marginLeft: 12 }}>Formation: {formation.slice(0,1)}-{formation.slice(1,2)}-{formation.slice(2)}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Starting XI (auto-selected)</h4>
        <ul style={{ columns: 2, marginTop: 6 }}>
          {starters.map(p => (
            <li key={p.id}>#{p.number} {p.name} — {p.primaryRole} (OVR {p.overall})</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Bench (7)</h4>
        <ul style={{ columns: 2, marginTop: 6 }}>
          {bench.map(p => (
            <li key={p.id}>#{p.number} {p.name} — {p.primaryRole} (OVR {p.overall})</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
