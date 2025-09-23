import React, { useEffect, useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { useMarket } from '../market/MarketContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatMillions, formatMoney, formatKFromMillions } from '../utils/formatters'
import { GAME_CONSTANTS } from '../constants'

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
  const [faBid, setFaBid] = useState({}) // { [playerId]: { wage, len } }
  const [tlBid, setTlBid] = useState({}) // { [playerId]: { fee, wage, len } }
  const [myAskings, setMyAskings] = useState({}) // { [playerId]: asking }
  const [faSort, setFaSort] = useState({ key: 'overall', dir: 'desc' })
  const [tlSort, setTlSort] = useState({ key: 'asking', dir: 'desc' })

  useEffect(() => { market.initMarketIfNeeded() }, [])

  const myTeam = useMemo(() => state.teams.find(t => t.name === state.teamName), [state])
  const transferList = useMemo(() => market.aggregateTransferList(state), [state])

  const toggleSort = (sort, setSort, key) => {
    if (sort.key === key) setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    else setSort({ key, dir: 'asc' })
  }
  const arrow = (sort, key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const sortedFreeAgents = useMemo(() => {
    const arr = (state.freeAgents || []).slice()
    const dir = faSort.dir === 'asc' ? 1 : -1
    const val = (p, key) => {
      if (key === 'name') return p.name || ''
      if (key === 'role') return p.primaryRole || ''
      if (key === 'overall') return Number(p.overall || 0)
      if (key === 'age') return Number(p.age || 0)
      if (key === 'wage') return Number(p.wage || 0)
      return 0
    }
    arr.sort((a,b) => {
      const A = val(a, faSort.key)
      const B = val(b, faSort.key)
      if (typeof A === 'string' || typeof B === 'string') return A.localeCompare(B) * dir
      return (A - B) * dir
    })
    return arr
  }, [state.freeAgents, faSort])

  const transferListRows = useMemo(() => {
    const rows = (transferList || [])
      .map(e => {
        const found = market.findPlayerById(e.playerId, state) || {}
        const p = found.player
        if (!p) return null
        return { e, p }
      })
      .filter(Boolean)
    const dir = tlSort.dir === 'asc' ? 1 : -1
    const val = (row, key) => {
      if (key === 'player') return row.p.name || ''
      if (key === 'role') return row.p.primaryRole || ''
      if (key === 'overall') return Number(row.p.overall || 0)
      if (key === 'age') return Number(row.p.age || 0)
      if (key === 'team') return row.e.team || ''
      if (key === 'asking') return Number(row.e.asking || 0)
      return 0
    }
    rows.sort((a,b) => {
      const A = val(a, tlSort.key)
      const B = val(b, tlSort.key)
      if (typeof A === 'string' || typeof B === 'string') return A.localeCompare(B) * dir
      return (A - B) * dir
    })
    return rows
  }, [transferList, tlSort, state])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`tab ${tab === 'freeAgents' ? 'active' : ''}`} onClick={() => setTab('freeAgents')}>Free Agents</button>
        <button className={`tab ${tab === 'transfer' ? 'active' : ''}`} onClick={() => setTab('transfer')}>Transfer List</button>
        <button className={`tab ${tab === 'myplayers' ? 'active' : ''}`} onClick={() => setTab('myplayers')}>My Players</button>
        <button className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>Offers</button>
      </div>

      {tab === 'freeAgents' && (
        <Section title={`Free Agents (${state.freeAgents.length})`}>
          <table className="roster-table roster-compact">
            <thead>
              <tr>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(faSort, setFaSort, 'name')}>Name{arrow(faSort,'name')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(faSort, setFaSort, 'role')}>Role{arrow(faSort,'role')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(faSort, setFaSort, 'overall')}>OVR{arrow(faSort,'overall')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(faSort, setFaSort, 'age')}>Age{arrow(faSort,'age')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(faSort, setFaSort, 'wage')}>Wage (€/wk){arrow(faSort,'wage')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedFreeAgents.map((p) => {
                const cfg = faBid[p.id] || { wage: p.wage, len: 2 }
                const warn = market.wageWarning(myTeam, cfg.wage)
                const afford = market.canAffordWage(myTeam, cfg.wage)
                const exceedRole = market.wouldExceedMaxOnBuy?.(myTeam, p)
                const disabled = !afford || exceedRole
                const stats = market.getOfferStatsForPlayer(p.id)
                let reason = ''
                if (!afford) {
                  const { pendingWages } = market.getPendingCommitments(myTeam.name)
                  const current = myTeam.players.reduce((s, pl) => s + (pl.wage || 0), 0)
                  const budget = myTeam.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET
                  const cap = market.computeSalaryCap?.(myTeam) ?? budget
                  const hard = Math.min(budget, Math.max(0.01, cap))
                  // Values are in millions per week; show as €k/week for clarity
                  reason = `Wage budget exceeded (with pending offers): current ${formatKFromMillions(current)} + pending ${formatKFromMillions(pendingWages)} + offer ${formatKFromMillions(cfg.wage)} > limit ${formatKFromMillions(hard)}`
                } else if (exceedRole) {
                  reason = 'Would exceed per-role max'
                }
                const title = disabled ? reason : (warn ? 'Warning: near wage cap' : '')
                const moneyM = (v) => formatMillions(v, { decimals: 2 })
                const moneyWage = (v) => formatMoney(Math.round((v||0) * 1_000_000), { decimals: 0, useCommaDecimal: true })
                return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.primaryRole}</td>
                  <td>{p.overall}</td>
                  <td>{p.age}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'nowrap', whiteSpace:'nowrap' }}>
                      <input style={{ width: 100 }} type="number" min={Math.round(GAME_CONSTANTS.FINANCE.WAGE_LIMITS.MIN_WEEKLY*1_000_000)} step="1000" value={Math.round((cfg.wage||0) * 1_000_000)}
                        onChange={(e)=> {
                          const euros = Math.max(0, Number(e.target.value) || 0)
                          const inM = Number((euros/1_000_000).toFixed(3))
                          setFaBid(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), wage: inM } }))
                        }} />
                      <span>€/wk</span>
                      <span>Len</span>
                      <input style={{ width: 46 }} type="number" min={GAME_CONSTANTS.FINANCE.MIN_CONTRACT_LENGTH} max={GAME_CONSTANTS.FINANCE.MAX_CONTRACT_LENGTH} value={cfg.len}
                        onChange={(e)=> setFaBid(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), len: Math.max(GAME_CONSTANTS.FINANCE.MIN_CONTRACT_LENGTH, Math.min(GAME_CONSTANTS.FINANCE.MAX_CONTRACT_LENGTH, Number(e.target.value)||2)) } }))} />
                    </div>
                  </td>
                  <td>
                    <button title={title} onClick={() => setConfirm({ open: true, message: `Bid for ${p.name} at ${moneyWage(cfg.wage)} /wk for ${cfg.len}y?`, onConfirm: () => { market.submitOfferForFreeAgent(p.id, cfg.wage, cfg.len); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} disabled={disabled}>Bid</button>
                    {stats.total > 0 && (
                      <span className="hint" style={{ marginLeft: 6 }} title="Best offer wins at deadline">
                        Competing offers: {stats.total}{stats.rankOfMine ? ` (your rank ${stats.rankOfMine}/${stats.total})` : ''}
                      </span>
                    )}
                    {!disabled && warn && (()=>{ const budget = myTeam.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET; const cap = market.computeSalaryCap?.(myTeam) ?? budget; const hard = Math.min(budget, Math.max(0.01, cap)); return <span className="hint warn" title={`Cap warn: limit ${formatKFromMillions(hard)} (min of budget ${formatKFromMillions(budget)} and cap ${formatKFromMillions(cap)})`}>Near wage cap</span>; })()}
                    {disabled && <span className="hint error">{reason || title}</span>}
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
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'player')}>Player{arrow(tlSort,'player')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'role')}>Role{arrow(tlSort,'role')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'overall')}>OVR{arrow(tlSort,'overall')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'age')}>Age{arrow(tlSort,'age')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'team')}>Team{arrow(tlSort,'team')}</th>
                <th style={{cursor:'pointer'}} onClick={()=> toggleSort(tlSort, setTlSort, 'asking')}>Asking (M){arrow(tlSort,'asking')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transferListRows.map(({ e, p: player }) => {
                const cfg = tlBid[player.id] || { fee: e.asking, wage: player.wage, len: 3 }
                const check = market.canBuy(player, cfg.fee, myTeam, { wage: cfg.wage })
                const warn = market.wageWarning(myTeam, cfg.wage)
                const stats = market.getOfferStatsForPlayer(player.id)
                const moneyM = (v) => formatMillions(v, { decimals: 2 })
                const moneyWage = (v) => formatMoney(Math.round((v||0) * 1_000_000), { decimals: 0, useCommaDecimal: true })
                // Build tooltip with pending math when not ok
                let tooltip = ''
                if (!check.ok) {
                  if (check.reason?.startsWith('Insufficient cash')) {
                    const { pendingFees } = market.getPendingCommitments(myTeam.name)
                    const cash = myTeam.finances?.cash ?? 0
                    tooltip = `${check.reason}: cash ${cash.toFixed(2)} < fee ${Number(cfg.fee).toFixed(2)} + pending ${pendingFees.toFixed(2)}`
                  } else if (check.reason?.startsWith('Wage budget exceeded')) {
                    const { pendingWages } = market.getPendingCommitments(myTeam.name)
                    const current = myTeam.players.reduce((s, pl) => s + (pl.wage || 0), 0)
                    const budget = myTeam.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET
                    const cap = market.computeSalaryCap?.(myTeam) ?? budget
                    const hard = Math.min(budget, Math.max(0.01, cap))
                    // Show all wage components in €k/week
                    tooltip = `${check.reason}: current ${formatKFromMillions(current)} + pending ${formatKFromMillions(pendingWages)} + offer ${formatKFromMillions(Number(cfg.wage))} > limit ${formatKFromMillions(hard)}`
                  } else if (check.reason === 'Would exceed per-role max') {
                    tooltip = 'Per-role maximum would be exceeded by this signing'
                  } else if (check.reason === 'Squad size limit') {
                    tooltip = `Max squad size ${GAME_CONSTANTS.FINANCE.MAX_SQUAD_SIZE}`
                  }
                }
                return (
                  <tr key={`${e.team}-${e.playerId}`}>
                    <td>{player.name}</td>
                    <td>{player.primaryRole}</td>
                    <td>{player.overall}</td>
                    <td>{player.age}</td>
                    <td>{e.team}</td>
                    <td>
                      <input style={{ width: 70 }} type="number" min={GAME_CONSTANTS.FINANCE.MIN_TRANSFER_VALUE} step="0.01" value={cfg.fee}
                        onChange={(e)=> setTlBid(prev => ({ ...prev, [player.id]: { ...(prev[player.id]||{}), fee: Number(e.target.value) || 0 } }))} /> M
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <span>W:</span>
                        <input style={{ width: 100 }} type="number" min={Math.round(GAME_CONSTANTS.FINANCE.WAGE_LIMITS.MIN_WEEKLY*1_000_000)} step="1000" value={Math.round((cfg.wage||0) * 1_000_000)}
                          onChange={(e)=> {
                            const euros = Math.max(0, Number(e.target.value) || 0)
                            const inM = Number((euros/1_000_000).toFixed(3))
                            setTlBid(prev => ({ ...prev, [player.id]: { ...(prev[player.id]||{}), wage: inM } }))
                          }} />
                        <span>€/wk</span>
                        <span>Len</span>
                        <input style={{ width: 46 }} type="number" min={GAME_CONSTANTS.FINANCE.MIN_CONTRACT_LENGTH} max={GAME_CONSTANTS.FINANCE.MAX_CONTRACT_LENGTH} value={cfg.len}
                          onChange={(e)=> setTlBid(prev => ({ ...prev, [player.id]: { ...(prev[player.id]||{}), len: Math.max(GAME_CONSTANTS.FINANCE.MIN_CONTRACT_LENGTH, Math.min(GAME_CONSTANTS.FINANCE.MAX_CONTRACT_LENGTH, Number(e.target.value)||3)) } }))} />
                        <button title={check.ok ? (warn ? 'Warning: near wage cap' : '') : (tooltip || check.reason)} onClick={() => setConfirm({ open: true, message: `Bid ${moneyM(cfg.fee)} + wage ${moneyWage(cfg.wage)} /wk for ${player.name} (${cfg.len}y)?`, onConfirm: () => { market.submitOfferForListed(player.id, e.team, cfg.fee, cfg.wage, cfg.len); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} disabled={!check.ok}>Bid</button>
                        {stats.total > 0 && (
                          <span className="hint" style={{ marginLeft: 6 }} title="Best offer wins at deadline">
                            Competing offers: {stats.total}{stats.rankOfMine ? ` (your rank ${stats.rankOfMine}/${stats.total})` : ''}
                          </span>
                        )}
                      </div>
                      {(!check.ok) && <span className="hint error" title={tooltip || check.reason}>{check.reason}</span>}
                      {(check.ok && warn) && <span className="hint warn">Near wage cap</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {tab === 'myplayers' && myTeam && (
        <Section title={`My Players (${myTeam.players.length})`}>
          <table className="roster-table roster-compact">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>OVR</th>
                <th>Wage (€/wk)</th>
                <th>Value (M)</th>
                <th>Listing</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myTeam.players
                .slice()
                .sort((a,b)=> b.overall - a.overall)
                .map((p) => {
                  const listed = (myTeam.finances?.playersForSale || []).find(e => e.id === p.id)
                  const moneyM = (v) => formatMillions(v, { decimals: 2 })
                  const asking = myAskings[p.id] ?? (listed ? listed.asking : Number((p.value).toFixed(2)))
                  const can = market.canListWithReason(myTeam, p.id)
                  const title = listed ? `Listed at ${moneyM(listed.asking)}` : (can.ok ? '' : can.reason)
                  return (
                    <tr key={p.id} className={listed ? 'highlight-amber' : undefined}>
                      <td>{p.name}</td>
                      <td>{p.primaryRole}</td>
                      <td>{p.overall}</td>
                      <td>{formatMoney(Math.round((p.wage||0) * 1_000_000), { decimals: 0, useCommaDecimal: true })} /wk</td>
                      <td>{moneyM(p.value || 0)}</td>
                      <td>
                        {listed ? (
                          <span>{moneyM(listed.asking)}</span>
                        ) : (
                          <>
                            <input
                              style={{ width: 70 }}
                              type="number"
                              min={Math.max(GAME_CONSTANTS.FINANCE.MIN_TRANSFER_VALUE, 0)}
                              step="0.01"
                              value={asking}
                              onChange={(e)=> setMyAskings(prev => ({ ...prev, [p.id]: Number(e.target.value) || 0 }))}
                            /> M
                          </>
                        )}
                      </td>
                      <td>
                        {listed ? (
                          <button title={title} onClick={() => setConfirm({ open: true, message: `Unlist ${p.name}?`, onConfirm: () => { market.unlistPlayer(p.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Unlist</button>
                        ) : (
                          <button title={title} disabled={!can.ok} onClick={() => setConfirm({ open: true, message: `List ${p.name} for ${moneyM(asking)}?`, onConfirm: () => { market.listPlayer(p.id, Number(asking)); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>List</button>
                        )}
                        {!listed && !can.ok && <span className="hint error" style={{ marginLeft: 6 }}>{can.reason}</span>}
                      </td>
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
                {(state.negotiations?.pendingOffers || []).filter(o => o.incoming).map(o => {
                  const { player } = market.findPlayerById(o.playerId, state) || {}
                  if (!player) return null
                  const money = (v) => formatMillions(v, { decimals: 2 })
                  return (
                    <tr key={o.id} className={o.status !== 'pending' ? (o.status === 'accepted' ? 'row-accepted' : 'row-inactive') : ''}>
                      <td>{player.name}</td>
                      <td>{o.buyer}</td>
                      <td>{money(o.amount)}</td>
                      <td>{money(o.wage)} /wk</td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>
                        {o.status === 'pending' && (
                          <>
                            <button onClick={() => setConfirm({ open: true, message: `Accept offer from ${o.buyer} for ${player.name} at ${money(o.amount)} + wage ${money(o.wage)} /wk?`, onConfirm: () => { market.acceptIncomingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Accept</button>
                            <button onClick={() => setConfirm({ open: true, message: `Reject offer from ${o.buyer} for ${player.name}?`, onConfirm: () => { market.rejectIncomingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })} style={{ marginLeft: 6 }}>Reject</button>
                          </>
                        )}
                        {o.status !== 'pending' && <span className={`hint ${o.status === 'accepted' ? 'success' : 'error'}`} style={{ marginLeft: 6 }}>{o.status}</span>}
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
                  const money = (v) => formatMillions(v, { decimals: 2 })
                  const stats = market.getOfferStatsForPlayer(o.playerId)
                  // Soft status for consideration window
                  let softStatus = null
                  if (o.status === 'pending' && typeof o.submittedWeek === 'number' && typeof o.decisionAfterWeeks === 'number') {
                    const week = state.league?.week ?? o.submittedWeek
                    const elapsed = Math.max(0, week - o.submittedWeek)
                    const total = o.decisionAfterWeeks
                    const current = Math.min(total, elapsed + 1)
                    if ((o.deadlineWeek ?? (o.submittedWeek + total)) > week) {
                      softStatus = `under consideration (week ${current} of ${total})`
                    }
                  }
                  return (
                    <tr key={o.id} className={o.status !== 'pending' ? (o.status === 'accepted' ? 'row-accepted' : 'row-inactive') : ''}>
                      <td>{player.name}</td>
                      <td>{o.seller || 'Free Agent'}</td>
                      <td>{o.type === 'free' ? `W: ${money(o.wage)} /wk` : `F: ${money(o.amount)}, W: ${money(o.wage)} /wk`}</td>
                      <td>
                        {softStatus ? softStatus : o.status}
                        {o.status === 'pending' && stats.total > 0 && (
                          <span className="hint" style={{ marginLeft: 6 }} title="Best offer wins at deadline">
                            Competing: {stats.total}{stats.rankOfMine ? ` (your rank ${stats.rankOfMine}/${stats.total})` : ''}
                          </span>
                        )}
                      </td>
                      <td>Week {o.deadlineWeek}</td>
                      <td>
                        {o.status === 'pending' && <button onClick={() => setConfirm({ open: true, message: 'Cancel this offer?', onConfirm: () => { market.cancelOutgoingOffer(o.id); setConfirm({ open: false }) }, onCancel: () => setConfirm({ open: false }) })}>Cancel</button>}
                        {o.status !== 'pending' && <span className={`hint ${o.status === 'accepted' ? 'success' : 'error'}`} style={{ marginLeft: 6 }}>{o.status}</span>}
                      </td>
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
