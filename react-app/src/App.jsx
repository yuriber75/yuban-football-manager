import React, { useState } from 'react'
import { GameStateProvider } from './state/GameStateContext'
import { Tabs } from './components/Tabs'

function AppShell() {
  const [tab, setTab] = useState('squad')
  return (
    <div style={{ padding: 16 }}>
      <h1>Yuban Football Manager (React)</h1>
      <Tabs current={tab} onChange={setTab} />
      {tab === 'squad' && <div>Squad view coming soon…</div>}
      {tab === 'market' && <div>Market view coming soon…</div>}
      {tab === 'finance' && <div>Finance view coming soon…</div>}
      {tab === 'league' && <div>League view coming soon…</div>}
      {tab === 'match' && <div>Match preview/sim coming soon…</div>}
    </div>
  )}

export default function App() {
  return (
    <GameStateProvider>
      <AppShell />
    </GameStateProvider>
  )
}
