import React, { useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { simulateWeek } from '../engine/matchEngine'
import { applyWeeklyFinances } from '../engine/financeEngine'
import { useMarket } from '../market/MarketContext'
import { formatMillions } from '../utils/formatters'

export default function MatchWeek() {
  const { state, setState, saveNow } = useGameState()
  const market = useMarket()
  const weekIndex = state.league.week - 1
  const fixtures = state.league.fixtures[weekIndex] || []

  const onSimulate = () => {
    const { nextState, weekResults } = simulateWeek(state)
  const { nextState: withFinances, breakdowns } = applyWeeklyFinances(nextState, weekResults)
  setState(withFinances)
    // Weekly cadence (vanilla parity): resolve expiring negotiations first, then run market churn
    market.resolveNegotiations()
    market.processWeeklyMarket()
    saveNow()
    // Build weekly report for my team
    const my = withFinances.teams.find(t => t.name === withFinances.teamName)
    const br = breakdowns[withFinances.teamName]
    if (my && br) {
      const money = (v) => formatMillions(v, { decimals: 2 })
      const wagesSorted = my.players.slice().sort((a,b)=> (b.wage||0) - (a.wage||0))
      const top3 = wagesSorted.slice(0,3)
      const sponsorLeft = my.finances?.sponsorContract?.weeksRemaining ?? 0
      const net = (br.gate + br.sponsor + br.passive) - (br.wages + br.maintenance)
      const html = `
        <div>
          <h3 style="margin-top:0">Weekly Report — Week ${withFinances.league.week}</h3>
          <ul>
            <li>Net: <strong>${money(net)}</strong></li>
            <li>Income — Gate ${money(br.gate)}, Sponsor ${money(br.sponsor)} ${br.sponsorBonus?`(+${money(br.sponsorBonus)} bonus)`:''}, Passive ${money(br.passive)}</li>
            <li>Expenses — Wages ${money(br.wages)}, Maintenance ${money(br.maintenance)}</li>
            <li>Top wages: ${top3.map(p=>`${p.name} ${money(p.wage)} /wk`).join(', ')}</li>
            <li>Sponsor weeks remaining: ${sponsorLeft}</li>
          </ul>
        </div>`
      window.debugUI?.showModal?.('Weekly Report', html)
    }
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
      <ul className="matchweek-list">
        {fixtures.map((m, idx) => {
          const isHomeMy = m.home === state.teamName
          const isAwayMy = m.away === state.teamName
          const isMyFixture = isHomeMy || isAwayMy
          const homeClass = isHomeMy ? 'my-team' : (isAwayMy ? 'opponent-team' : 'home')
          const awayClass = isAwayMy ? 'my-team' : (isHomeMy ? 'opponent-team' : 'away')
          return (
            <li key={idx} className={isMyFixture ? 'my-fixture' : undefined}>
              <span className={homeClass}>{m.home}</span>
              <span className="vs">vs</span>
              <span className={awayClass}>{m.away}</span>
            </li>
          )
        })}
      </ul>
      <button onClick={onSimulate}>Simulate Week</button>
    </div>
  )
}
