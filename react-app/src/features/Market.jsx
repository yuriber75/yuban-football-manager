import React, { useEffect, useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { useMarket } from '../market/MarketContext'

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
}

export default function Market() {
  const { state } = useGameState()
  const market = useMarket()
  const [tab, setTab] = useState('freeAgents')

  useEffect(() => { market.initMarketIfNeeded() }, [])

  const myTeam = useMemo(() => state.teams.find(t => t.name === state.teamName), [state])
  const transferList = useMemo(() => market.aggregateTransferList(state), [state])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`tab ${tab === 'freeAgents' ? 'active' : ''}`} onClick={() => setTab('freeAgents')}>Free Agents</button>
        <button className={`tab ${tab === 'transfer' ? 'active' : ''}`} onClick={() => setTab('transfer')}>Transfer List</button>
        <button className={`tab ${tab === 'mylisted' ? 'active' : ''}`} onClick={() => setTab('mylisted')}>My Listed</button>
      </div>

      {tab === 'freeAgents' && (
        <Section title={`Free Agents (${state.freeAgents.length})`}>
          <table className="roster-table roster-compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>OVR</th>
                <th>Age</th>
                <th>Wage (M/wk)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.freeAgents.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.primaryRole}</td>
                  <td>{p.overall}</td>
                  <td>{p.age}</td>
                  <td>€{(p.wage).toFixed(2)}</td>
                  <td>
                    <button onClick={() => market.signFreeAgent(p.id)} disabled={!market.canAffordWage(myTeam, p.wage)}>Sign</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'transfer' && (
        <Section title={`Transfer List (${transferList.length})`}>
          <table className="roster-table roster-compact">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>OVR</th>
                <th>Age</th>
                <th>Team</th>
                <th>Asking (M)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transferList.map((e) => {
                const { player } = market.findPlayerById(e.playerId, state) || {}
                if (!player) return null
                return (
                  <tr key={`${e.team}-${e.playerId}`}>
                    <td>{player.name}</td>
                    <td>{player.primaryRole}</td>
                    <td>{player.overall}</td>
                    <td>{player.age}</td>
                    <td>{e.team}</td>
                    <td>€{(e.asking).toFixed(2)}</td>
                    <td>
                      <button onClick={() => market.buyListedPlayer(player.id)} disabled={!market.canBuy(player, e.asking, myTeam).ok}>Buy</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'mylisted' && myTeam && (
        <Section title={`My Listed (${(myTeam.finances?.playersForSale || []).length})`}>
          <table className="roster-table roster-compact">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>OVR</th>
                <th>Asking (M)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(myTeam.finances?.playersForSale || []).map((e) => {
                const p = myTeam.players.find((pp) => pp.id === e.id)
                if (!p) return null
                return (
                  <tr key={e.id}>
                    <td>{p.name}</td>
                    <td>{p.primaryRole}</td>
                    <td>{p.overall}</td>
                    <td>€{(e.asking).toFixed(2)}</td>
                    <td><button onClick={() => market.unlistPlayer(e.id)}>Remove</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}
