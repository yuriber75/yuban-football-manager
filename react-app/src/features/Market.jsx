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
        <button className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>Offers</button>
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
              {state.freeAgents.map((p) => {
                const warn = market.wageWarning(myTeam, p.wage)
                const disabled = !market.canAffordWage(myTeam, p.wage) || market.wouldExceedMaxOnBuy?.(myTeam, p)
                const title = disabled ? (!market.canAffordWage(myTeam, p.wage) ? 'Wage budget exceeded' : 'Would exceed per-role max') : (warn ? 'Warning: near wage cap' : '')
                return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.primaryRole}</td>
                  <td>{p.overall}</td>
                  <td>{p.age}</td>
                  <td>€{(p.wage).toFixed(2)}</td>
                  <td>
                    <button title={title} onClick={() => { if (confirm(`Bid for ${p.name} at wage €${p.wage.toFixed(2)}M/wk?`)) market.submitOfferForFreeAgent(p.id, p.wage) }} disabled={disabled}>Bid</button>
                  </td>
                </tr>
              )})}
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
                const check = market.canBuy(player, e.asking, myTeam)
                const warn = market.wageWarning(myTeam, player.wage)
                return (
                  <tr key={`${e.team}-${e.playerId}`}>
                    <td>{player.name}</td>
                    <td>{player.primaryRole}</td>
                    <td>{player.overall}</td>
                    <td>{player.age}</td>
                    <td>{e.team}</td>
                    <td>€{(e.asking).toFixed(2)}</td>
                    <td>
                      <button title={check.ok ? (warn ? 'Warning: near wage cap' : '') : check.reason} onClick={() => { if (confirm(`Bid €${e.asking.toFixed(2)}M + wage €${player.wage.toFixed(2)}M/wk for ${player.name}?`)) market.submitOfferForListed(player.id, e.team, e.asking, player.wage) }} disabled={!check.ok}>Bid</button>
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
                    <td><button onClick={() => { if (confirm(`Remove ${p.name} from your transfer list?`)) market.unlistPlayer(e.id) }}>Remove</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'offers' && (
        <>
          <Section title="Incoming Offers">
            <table className="roster-table roster-compact">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>From</th>
                  <th>Fee (M)</th>
                  <th>Wage (M/wk)</th>
                  <th>Deadline</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(state.negotiations?.pendingOffers || []).filter(o => o.incoming && o.status === 'pending').map(o => {
                  const { player } = market.findPlayerById(o.playerId, state) || {}
                  if (!player) return null
                  return (
                    <tr key={o.id}>
                      <td>{player.name}</td>
                      <td>{o.buyer}</td>
                      <td>€{o.amount.toFixed(2)}</td>
                      <td>€{o.wage.toFixed(2)}</td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>
                        <button onClick={() => { if (confirm(`Accept offer from ${o.buyer} for ${player.name} at €${o.amount.toFixed(2)}M + wage €${o.wage.toFixed(2)}M/wk?`)) market.acceptIncomingOffer(o.id) }}>Accept</button>
                        <button onClick={() => { if (confirm(`Reject offer from ${o.buyer} for ${player.name}?`)) market.rejectIncomingOffer(o.id) }} style={{ marginLeft: 6 }}>Reject</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>

          <Section title="My Outgoing Offers">
            <table className="roster-table roster-compact">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>To</th>
                  <th>Fee/Wage</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(state.negotiations?.pendingOffers || []).filter(o => o.buyer === state.teamName).map(o => {
                  const { player } = market.findPlayerById(o.playerId, state) || {}
                  if (!player) return null
                  return (
                    <tr key={o.id}>
                      <td>{player.name}</td>
                      <td>{o.seller || 'Free Agent'}</td>
                      <td>{o.type === 'free' ? `W: €${o.wage.toFixed(2)}` : `F: €${o.amount.toFixed(2)}, W: €${o.wage.toFixed(2)}`}</td>
                      <td>{o.status}</td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>{o.status === 'pending' && <button onClick={() => { if (confirm('Cancel this offer?')) market.cancelOutgoingOffer(o.id) }}>Cancel</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        </>
      )}
    </div>
  )
}
