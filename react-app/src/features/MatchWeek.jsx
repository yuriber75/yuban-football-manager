import React from 'react'
import { useGameState } from '../state/GameStateContext'
import { simulateWeek } from '../engine/matchEngine'
import { applyWeeklyFinances } from '../engine/financeEngine'

export default function MatchWeek() {
  const { state, setState, saveNow } = useGameState()
  const weekIndex = state.league.week - 1
  const fixtures = state.league.fixtures[weekIndex] || []

  const onSimulate = () => {
    const { nextState, weekResults } = simulateWeek(state)
    const withFinances = applyWeeklyFinances(nextState, weekResults)
    setState(withFinances)
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
    </div>
  )
}
