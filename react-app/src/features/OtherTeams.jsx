import React, { useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { GAME_CONSTANTS } from '../constants'
import fieldImg from '../../image/soccer.jpg'

function roleSection(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

function chooseBestFormation(players) {
  const formations = Object.keys(GAME_CONSTANTS.FORMATIONS)
  let best = { f: '442', score: -Infinity }
  for (const f of formations) {
    const req = GAME_CONSTANTS.FORMATIONS[f]
    const bySec = {
      GK: players.filter(p => roleSection(p.primaryRole) === 'GK').sort((a,b)=> b.overall - a.overall),
      DF: players.filter(p => roleSection(p.primaryRole) === 'DF').sort((a,b)=> b.overall - a.overall),
      MF: players.filter(p => roleSection(p.primaryRole) === 'MF').sort((a,b)=> b.overall - a.overall),
      FW: players.filter(p => roleSection(p.primaryRole) === 'FW').sort((a,b)=> b.overall - a.overall),
    }
    let sum = 0
    if (bySec.GK[0]) sum += bySec.GK[0].overall
    sum += bySec.DF.slice(0, req.DF).reduce((s,p)=> s+p.overall, 0)
    sum += bySec.MF.slice(0, req.MF).reduce((s,p)=> s+p.overall, 0)
    sum += bySec.FW.slice(0, req.FW).reduce((s,p)=> s+p.overall, 0)
    if (sum > best.score) best = { f, score: sum }
  }
  return best.f
}

function autopickTeam(players, formation) {
  const positions = GAME_CONSTANTS.POSITION_ROLES[formation] || GAME_CONSTANTS.POSITION_ROLES['442']
  const next = players.map(p => ({ ...p, starting: false, slot: undefined, benchIndex: undefined }))
  const pickForSection = (sec) => {
    const slots = positions[sec]
    const pool = next.filter(p => roleSection(p.primaryRole) === sec).sort((a,b)=> b.overall - a.overall)
    for (let i = 0; i < slots.length && i < pool.length; i++) {
      const p = pool[i]
      p.starting = true
      p.slot = { section: sec, index: i }
    }
  }
  pickForSection('GK'); pickForSection('DF'); pickForSection('MF'); pickForSection('FW')
  // Bench: best remaining 7 with max 1 GK
  const startersIds = new Set(next.filter(p => p.slot).map(p => p.id))
  const remaining = next.filter(p => !startersIds.has(p.id)).sort((a,b)=> b.overall - a.overall)
  let gkOnBench = 0
  let benchIdx = 0
  for (const p of remaining) {
    if (benchIdx >= 7) break
    if (p.primaryRole === 'GK') {
      if (gkOnBench >= 1) continue
      gkOnBench++
    }
    p.benchIndex = benchIdx++
  }
  return next
}

export default function OtherTeams() {
  const { state } = useGameState()
  const teams = state.teams || []
  const myName = state.teamName
  const aiTeams = teams.filter(t => t.name !== myName)
  const [selected, setSelected] = useState(aiTeams[0]?.name || '')
  const team = aiTeams.find(t => t.name === selected) || aiTeams[0]
  if (!team) return <div className="card">No other teams yet.</div>

  const bestFormation = useMemo(() => chooseBestFormation(team.players), [team])
  const positions = GAME_CONSTANTS.POSITION_ROLES[bestFormation]
  const viewSquad = useMemo(() => autopickTeam(team.players, bestFormation), [team, bestFormation])
  const starters = viewSquad.filter(p => p.slot).sort((a,b)=> a.slot.index - b.slot.index)
  const bench = viewSquad.filter(p => p.benchIndex !== undefined).sort((a,b)=> a.benchIndex - b.benchIndex)

  return (
    <div className="card">
      <div className="row2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Other Teams</h3>
        <div>
          <label style={{ marginRight: 6 }}>Team</label>
          <select value={team?.name} onChange={(e)=> setSelected(e.target.value)}>
            {aiTeams.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          <span style={{ marginLeft: 12 }}>Best formation: {bestFormation.slice(0,1)}-{bestFormation.slice(1,2)}-{bestFormation.slice(2)}</span>
        </div>
      </div>

      <div className="squad-layout" style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
        {/* Left: compact roster list (no stats) */}
        <div className="table-container col-roster" style={{ flex: '0 0 50%', minWidth: 0 }}>
          <h3>Roster</h3>
          {['GK','DF','MF','FW'].map(sec => (
            <div key={sec} className="table-container" style={{ marginTop: 4 }}>
              <h3 style={{ textAlign: 'center', fontSize: '130%' }}>
                {sec === 'GK' ? 'Goalkeeper' : sec === 'DF' ? 'Defenders' : sec === 'MF' ? 'Midfielders' : 'Forwards'}
              </h3>
              <div className="roster-wrap">
                <table className="roster-table roster-compact" style={{ borderSpacing: 0 }}>
                  <colgroup>
                    <col className="col-name" style={{ width: 220 }} />
                    <col className="col-role" style={{ width: 70 }} />
                    <col className="col-ovr" style={{ width: 56 }} />
                    <col className="col-age" style={{ width: 56 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Role</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>OVR</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.filter(p => roleSection(p.primaryRole) === sec).map(p => (
                      <tr key={p.id} style={{ background: p.slot ? 'rgba(34,197,94,0.10)' : (p.benchIndex !== undefined ? 'rgba(0,0,0,0.06)' : undefined) }}>
                        <td style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '4px 6px' }}>#{p.number} {p.name}</td>
                        <td style={{ textAlign: 'left', padding: '4px 6px' }}>{(Array.isArray(p.roles) && p.roles.length ? p.roles : [p.primaryRole]).join('/')}</td>
                        <td style={{ textAlign: 'left', padding: '4px 6px' }} className="value" data-value={p.overall}>{p.overall}</td>
                        <td style={{ textAlign: 'left', padding: '4px 6px' }}>{p.age ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Middle: field with non-interactive positions */}
        <div className="table-container col-field" style={{ flex: '0 0 40%', minWidth: 0 }}>
          <h3>Starting XI</h3>
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
                const occupant = starters.find(p => p.slot && p.slot.section === sec && p.slot.index === idx)
                const slotSize = 100
                return (
                  <div key={`${sec}-${idx}`} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', width: slotSize }}>
                    <div className="card" style={{
                      padding: 8,
                      textAlign: 'center',
                      background: occupant ? '#ffffff' : 'rgba(0,0,0,0.06)',
                      borderStyle: occupant ? 'solid' : 'dashed',
                      borderColor: occupant ? '#cbd5e1' : 'var(--border)',
                      width: slotSize,
                      height: slotSize * 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: occupant ? '0 4px 10px rgba(0,0,0,0.12)' : undefined,
                      color: occupant ? '#0f172a' : undefined,
                      borderWidth: occupant ? 2 : 1,
                      borderRadius: 10
                    }}>
                      {occupant ? (
                        <>
                          <div style={{ position: 'absolute', top: 6, left: 6, background: '#eef2ff', color: '#1e3a8a', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid #93c5fd` }}>
                            {occupant.primaryRole}
                          </div>
                          <div style={{ fontWeight: 800, marginTop: 16 }}>{occupant.name}</div>
                          <div style={{ position: 'absolute', bottom: 6, left: 6, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #3b82f6', color: '#1d4ed8', background: 'rgba(59,130,246,0.16)' }}>
                            OVR {occupant.overall}
                          </div>
                          <div style={{ position: 'absolute', top: -6, right: -6, background: '#facc15', color: '#000', borderRadius: '9999px', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, fontWeight: 800, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                            #{occupant.number}
                          </div>
                        </>
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
        </div>

        {/* Right: Bench (read-only) */}
        <div className="table-container col-bench" style={{ flex: '0 0 10%', minWidth: 0 }}>
          <h3>Bench (7)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const bOcc = bench.find(p => p.benchIndex === i)
              return (
                <div key={i}
                     className="card"
                     style={{ padding: 8, background: bOcc ? '#ffffff' : 'rgba(0,0,0,0.06)', borderColor: '#cbd5e1', width: 80, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: bOcc ? '0 4px 10px rgba(0,0,0,0.12)' : undefined, borderWidth: bOcc ? 2 : 1, borderRadius: 10, borderStyle: 'solid' }}>
                  {bOcc ? (
                    <>
                      <div style={{ position: 'absolute', top: 6, left: 6, background: '#eef2ff', color: '#1e3a8a', borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: `1px solid #93c5fd` }}>
                        {bOcc.primaryRole}
                      </div>
                      <div style={{ fontWeight: 800, marginTop: 16, color: '#0f172a' }}>{bOcc.name}</div>
                      <div style={{ position: 'absolute', bottom: 6, left: 6, borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #3b82f6', color: '#1d4ed8', background: 'rgba(59,130,246,0.16)' }}>
                        OVR {bOcc.overall}
                      </div>
                      <div style={{ position: 'absolute', top: -6, right: -6, background: '#facc15', color: '#000', borderRadius: '9999px', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1, fontWeight: 800, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>
                        #{bOcc.number}
                      </div>
                    </>
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
