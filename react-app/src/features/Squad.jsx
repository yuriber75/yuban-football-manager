import React, { useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { GAME_CONSTANTS } from '../constants'

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

export default function Squad() {
  const { state, setState, saveNow } = useGameState()
  const team = state.teams.find(t => t.name === state.teamName)
  const [formation, setFormation] = useState(team?.tactics?.formation || '442')
  const [hover, setHover] = useState(null) // { sec, idx, valid }

  const players = useMemo(() => (team?.players || []).map(p => ({ ...p, section: roleSection(p.primaryRole) })), [team])
  const starters = players.filter(p => p.starting || p.slot)
  const bench = players.filter(p => !p.starting && !p.slot)
  const positions = GAME_CONSTANTS.POSITION_ROLES[formation]

  if (!team) return <div className="card">No team found. Start a career.</div>

  function updateTeam(nextPlayers, nextFormation = formation) {
    const nextTeams = state.teams.map(t => t.name === team.name ? { ...t, players: nextPlayers, tactics: { ...(t.tactics||{}), formation: nextFormation } } : t)
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
    if (p.section !== sec) return // enforce section match
    // Enforce natural role for this slot
    const slot = positions[sec][index]
    if (slot && Array.isArray(slot.natural)) {
      if (!slot.natural.includes(p.primaryRole)) return
    }
    // Determine if target occupied
    const targetOccIdx = next.findIndex(x => x.slot && x.slot.section === sec && x.slot.index === index)
    const fromSlot = p.slot ? { ...p.slot } : null
    if (fromSlot && targetOccIdx !== -1) {
      // Swap occupants between slots (same section)
      const targetPlayer = next[targetOccIdx]
      // Validate target player's natural fit in fromSlot
      const fromSlotDef = positions[fromSlot.section][fromSlot.index]
      if (fromSlotDef && Array.isArray(fromSlotDef.natural)) {
        if (!fromSlotDef.natural.includes(targetPlayer.primaryRole)) {
          return // cannot swap if target doesn't fit the original slot
        }
      }
      targetPlayer.slot = { section: fromSlot.section, index: fromSlot.index }
      targetPlayer.starting = true
      p.slot = { section: sec, index }
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
      p.starting = true
      p.slot = { section: sec, index }
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

  return (
    <div className="card">
      <div className="row2" style={{ alignItems: 'end' }}>
        <div>
          <h3 style={{ marginTop: 0 }}>{team.name} — Formation {formation}</h3>
        </div>
        <div>
          <label>Formation</label>
          <select value={formation} onChange={onChangeFormation}>
            {Object.keys(GAME_CONSTANTS.FORMATIONS).map(f => (
              <option key={f} value={f}>{f.slice(0,1)}-{f.slice(1,2)}-{f.slice(2)}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className="btn-secondary" onClick={autoPick} style={{ width: 'auto' }}>Auto-pick XI</button>
        <button className="btn-warn" onClick={clearStarters} style={{ width: 'auto' }}>Clear XI</button>
      </div>

      <div className="row2" style={{ marginTop: 12 }}>
        {/* Left: roster grouped by roles */}
        <div className="table-container">
          <h3>Roster</h3>
          {['GK','DF','MF','FW'].map(sec => (
            <div key={sec} className="table-container" style={{ marginTop: 8 }}>
              <h3>{sec}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Role</th><th>OVR</th><th>PAS</th><th>SHO</th><th>DEF</th><th>DRI</th><th>TAC</th>
                  </tr>
                </thead>
                <tbody>
                  {players.filter(p => p.section === sec).map(p => (
                    <tr key={p.id} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', p.id) }} title="Trascina sul campo per schierare">
                      <td>{p.name}{p.slot ? ' • XI' : ''}</td>
                      <td>{p.primaryRole}</td>
                      <td className="value" data-value={p.overall}>{p.overall}</td>
                      <td className="value">{p.stats.pass}</td>
                      <td className="value">{p.stats.shot}</td>
                      <td className="value">{p.stats.def}</td>
                      <td className="value">{p.stats.drib}</td>
                      <td className="value">{p.stats.tackle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Right: field with DnD positions */}
        <div className="table-container">
          <h3>Starting XI — trascina i giocatori qui</h3>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '150%', // aspect ratio field
            background: `url('/image/soccer.jpg') center/cover no-repeat`,
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
                return (
                  <div key={slotKey} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', width: 140 }}>
                    <div
                      onDragEnter={(e)=>{
                        const id = e.dataTransfer.getData('text/plain')
                        let valid = false
                        if (id) {
                          const pl = players.find(pp => String(pp.id) === String(id))
                          const natural = positions[sec][idx]?.natural || []
                          valid = !!pl && pl.section === sec && natural.includes(pl.primaryRole)
                        }
                        setHover({ sec, idx, valid })
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
                        background: occupant ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.35)',
                        borderStyle: occupant ? 'solid' : 'dashed',
                        borderColor: hover && hover.sec === sec && hover.idx === idx ? (hover.valid ? 'var(--border)' : '#dc2626') : 'var(--border)'
                      }}
                    >
                      {occupant ? (
                        <div draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', occupant.id) }}>
                          <div style={{ fontWeight: 700 }}>{occupant.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{occupant.primaryRole} · OVR {occupant.overall}</div>
                          <button className="btn-warn" style={{ marginTop: 6, width: 'auto' }} onClick={()=>clearSlot(sec, idx)}>Rimuovi</button>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--muted)' }}>Trascina qui ({sec})</div>
                      )}
                    </div>
                  </div>
                )
              })
            ))}
          </div>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Suggerimento: trascina un giocatore del roster sullo slot desiderato per assegnarlo. Puoi trascinare uno schierato su un altro slot per riposizionarlo.</p>
        </div>
      </div>
    </div>
  )
}
