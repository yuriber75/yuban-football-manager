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

function requiredCounts(formation) {
  const f = GAME_CONSTANTS.FORMATIONS[formation] || GAME_CONSTANTS.FORMATIONS['442']
  return { GK: 1, DF: f.DF, MF: f.MF, FW: f.FW }
}

export default function Squad() {
  const { state, setState, saveNow } = useGameState()
  const team = state.teams.find(t => t.name === state.teamName)
  const [formation, setFormation] = useState(team?.tactics?.formation || '442')

  const players = useMemo(() => (team?.players || []).map(p => ({ ...p, section: roleSection(p.primaryRole) })), [team])
  const starters = players.filter(p => p.starting)

  if (!team) return <div className="card">No team found. Start a career.</div>

  function updateTeam(nextPlayers, nextFormation = formation) {
    const nextTeams = state.teams.map(t => t.name === team.name ? { ...t, players: nextPlayers, tactics: { ...(t.tactics||{}), formation: nextFormation } } : t)
    setState({ ...state, teams: nextTeams })
    saveNow()
  }

  function clearStarters() {
    updateTeam(players.map(p => ({ ...p, starting: false })))
  }

  function autoPick() {
    const req = requiredCounts(formation)
    const next = players.map(p => ({ ...p, starting: false }))
    // GK
    let picked = 0
    next.sort((a,b)=> b.overall - a.overall)
    for (const p of next) { if (p.primaryRole === 'GK' && !p.starting && picked < 1) { p.starting = true; picked++ } }
    // DF/MF/FW by section
    for (const sec of ['DF','MF','FW']) {
      const need = req[sec]
      picked = 0
      for (const p of next) {
        if (!p.starting && p.section === sec) { p.starting = true; picked++; if (picked >= need) break }
      }
    }
    updateTeam(next)
  }

  function toggleStarter(id) {
    const req = requiredCounts(formation)
    const next = players.map(p => ({ ...p }))
    const idx = next.findIndex(p => p.id === id)
    if (idx === -1) return
    const p = next[idx]
    const sec = p.section
    const currentCount = next.filter(x => x.starting && x.section === sec).length
    if (p.starting) {
      p.starting = false
    } else {
      const limit = req[sec] + (sec === 'GK' ? 0 : 0)
      if (sec === 'GK' && currentCount >= 1) return
      if (sec !== 'GK' && currentCount >= req[sec]) return
      p.starting = true
    }
    updateTeam(next)
  }

  function onChangeFormation(e) {
    const f = e.target.value
    setFormation(f)
    // When changing formation, we keep current starters but enforce counts by trimming extras
    const req = requiredCounts(f)
    const next = players.map(p => ({ ...p }))
    const bySec = { GK: [], DF: [], MF: [], FW: [] }
    next.forEach(p => { if (p.starting) bySec[p.section].push(p) })
    Object.keys(bySec).forEach(sec => {
      if (sec === 'GK') { bySec[sec] = bySec[sec].slice(0, 1) }
      else { bySec[sec] = bySec[sec].slice(0, req[sec]) }
    })
    const keepIds = new Set(Object.values(bySec).flat().map(p => p.id))
    next.forEach(p => { p.starting = keepIds.has(p.id) })
    updateTeam(next, f)
  }

  return (
    <div className="card">
      <div className="row2" style={{ alignItems: 'end' }}>
        <div>
          <h3 style={{ marginTop: 0 }}>{team.name} — Formation {formation}</h3>
        </div>
        <div>
          <label>Formation</label>
          <select value={formation} onChange={onChangeFormation}>
            {Object.keys(GAME_CONSTANTS.FORMATIONS).map(f => (
              <option key={f} value={f}>{f.slice(0,1)}-{f.slice(1,2)}-{f.slice(2)}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className="btn-secondary" onClick={autoPick} style={{ width: 'auto' }}>Auto-pick XI</button>
        <button className="btn-warn" onClick={clearStarters} style={{ width: 'auto' }}>Clear XI</button>
      </div>

      <div className="table-container" style={{ marginTop: 12 }}>
        <h3>Roster</h3>
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Name</th>
              <th>Role</th>
              <th>OVR</th>
              <th>PAS</th>
              <th>SHO</th>
              <th>DEF</th>
              <th>DRI</th>
              <th>TAC</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={!!p.starting} onChange={() => toggleStarter(p.id)} /></td>
                <td>{p.name}</td>
                <td>{p.primaryRole}</td>
                <td className="value" data-value={p.overall}>{p.overall}</td>
                <td className="value">{p.stats.pass}</td>
                <td className="value">{p.stats.shot}</td>
                <td className="value">{p.stats.def}</td>
                <td className="value">{p.stats.drib}</td>
                <td className="value">{p.stats.tackle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
