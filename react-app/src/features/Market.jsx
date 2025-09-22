import React, { useEffect, useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { useMarket } from '../market/MarketContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatMoney } from '../utils/formatters'

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
  const [confirm, setConfirm] = useState({ open: false })

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
                const money = (v) => formatMoney(v, { decimals: 2 })
                return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.primaryRole}</td>
                  <td>{p.overall}</td>
                  <td>{p.age}</td>
                  <td>{money(p.wage)}/wk</td>
                  <td>
                    <button title={title} onClick={() => setConfirm({ open: true, message: `Bid for ${p.name} at ${money(p.wage)}/wk?`, onConfirm: () => { market.submitOfferForFreeAgent(p.id, p.wage); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} disabled={disabled}>Bid</button>
                    {!disabled && warn && <span className="hint warn">Near wage cap</span>}
                    {disabled && <span className="hint error">{title}</span>}
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
                const money = (v) => formatMoney(v, { decimals: 2 })
                return (
                  <tr key={`${e.team}-${e.playerId}`}>
                    <td>{player.name}</td>
                    <td>{player.primaryRole}</td>
                    <td>{player.overall}</td>
                    <td>{player.age}</td>
                    <td>{e.team}</td>
                    <td>{money(e.asking)}</td>
                    <td>
                      <button title={check.ok ? (warn ? 'Warning: near wage cap' : '') : check.reason} onClick={() => setConfirm({ open: true, message: `Bid ${money(e.asking)} + wage ${money(player.wage)}/wk for ${player.name}?`, onConfirm: () => { market.submitOfferForListed(player.id, e.team, e.asking, player.wage); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} disabled={!check.ok}>Bid</button>
                      {(!check.ok) && <span className="hint error">{check.reason}</span>}
                      {(check.ok && warn) && <span className="hint warn">Near wage cap</span>}
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
                const money = (v) => formatMoney(v, { decimals: 2 })
                return (
                  <tr key={e.id}>
                    <td>{p.name}</td>
                    <td>{p.primaryRole}</td>
                    <td>{p.overall}</td>
                    <td>{money(e.asking)}</td>
                    <td><button onClick={() => setConfirm({ open: true, message: `Remove ${p.name} from your transfer list?`, onConfirm: () => { market.unlistPlayer(e.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Remove</button></td>
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
                  const money = (v) => formatMoney(v, { decimals: 2 })
                  return (
                    <tr key={o.id}>
                      <td>{player.name}</td>
                      <td>{o.buyer}</td>
                      <td>{money(o.amount)}</td>
                      <td>{money(o.wage)}/wk</td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>
                        <button onClick={() => setConfirm({ open: true, message: `Accept offer from ${o.buyer} for ${player.name} at ${money(o.amount)} + wage ${money(o.wage)}/wk?`, onConfirm: () => { market.acceptIncomingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Accept</button>
                        <button onClick={() => setConfirm({ open: true, message: `Reject offer from ${o.buyer} for ${player.name}?`, onConfirm: () => { market.rejectIncomingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} style={{ marginLeft: 6 }}>Reject</button>
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
                  const money = (v) => formatMoney(v, { decimals: 2 })
                  return (
                    <tr key={o.id}>
                      <td>{player.name}</td>
                      <td>{o.seller || 'Free Agent'}</td>
                      <td>{o.type === 'free' ? `W: ${money(o.wage)}/wk` : `F: ${money(o.amount)}, W: ${money(o.wage)}/wk`}</td>
                      <td>{o.status}</td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>{o.status === 'pending' && <button onClick={() => setConfirm({ open: true, message: 'Cancel this offer?', onConfirm: () => { market.cancelOutgoingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Cancel</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        </>
      )}
      <ConfirmDialog open={!!confirm.open} message={confirm.message} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />
    </div>
  )
}
