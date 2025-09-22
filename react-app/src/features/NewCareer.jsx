import React, { useState } from 'react'
import { setupNewLeague } from '../generation/leagueGenerator'
import { useGameState } from '../state/GameStateContext'

export default function NewCareer() {
  const { setState, saveNow } = useGameState()
  const [manager, setManager] = useState('Manager')
  const [team, setTeam] = useState('My FC')
  const [teamsCount, setTeamsCount] = useState(16)
  // default formation is handled internally as 4-4-2

  function start() {
    const seeded = setupNewLeague(Number(teamsCount), manager.trim() || 'Manager', team.trim() || 'My FC', '442')
    setState(seeded)
    saveNow()
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 12 }}>
      <h2 style={{ marginTop: 0 }}>New Career</h2>
      <div className="row2">
        <div>
          <label>Manager name</label>
          <input value={manager} onChange={(e) => setManager(e.target.value)} />
        </div>
        <div>
          <label>Team name</label>
          <input value={team} onChange={(e) => setTeam(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>League teams</label>
        <input type="number" min={8} max={20} value={teamsCount} onChange={(e) => setTeamsCount(e.target.value)} />
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={start}>Start Career</button>
      </div>
    </div>
  )
}
