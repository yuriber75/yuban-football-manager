import React, { useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { simulateWeek } from '../engine/matchEngine'
import { applyWeeklyFinances } from '../engine/financeEngine'

export default function MatchWeek() {
  const { state, setState, saveNow } = useGameState()
  const [lastSummary, setLastSummary] = useState(null)
  const weekIndex = state.league.week - 1
  const fixtures = state.league.fixtures[weekIndex] || []

  const onSimulate = () => {
    const { nextState, weekResults } = simulateWeek(state)
    const { nextState: withFinances, breakdowns } = applyWeeklyFinances(nextState, weekResults)
    setState(withFinances)
    const myName = state.teamName
    if (breakdowns && breakdowns[myName]) {
      const b = breakdowns[myName]
      setLastSummary({
        gate: b.gate,
        sponsor: b.sponsor,
        wages: b.wages,
        maintenance: b.maintenance,
        net: Number((b.gate + b.sponsor - b.wages - b.maintenance).toFixed(3)),
      })
    } else {
      setLastSummary(null)
    }
    saveNow()
  }

  if (!fixtures.length) {
    return (
      <div>
        <h3>No fixtures to play</h3>
        <p>You may have reached the end of the schedule.</p>
      </div>
    )
  }

  return (
    <div>
      <h3>Week {state.league.week} Fixtures</h3>
      <ul>
        {fixtures.map((m, idx) => (
          <li key={idx}>{m.home} vs {m.away}</li>
        ))}
      </ul>
      <button onClick={onSimulate}>Simulate Week</button>
      {lastSummary && (
        <div style={{ marginTop: 12 }}>
          <h4>Weekly Finance Summary — {state.teamName}</h4>
          <ul>
            <li>Gate receipts: €{lastSummary.gate.toFixed(3)}M</li>
            <li>Sponsor: €{lastSummary.sponsor.toFixed(3)}M</li>
            <li>Wages: €{lastSummary.wages.toFixed(3)}M</li>
            <li>Maintenance: €{lastSummary.maintenance.toFixed(3)}M</li>
            <li><strong>Net change: €{lastSummary.net.toFixed(3)}M</strong></li>
          </ul>
        </div>
      )}
    </div>
  )
}
