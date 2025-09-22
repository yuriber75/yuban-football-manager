import React, { useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { GAME_CONSTANTS } from '../constants'
import fieldImg from '../../image/soccer.jpg'
import { useMarket } from '../market/MarketContext'

function roleSection(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

function requiredCounts(formation) {
  const f = GAME_CONSTANTS.FORMATIONS[formation] || GAME_CONSTANTS.FORMATIONS['442']
  return { GK: 1, DF: f.DF, MF: f.MF, FW: f.FW }
}

function sectionAccent(sec) {
  // Solid and translucent accents per section for modern styling
  switch (sec) {
    case 'GK':
      return { solid: '#7c3aed', translucent: 'rgba(124,58,237,0.16)', text: '#4c1d95' }
    case 'DF':
      return { solid: '#3b82f6', translucent: 'rgba(59,130,246,0.16)', text: '#1d4ed8' }
    case 'MF':
      return { solid: '#22c55e', translucent: 'rgba(34,197,94,0.16)', text: '#15803d' }
    case 'FW':
      return { solid: '#f97316', translucent: 'rgba(249,115,22,0.18)', text: '#c2410c' }
    default:
      return { solid: 'var(--border)', translucent: 'rgba(0,0,0,0.1)', text: '#0f172a' }
  }
}

export default function Squad() {
  const { state, setState, saveNow } = useGameState()
  const market = useMarket()
  const team = state.teams.find(t => t.name === state.teamName)
  const [formation, setFormation] = useState(team?.tactics?.formation || '442')
  const [pressing, setPressing] = useState(team?.tactics?.pressing || 'medium')
  const [verticalization, setVerticalization] = useState(team?.tactics?.verticalization || 'neutral')
  const [hover, setHover] = useState(null) // { sec, idx, valid }
  const [message, setMessage] = useState(null) // transient error/info
  const [flash, setFlash] = useState(null) // { type: 'slot'|'bench', sec?, idx }

  const players = useMemo(() => (team?.players || []).map(p => ({ ...p, section: roleSection(p.primaryRole) })), [team])
  const starters = players.filter(p => p.starting || p.slot)
  const bench = players.filter(p => p.benchIndex !== undefined).sort((a,b)=> a.benchIndex - b.benchIndex)
  const available = players.filter(p => !p.slot && p.benchIndex === undefined)
  const positions = GAME_CONSTANTS.POSITION_ROLES[formation]

  if (!team) return <div className="card">No team found. Start a career.</div>

  function updateTeam(nextPlayers, nextFormation = formation) {
    const nextTeams = state.teams.map(t => t.name === team.name ? { ...t, players: nextPlayers, tactics: { ...(t.tactics||{}), formation: nextFormation } } : t)
    setState({ ...state, teams: nextTeams })
    saveNow()
  }

  function updateTactics(partial) {
    const nextTeams = state.teams.map(t => t.name === team.name ? { ...t, tactics: { ...(t.tactics || {}), ...partial } } : t)
    setState({ ...state, teams: nextTeams })
    saveNow()
  }

  function clearStarters() {
    updateTeam(players.map(p => ({ ...p, starting: false, slot: undefined })))
  }

  function autoPick() {
    const next = players.map(p => ({ ...p, starting: false, slot: undefined }))
    // helper: pick best by section and assign sequentially to slots
    const pickForSection = (sec) => {
      const slots = positions[sec]
      const pool = next.filter(p => p.section === sec).sort((a,b)=> b.overall - a.overall)
      for (let i = 0; i < slots.length && i < pool.length; i++) {
        const p = pool[i]
        p.starting = true
        p.slot = { section: sec, index: i }
      }
    }
    pickForSection('GK')
    pickForSection('DF')
    pickForSection('MF')
    pickForSection('FW')
    updateTeam(next)
  }

  function assignToSlot(playerId, sec, index) {
    const next = players.map(p => ({ ...p }))
    const i = next.findIndex(p => String(p.id) === String(playerId))
    if (i === -1) return
    const p = next[i]
    // GK strict rule: cannot place GK outside GK slot → flash + message
    if (p.primaryRole === 'GK' && sec !== 'GK') {
      setFlash({ type: 'slot', sec, idx: index })
      setMessage('Goalkeepers can only be placed in the Goalkeeper slot.')
      setTimeout(() => { setFlash(null); setMessage(null) }, 1200)
      return
    }
    // GK slot can only accept GK
    if (sec === 'GK' && p.primaryRole !== 'GK') {
      setFlash({ type: 'slot', sec, idx: index })
      setMessage('Only a Goalkeeper can be placed in the Goalkeeper slot.')
      setTimeout(() => { setFlash(null); setMessage(null) }, 1200)
      return
    }
    // Allow cross-department placement among DF/MF/FW; apply OOP penalty via naturals check
  const slot = positions[sec][index]
  const playerRoles = Array.isArray(p.roles) && p.roles.length ? p.roles : [p.primaryRole]
  const isOOP = Array.isArray(slot?.natural) ? !slot.natural.some(r => playerRoles.includes(r)) : false
  const penalty = isOOP ? 0.9 : 1
    // Determine if target occupied
    const targetOccIdx = next.findIndex(x => x.slot && x.slot.section === sec && x.slot.index === index)
    const fromSlot = p.slot ? { ...p.slot } : null
    if (fromSlot && targetOccIdx !== -1) {
      // Swap occupants between slots (same section)
      const targetPlayer = next[targetOccIdx]
      // Compute target player's OOP status for the original slot
  const fromSlotDef = positions[fromSlot.section][fromSlot.index]
  const targetRoles = Array.isArray(targetPlayer.roles) && targetPlayer.roles.length ? targetPlayer.roles : [targetPlayer.primaryRole]
  const targetOOP = Array.isArray(fromSlotDef?.natural) ? !fromSlotDef.natural.some(r => targetRoles.includes(r)) : false
      const targetPenalty = targetOOP ? 0.9 : 1
      targetPlayer.slot = { section: fromSlot.section, index: fromSlot.index, oop: targetOOP, penalty: targetPenalty }
      targetPlayer.starting = true
      p.slot = { section: sec, index, oop: isOOP, penalty }
      p.starting = true
    } else {
      // Move player into target slot (clear target occupant if any)
      if (targetOccIdx !== -1) {
        next[targetOccIdx].slot = undefined
        next[targetOccIdx].starting = false
      }
      // Clear previous slot of this player, if any
      if (p.slot) {
        p.slot = undefined
      }
      // Clear bench assignment if coming from bench
      if (typeof p.benchIndex === 'number') {
        p.benchIndex = undefined
      }
      p.starting = true
      p.slot = { section: sec, index, oop: isOOP, penalty }
    }
    updateTeam(next)
  }

  function clearSlot(sec, index) {
    const next = players.map(p => ({ ...p }))
    const occIdx = next.findIndex(x => x.slot && x.slot.section === sec && x.slot.index === index)
    if (occIdx !== -1) { next[occIdx].slot = undefined; next[occIdx].starting = false; updateTeam(next) }
  }

  function onChangeFormation(e) {
    const f = e.target.value
    setFormation(f)
    // Remap starters to slots for new formation by section order
    const next = players.map(p => ({ ...p, slot: p.slot ? { ...p.slot } : undefined }))
    // capture current starters per section sorted by overall
    const current = { GK: [], DF: [], MF: [], FW: [] }
    next.forEach(p => { if (p.starting || p.slot) current[p.section].push(p) })
    Object.keys(current).forEach(sec => current[sec].sort((a,b)=> b.overall - a.overall))
    // clear all slots/starting
    next.forEach(p => { p.slot = undefined; p.starting = false })
    const slots = GAME_CONSTANTS.POSITION_ROLES[f]
    const remap = (sec) => {
      const list = current[sec]
      const max = slots[sec].length
      for (let i = 0; i < max && i < list.length; i++) {
        const p = next.find(x => x.id === list[i].id)
        if (p) { p.starting = true; p.slot = { section: sec, index: i } }
      }
    }
    remap('GK'); remap('DF'); remap('MF'); remap('FW')
    updateTeam(next, f)
  }

  function assignToBench(playerId, benchIndex) {
    const next = players.map(p => ({ ...p }))
    const i = next.findIndex(p => String(p.id) === String(playerId))
    if (i === -1) return
    const p = next[i]
    // Only one GK allowed on bench
    if (p.primaryRole === 'GK') {
      const gksOnBench = next.filter(pp => pp.benchIndex !== undefined && pp.primaryRole === 'GK' && String(pp.id) !== String(p.id))
      if (gksOnBench.length >= 1) {
        setFlash({ type: 'bench', idx: benchIndex })
        setTimeout(() => setFlash(null), 600)
        return
      }
    }
    // If bench slot occupied, swap with that player (move to previous location)
    const occIdx = next.findIndex(x => x.benchIndex === benchIndex)
    const prevBenchIndex = typeof p.benchIndex === 'number' ? p.benchIndex : undefined
    const fromSlot = p.slot ? { ...p.slot } : null
    if (occIdx !== -1) {
      const other = next[occIdx]
      // Move other to p's previous place (bench or slot)
      if (prevBenchIndex !== undefined) {
        other.benchIndex = prevBenchIndex
      } else if (fromSlot) {
        other.slot = { ...fromSlot }
        other.starting = true
      } else {
        other.benchIndex = undefined
        other.starting = false
        other.slot = undefined
      }
    }
    // Move p to bench
    p.benchIndex = benchIndex
    p.starting = false
    p.slot = undefined
    updateTeam(next)
  }

  function clearBench(benchIndex) {
    const next = players.map(p => ({ ...p }))
    const occIdx = next.findIndex(x => x.benchIndex === benchIndex)
    if (occIdx !== -1) { next[occIdx].benchIndex = undefined; updateTeam(next) }
  }

  return (
    <div className="card">
  <div className="squad-layout" style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
        {/* Left: roster grouped by roles */}
  <div className="table-container col-roster" style={{ flex: '0 0 50%', minWidth: 0 }}>
          <h3>Roster</h3>
          {['GK','DF','MF','FW'].map(sec => (
            <div key={sec} className="table-container" style={{ marginTop: 4 }}>
              <h3 style={{ textAlign: 'center', fontSize: '130%' }}>
                {sec === 'GK' ? 'Goalkeeper' : sec === 'DF' ? 'Defenders' : sec === 'MF' ? 'Midfielders' : 'Forwards'}
              </h3>
              {(() => {
                const headerSet = sec === 'GK' ? GAME_CONSTANTS.UI.HEADERS.GK.stats : GAME_CONSTANTS.UI.HEADERS.OUTFIELD.stats
                const tableMinWidth = 220 + 70 + 56 + (56 * headerSet.length) // Name + Role + OVR + stats
                return (
                  <div className="roster-wrap">
                    <table className="roster-table" style={{ borderSpacing: 0 }}>
                      <colgroup>
                        <col className="col-name" style={{ width: 220 }} />
                        <col className="col-role" style={{ width: 70 }} />
                        <col className="col-ovr" style={{ width: 56 }} />
                        {headerSet.map(h => (
                          <col key={`col-${h.key}`} className="stat-col" style={{ width: 56 }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '4px 6px' }}>Name</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px' }}>Role</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px' }}>OVR</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px' }}>Action</th>
                          {headerSet.map(h => (
                            <th key={h.key} className="stat-col" style={{ textAlign: 'left', padding: '4px 6px' }} title={`${h.label}: ${h.tooltip}`}>{h.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {players.filter(p => p.section === sec).map(p => (
                          <tr key={p.id}
                              draggable
                              onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', p.id) }}
                              title="Drag to field or bench"
                              style={{ background: p.slot ? 'rgba(34,197,94,0.10)' : (p.benchIndex !== undefined ? 'rgba(0,0,0,0.06)' : undefined) }}>
                            <td style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '4px 6px' }}>#{p.number} {p.name}</td>
                            <td style={{ textAlign: 'left', padding: '4px 6px' }}>{(Array.isArray(p.roles) && p.roles.length ? p.roles : [p.primaryRole]).join('/')}</td>
                            <td style={{ textAlign: 'left', padding: '4px 6px' }} className="value" data-value={p.overall}>{p.overall}</td>
                            <td style={{ textAlign: 'left', padding: '4px 6px' }}>
                              {(() => {
                                const listed = team.finances?.playersForSale?.some(e => e.id === p.id)
                                if (!listed) {
                                  const can = market.canListWithReason?.(team, p.id) || { ok: true }
                                  return (
                                    <button title={can.ok ? '' : can.reason} disabled={!can.ok} onClick={() => { if (confirm(`List ${p.name} for sale at €${p.value.toFixed(2)}M?`)) market.listPlayer(p.id, p.value) }}>List</button>
                                  )
                                }
                                return (
                                  <button onClick={() => { if (confirm(`Unlist ${p.name} from sale?`)) market.unlistPlayer(p.id) }}>Unlist</button>
                                )
                              })()}
                            </td>
                            {headerSet.map(h => (
                              <td key={h.key} className="stat-col value" style={{ textAlign: 'left', padding: '4px 6px' }}>{p.stats[h.key] ?? p[h.key]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>

        {/* Middle: field with DnD positions */}
  <div className="table-container col-field" style={{ flex: '0 0 40%', minWidth: 0 }}>
          <div className="row2" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ marginRight: 6 }}>Formation</label>
              <select value={formation} onChange={onChangeFormation}>
                {Object.keys(GAME_CONSTANTS.FORMATIONS).map(f => (
                  <option key={f} value={f}>{f.slice(0,1)}-{f.slice(1,2)}-{f.slice(2)}</option>
                ))}
              </select>
              <label style={{ marginLeft: 8 }}>Pressing</label>
              <select value={pressing} onChange={(e)=>{ setPressing(e.target.value); updateTactics({ pressing: e.target.value }) }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <label style={{ marginLeft: 8 }}>Verticalizzazione</label>
              <select value={verticalization} onChange={(e)=>{ setVerticalization(e.target.value); updateTactics({ verticalization: e.target.value }) }}>
                <option value="long_balls">Lanci lunghi</option>
                <option value="horizontal">Passaggi orizzontali</option>
                <option value="neutral">Neutrale</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={autoPick} style={{ width: 'auto' }}>Auto-pick XI</button>
              <button className="btn-warn" onClick={clearStarters} style={{ width: 'auto' }}>Clear XI</button>
            </div>
          </div>
          <h3>Starting XI — drag players here</h3>
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '0.64',
            background: `url(${fieldImg}) center/cover no-repeat`,
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            {['FW','MF','DF','GK'].flatMap(sec => (
              positions[sec].map((pos, idx) => {
                const slotKey = `${sec}-${idx}`
                const occupant = starters.find(p => p.slot && p.slot.section === sec && p.slot.index === idx)
                const onDrop = (e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) assignToSlot(id, sec, idx)
                }
                const slotSize = 100
                return (
                  <div key={slotKey} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', width: slotSize }}>
                    <div
                      onDragEnter={(e)=>{
                        const id = e.dataTransfer.getData('text/plain')
                        let valid = false
                        let oop = false
                        if (id) {
                          const pl = players.find(pp => String(pp.id) === String(id))
                          const natural = positions[sec][idx]?.natural || []
                            // Allow DF/MF/FW across sections; forbid GK<>non-GK
                            if (pl) {
                              if (sec === 'GK') {
                                valid = pl.primaryRole === 'GK'
                                oop = false
                              } else if (pl.primaryRole === 'GK') {
                                valid = false
                                oop = false
                              } else {
                                valid = true
                                const rset = Array.isArray(pl.roles) && pl.roles.length ? pl.roles : [pl.primaryRole]
                                oop = !natural.some(r => rset.includes(r))
                              }
                            }
                        }
                        setHover({ sec, idx, valid, oop })
                      }}
                      onDragOver={(e)=>{
                        e.preventDefault()
                        if (hover && hover.sec === sec && hover.idx === idx) {
                          e.dataTransfer.dropEffect = hover.valid ? 'move' : 'none'
                        }
                      }}
                      onDragLeave={()=>{
                        if (hover && hover.sec === sec && hover.idx === idx) setHover(null)
                      }}
                      onDrop={(e)=>{ setHover(null); onDrop(e) }}
                      className="card"
                      style={{
                        padding: 8,
                        textAlign: 'center',
                        background: occupant ? '#ffffff' : 'rgba(0,0,0,0.06)',
                        borderStyle: occupant ? 'solid' : 'dashed',
                        borderColor: (()=>{
                          if (flash && flash.type==='slot' && flash.sec===sec && flash.idx===idx) return '#dc2626'
                          if (occupant) {
                            if (occupant.slot?.oop) return '#dc2626'
                            const occSec = roleSection(occupant.primaryRole)
                            return sectionAccent(occSec).solid
                          }
                          if (hover && hover.sec === sec && hover.idx === idx) return (hover.valid ? (hover.oop ? '#dc2626' : 'var(--border)') : '#dc2626')
                          return 'var(--border)'
                        })(),
                        width: slotSize,
                        height: slotSize * 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: occupant ? 'pointer' : 'default',
                        boxShadow: occupant ? '0 4px 10px rgba(0,0,0,0.12)' : undefined,
                        color: occupant ? '#0f172a' : undefined,
                        borderWidth: occupant ? 2 : 1,
                        borderRadius: 10
                      }}
                      onClick={() => { if (occupant) clearSlot(sec, idx) }}
                    >
                      {occupant ? (
                        <div draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', occupant.id) }}>
                          {(() => { const secTag = roleSection(occupant.primaryRole); const acc = sectionAccent(secTag); return (
                            <div style={{ position: 'absolute', top: 6, left: 6, background: occupant.slot?.oop ? '#fee2e2' : acc.translucent, color: occupant.slot?.oop ? '#991b1b' : acc.text, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid ${occupant.slot?.oop ? '#fecaca' : acc.solid}` }}>
                              {occupant.primaryRole}
                            </div>
                          ) })()}
                          <div style={{ fontWeight: 800, marginTop: 16 }}>{occupant.name}</div>
                          <div style={{ position: 'absolute', bottom: 6, left: 6, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid ${sectionAccent(roleSection(occupant.primaryRole)).solid}`, color: sectionAccent(roleSection(occupant.primaryRole)).text, background: sectionAccent(roleSection(occupant.primaryRole)).translucent }}>
                            OVR {Math.round(occupant.overall * (occupant.slot?.oop ? 0.9 : 1))}
                          </div>
                          <div style={{ position: 'absolute', top: -6, right: -6, background: '#facc15', color: '#000', borderRadius: '9999px', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, fontWeight: 800, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                            #{occupant.number}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--muted)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const naturals = positions[sec][idx]?.natural || []
                            return naturals.length ? naturals.join('/') : sec
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ))}
          </div>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Tip: drag a player from the roster to a slot to assign. Drag a placed player to another slot to reposition.</p>
          {message && <div className="card" style={{ borderColor: '#dc2626' }}>{message}</div>}
        </div>

        {/* Right: bench (7 slots) */}
  <div className="table-container col-bench" style={{ flex: '0 0 10%', minWidth: 0 }}>
          <h3>Bench (7)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const bOcc = bench.find(p => p.benchIndex === i)
              return (
       <div key={i}
                     className="card"
                     onDragOver={(e)=> e.preventDefault()}
                     onDrop={(e)=>{ const id = e.dataTransfer.getData('text/plain'); if (id) assignToBench(id, i) }}
                     onClick={() => { if (bOcc) clearBench(i) }}
         style={{ padding: 8, background: bOcc ? '#ffffff' : 'rgba(0,0,0,0.06)', borderColor: (flash && flash.type==='bench' && flash.idx===i) ? '#dc2626' : 'var(--border)', width: 80, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: bOcc ? 'pointer' : 'default', boxShadow: bOcc ? '0 4px 10px rgba(0,0,0,0.12)' : undefined, borderWidth: bOcc ? 2 : 1, borderRadius: 10, borderStyle: 'solid' }}>
                  {bOcc ? (
                    <div draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', bOcc.id) }}>
                      {(() => { const secTag = roleSection(bOcc.primaryRole); const acc = sectionAccent(secTag); return (
                        <div style={{ position: 'absolute', top: 6, left: 6, background: acc.translucent, color: acc.text, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid ${acc.solid}` }}>
                          {bOcc.primaryRole}
                        </div>
                      ) })()}
                      <div style={{ fontWeight: 800, marginTop: 16, color: '#0f172a' }}>{bOcc.name}</div>
                      <div style={{ position: 'absolute', bottom: 6, left: 6, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid ${sectionAccent(roleSection(bOcc.primaryRole)).solid}`, color: sectionAccent(roleSection(bOcc.primaryRole)).text, background: sectionAccent(roleSection(bOcc.primaryRole)).translucent }}>
                        OVR {bOcc.overall}
                      </div>
                      <div style={{ position: 'absolute', top: -6, right: -6, background: '#facc15', color: '#000', borderRadius: '9999px', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, fontWeight: 800, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                        #{bOcc.number}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--muted)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Bench</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
