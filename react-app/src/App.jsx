import React, { useState } from 'react'
import { GameStateProvider, useGameState } from './state/GameStateContext'
import { Tabs } from './components/Tabs'
import NewCareer from './features/NewCareer'
import MatchWeek from './features/MatchWeek'

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
  const weekPlayed = state.league.currentViewWeek
  const lastWeekResults = (state.league.results || []).filter(r => r.week === weekPlayed)
  if (!rows.length) return <div>No league yet. Start a career.</div>
  return (
    <div>
      <h3>League Table (Top 10)</h3>
      <ol>
        {rows.slice(0, 10).map(([name, r]) => (
          <li key={name}>{name}: {r.pts} pts (P{r.p} W{r.w} D{r.d} L{r.l} GF{r.gf} GA{r.ga} GD{r.gd})</li>
        ))}
      </ol>
      {!!lastWeekResults.length && (
        <div>
          <h4>Week {weekPlayed} Results</h4>
          <ul>
            {lastWeekResults.map((r, idx) => (
              <li key={idx}>{r.home} {r.homeGoals} - {r.awayGoals} {r.away}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AppShell() {
  const [tab, setTab] = useState('squad')
  const { state } = useGameState()
  const hasCareer = state?.teams?.length > 0
  return (
    <div style={{ padding: 16 }}>
      <h1>Yuban Football Manager (React)</h1>
      <Tabs current={tab} onChange={setTab} />
      {!hasCareer ? (
        <NewCareer />
      ) : (
        <>
          {tab === 'squad' && <SquadTab />}
          {tab === 'market' && <div>Market view coming soon…</div>}
          {tab === 'finance' && <div>Finance view coming soon…</div>}
          {tab === 'league' && <LeagueTab />}
          {tab === 'match' && <MatchWeek />}
        </>
      )}
    </div>
  )}

export default function App() {
  return (
    <GameStateProvider>
      <AppShell />
    </GameStateProvider>
  )
}
