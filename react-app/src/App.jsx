import React, { useState } from 'react'
import { GameStateProvider, useGameState } from './state/GameStateContext'
import { Tabs } from './components/Tabs'
import NewCareer from './features/NewCareer'
import MatchWeek from './features/MatchWeek'
import Squad from './features/Squad'
import OtherTeams from './features/OtherTeams'
import Market from './features/Market'
import Finance from './features/Finance'
import { MarketProvider } from './market/MarketContext'

function SquadTab() {
  const { state } = useGameState()
  const team = state.teams.find((t) => t.name === state.teamName)
  if (!team) return <div>No team yet. Start a career.</div>
  return (
    <div>
      <h3>{team.name} — Formation {team.tactics?.formation || team.formation}</h3>
      <ul>
        {team.players.slice(0, 11).map((p) => (
          <li key={p.id}>{p.name} · {p.primaryRole} · OVR {p.overall}</li>
        ))}
      </ul>
    </div>
  )
}

function LeagueTab() {
  const { state } = useGameState()
  const table = state.league.table || {}
  const rows = Object.entries(table).sort((a,b)=> b[1].pts - a[1].pts || b[1].gd - a[1].gd || b[1].gf - a[1].gf)
  const totalWeeks = state.league.fixtures?.length || 0
  // baseWeek is 0-based index of the first visible week column
  // Rule: if current week <= 2, show 1 & 2 (baseWeek = 0). Otherwise show (week-1) & (week) => baseWeek = currentWeek - 2
  const computeBase = React.useCallback(() => {
    const current = state.league.week || 1
    const desired = current <= 2 ? 0 : (current - 2)
    return Math.min(Math.max(desired, 0), Math.max(totalWeeks - 2, 0))
  }, [state.league.week, totalWeeks])
  const [baseWeek, setBaseWeek] = React.useState(() => computeBase())
  React.useEffect(() => { setBaseWeek(computeBase()) }, [computeBase])

  if (!rows.length) return <div className="card">No league yet. Start a career.</div>

  const formatTableRows = () => (
    <table className="league-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, r], idx) => (
          <tr key={name} className={name === state.teamName ? 'my-team' : undefined}>
            <td>{idx + 1}</td>
            <td>{name}</td>
            <td>{r.p}</td>
            <td>{r.w}</td>
            <td>{r.d}</td>
            <td>{r.l}</td>
            <td>{r.gf}</td>
            <td>{r.ga}</td>
            <td>{r.gd}</td>
            <td><strong>{r.pts}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const getWeekItems = (weekIdx) => {
    const fixtures = state.league.fixtures?.[weekIdx] || []
    const results = (state.league.results || []).filter(r => r.week === weekIdx + 1)
    const scoreFor = (home, away) => {
      const found = results.find(r => r.home === home && r.away === away)
      return found ? `${found.homeGoals} - ${found.awayGoals}` : 'vs'
    }
    return fixtures.map((m, i) => {
      const isHomeMy = m.home === state.teamName
      const isAwayMy = m.away === state.teamName
      const isMine = isHomeMy || isAwayMy
      const homeClass = isHomeMy ? 'my-team' : (isAwayMy ? 'opponent-team' : 'home')
      const awayClass = isAwayMy ? 'my-team' : (isHomeMy ? 'opponent-team' : 'away')
      return (
        <div key={`${weekIdx}-${i}`} className={`fixture-row${isMine ? ' my-fixture' : ''}`}>
          <span className={homeClass}>{m.home}</span>
          <span className="score">{scoreFor(m.home, m.away)}</span>
          <span className={awayClass}>{m.away}</span>
        </div>
      )
    })
  }

  const canPrev = baseWeek > 0
  const canNext = baseWeek < Math.max(totalWeeks - 2, 0)

  return (
    <div className="card">
      <h3>League Table</h3>
      <div className="table-container">{formatTableRows()}</div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={()=> setBaseWeek(w => Math.max(0, w-1))} disabled={!canPrev}>{'<<'} Prev</button>
          <h4 style={{ margin: 0 }}>Weeks {baseWeek + 1} & {baseWeek + 2}</h4>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={()=> setBaseWeek(w => Math.min(Math.max(totalWeeks - 2, 0), w+1))} disabled={!canNext}>Next {'>>'}</button>
        </div>
        <div className="weeks-carousel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="week-col">
            <div className="card">
              <h4 style={{ marginTop: 0 }}>Week {baseWeek + 1}</h4>
              <div className="fixtures-list">
                {getWeekItems(baseWeek)}
              </div>
            </div>
          </div>
          <div className="week-col">
            <div className="card">
              <h4 style={{ marginTop: 0 }}>Week {baseWeek + 2}</h4>
              <div className="fixtures-list">
                {getWeekItems(baseWeek + 1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const [tab, setTab] = useState('squad')
  const { state, hasSaved, confirmLoadSaved, confirmStartNew, clearMarketBadge } = useGameState()
  const hasCareer = state?.teams?.length > 0
  const hasPendingIncoming = React.useMemo(() => {
    const offers = state.negotiations?.pendingOffers || []
    return offers.some(o => o.status === 'pending' && o.incoming && o.requiresDecision)
  }, [state.negotiations?.pendingOffers])
  const onChangeTab = (id) => {
    if (id === 'market') {
      clearMarketBadge?.()
    }
    setTab(id)
  }
  return (
    <div style={{ padding: 16 }}>
      {!hasCareer ? (
        <div className="center-screen">
          <div>
            <h1 className="app-title">Yuban Football Manager (React)</h1>
            <h2 style={{ marginTop: 0 }}>Welcome</h2>
            <NewCareer />
          </div>
        </div>
      ) : (
        <>
          <h1>Yuban Football Manager (React)</h1>
          <Tabs current={tab} onChange={onChangeTab} marketBadge={hasPendingIncoming || !!state.ui?.marketBadge} />
          {tab === 'squad' && <Squad />}
          {tab === 'teams' && <OtherTeams />}
          {tab === 'market' && <Market />}
          {tab === 'finance' && <Finance />}
          {tab === 'league' && <LeagueTab />}
          {tab === 'match' && <MatchWeek />}
        </>
      )}
    </div>
  )}

export default function App() {
  return (
    <GameStateProvider>
      <MarketProvider>
        <AppShell />
      </MarketProvider>
    </GameStateProvider>
  )
}
