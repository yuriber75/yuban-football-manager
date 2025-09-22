import React, { useState } from 'react'
import { setupNewLeague } from '../generation/leagueGenerator'
import { useGameState } from '../state/GameStateContext'

export default function NewCareer() {
  const { setState, saveNow } = useGameState()
  const [manager, setManager] = useState('Manager')
  const [team, setTeam] = useState('My FC')
  const [teamsCount, setTeamsCount] = useState(8)
  const [formation, setFormation] = useState('442')

  function start() {
    const seeded = setupNewLeague(Number(teamsCount), manager.trim() || 'Manager', team.trim() || 'My FC', formation)
    setState(seeded)
    saveNow()
  }

  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
      <h2>New Career</h2>
      <label>
        Manager name
        <input value={manager} onChange={(e) => setManager(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        Team name
        <input value={team} onChange={(e) => setTeam(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        League teams
        <input type="number" min={4} max={20} value={teamsCount} onChange={(e) => setTeamsCount(e.target.value)} />
      </label>
      <label>
        Formation
        <select value={formation} onChange={(e) => setFormation(e.target.value)}>
          <option value="442">4-4-2</option>
          <option value="433">4-3-3</option>
          <option value="343">3-4-3</option>
          <option value="352">3-5-2</option>
          <option value="451">4-5-1</option>
          <option value="541">5-4-1</option>
        </select>
      </label>
      <button onClick={start} style={{ padding: '8px 12px' }}>Start Career</button>
    </div>
  )
}
