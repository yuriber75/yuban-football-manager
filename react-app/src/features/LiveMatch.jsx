import React from 'react'
import { createLiveMatchController } from '../engine/liveMatchController'
import fieldImg from '../../image/soccer.jpg'
import { GAME_CONSTANTS } from '../constants'

// Utility icon mapping
const ICONS = {
  GOAL:'⚽', SHOT:'●', FOUL:'🛑', YELLOW_CARD:'🟨', RED_CARD:'🟥', INJURY:'✚',
  PENALTY_AWARDED:'⚖', PENALTY_SCORED:'⚽', PENALTY_SAVED:'🛡', PENALTY_MISSED:'❌',
  FREE_KICK_DIRECT:'🅿', FREE_KICK_GOAL:'🅿⚽', FREE_KICK_SAVED:'🅿🛡', FREE_KICK_WIDE:'🅿↗',
  SUBSTITUTION:'🔄', TACTIC_CHANGE:'♟', ADVANTAGE_NOTE:'↯', GROUP:'…', PERIOD_SUMMARY:'Σ', KICKOFF:'⏱'
}

function resolveColors(team){
  const tc = team?.careerColors || team?.teamColors || team?.colors || {}
  return { primary: tc.primary || '#1565c0', secondary: tc.secondary || '#ffffff' }
}

function colorForSide(side, homeColors, awayColors){
  if (side==='HOME'){
    if (homeColors.primary.toLowerCase() === awayColors.primary.toLowerCase()) return homeColors.secondary
    return homeColors.primary
  } else {
    if (homeColors.primary.toLowerCase() === awayColors.primary.toLowerCase()) return awayColors.secondary
    return awayColors.primary
  }
}

export default function LiveMatch({ homeTeam, awayTeam, userTeamName, onExit, onComplete }) {
  const [controller, setController] = React.useState(null)
  const [events, setEvents] = React.useState([])
  const [state, setState] = React.useState(null)
  const [panel, setPanel] = React.useState('timeline')
  const [showKeyOnly, setShowKeyOnly] = React.useState(false)
  const [pendingSubs, setPendingSubs] = React.useState({ HOME:[], AWAY:[] })
  const homeColors = React.useMemo(()=> resolveColors(homeTeam), [homeTeam])
  const awayColors = React.useMemo(()=> resolveColors(awayTeam), [awayTeam])

  React.useEffect(()=> {
    const c = createLiveMatchController(homeTeam, awayTeam, {
      tickMs: 360,
      engine: { verbosity: 'low' },
      onEvents: (evts) => setEvents(prev => [...prev, ...evts]),
      onState: (s) => setState({...s}),
      onDone: (res) => { onComplete?.(res) }
    })
    setController(c)
    return () => c.stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scoreline = state ? `${state.score?.HOME||0} - ${state.score?.AWAY||0}` : '0 - 0'
  const minute = state ? Math.min(90, Math.floor(state.clockSec/60)) : 0

  function queueTactic(side, changes){ controller?.queueTacticChange(side, 0, changes) }
  function queueSub(side, outId, inId){ controller?.queueSub(side, outId, inId); setPendingSubs(ps => ({ ...ps, [side]: [...ps[side], { outId, inId }] })) }

  // Show newest first, limit to last 180 events for UI
  function filteredEvents(){
    // Keep chronological order here; panel will reverse for display after grouping
    const base = events.filter(e => !showKeyOnly || e.isKey)
    return base.slice(-180)
  }

  return (
    <div className="live-match-layout">
      <div className="live-match-main">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {(() => { window.currentHomeName = homeTeam.name; window.currentAwayName = awayTeam.name })()}
          <h3 style={{ margin:'0 0 6px' }}>Live Match — <span style={{ color: homeColors.primary }}>{homeTeam.name}</span> vs <span style={{ color: awayColors.primary }}>{awayTeam.name}</span></h3>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn-secondary" onClick={()=> controller?.fastForward()}>Fast Forward</button>
            <button className="btn-secondary" onClick={onExit}>Exit</button>
          </div>
        </div>
        <div className="scoreline-live">{scoreline} <span style={{ fontSize:14, marginLeft:8, color:'#93c5fd' }}>{minute}'</span>{state?.done && <span style={{ marginLeft:8, color:'#22c55e', fontSize:14 }}>FT</span>}</div>
  <PitchView homeTeam={homeTeam} awayTeam={awayTeam} userTeamName={userTeamName} state={state} homeColors={homeColors} awayColors={awayColors} events={events} />
      </div>
      <div className="live-sidebar">
        <div className="panel-tabs">
          <div className={`panel-tab ${panel==='timeline'?'active':''}`} onClick={()=> setPanel('timeline')}>Timeline</div>
          <div className={`panel-tab ${panel==='tactics'?'active':''}`} onClick={()=> setPanel('tactics')}>Tactics</div>
          <div className={`panel-tab ${panel==='subs'?'active':''}`} onClick={()=> setPanel('subs')}>Subs</div>
        </div>
  {panel==='timeline' && <TimelinePanel events={filteredEvents()} showKeyOnly={showKeyOnly} setShowKeyOnly={setShowKeyOnly} homeColors={homeColors} awayColors={awayColors} homeTeam={homeTeam} awayTeam={awayTeam} />}
        {panel==='tactics' && <TacticsPanel queueTactic={queueTactic} />}
        {panel==='subs' && <SubsPanel team={homeTeam} queueSub={queueSub} pending={pendingSubs.HOME} state={state} />}
      </div>
    </div>
  )
}

function TimelinePanel({ events, showKeyOnly, setShowKeyOnly, homeColors, awayColors, homeTeam, awayTeam }) {
  const GROUPABLE = new Set(['PASS','ADVANCE','TURNOVER','SECOND_PHASE','ADVANTAGE_NOTE'])
  const KEY_TYPES = new Set(['KICKOFF','GOAL','PENALTY_SCORED','PENALTY_SAVED','PENALTY_MISSED','FREE_KICK_GOAL','RED_CARD','INJURY','SUBSTITUTION','TACTIC_CHANGE','PERIOD_SUMMARY'])

  // Build player side map
  const playerMeta = React.useMemo(()=> {
    const map = {}
    homeTeam.players.forEach(p => { map[p.id] = { name: p.name, side:'HOME' } })
    awayTeam.players.forEach(p => { map[p.id] = { name: p.name, side:'AWAY' } })
    return map
  }, [homeTeam, awayTeam])

  function buildGroups(raw){
    const out = []
    let current = null
    function flush(){
      if (!current) return
      if (current.events.length === 1){
        // Just push the single event instead of a container
        out.push(current.events[0])
      } else {
        // Halve routine verbosity: drop every second routine event to reduce clutter
        const pruned = current.events.filter((_,i)=> i % 2 === 0)
        out.push({ id:`G${out.length+1}`, type:'GROUP', t: current.firstTime, minute: current.minute, events: pruned, originalCount: current.events.length })
      }
      current = null
    }
    raw.forEach(ev => {
      const minute = Math.floor(ev.t/60)
      const isKey = ev.isKey || KEY_TYPES.has(ev.type) || !GROUPABLE.has(ev.type)
      if (isKey){ flush(); out.push(ev); return }
      if (!current || current.minute !== minute){ flush(); current = { minute, firstTime: ev.t, events: [] } }
      current.events.push(ev)
    })
    flush()
    return out
  }

  const groupedChrono = React.useMemo(()=> buildGroups(events), [events])
  const display = React.useMemo(()=> groupedChrono.slice().reverse(), [groupedChrono])

  function nameSpan(id){
    const meta = playerMeta[id]; if (!meta) return 'Unknown'
    const sideColor = meta.side==='HOME' ? (homeColors.primary.toLowerCase()===awayColors.primary.toLowerCase()? homeColors.secondary: homeColors.primary) : (homeColors.primary.toLowerCase()===awayColors.primary.toLowerCase()? awayColors.secondary: awayColors.primary)
    return `<span data-pl="1" style="color:${sideColor}; font-weight:600">${meta.name}</span>`
  }
  function colorize(text){
    if (!text) return text
    // Replace exact player names (longest first to prevent partial overlap)
    const players = Object.values(playerMeta).map(p=>p.name).sort((a,b)=> b.length - a.length)
    let html = text
    players.forEach(n => {
      const esc = n.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')
      html = html.replace(new RegExp(`(^|[^>])(${esc})`,'g'), (m, pre, name)=> pre + `<span data-pl="1" style=\"color:${homeTeam.name===window.currentHomeName && homeTeam.players.find(p=>p.name===name)? homeColors.primary: awayColors.primary}; font-weight:600\">${name}</span>`)
    })
    // Team names
    ;[
      { name: window.currentHomeName, color: homeColors.primary },
      { name: window.currentAwayName, color: awayColors.primary }
    ].filter(x=>x.name).forEach(x => {
      const esc = x.name.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')
      html = html.replace(new RegExp(esc,'g'), `<span style=\"color:${x.color}; font-weight:700\">${x.name}</span>`)
    })
    return html
  }

  function renderEventLine(ev){
    // Use existing commentary if present
    let text = ev.commentary
    if (!text){
      if (ev.type==='PASS'){
        text = ev.success ? 'Pass completed.' : 'Pass lost.'
      } else if (ev.type==='ADVANCE'){
        text = ev.success ? 'Progress made.' : 'Advance stopped.'
      } else if (ev.type==='TURNOVER'){
        text = 'Possession lost.'
      } else if (ev.type==='ADVANTAGE_NOTE'){
        text = ev.note
      } else if (ev.type==='SECOND_PHASE'){
        text = 'Second phase retained.'
      } else {
        text = ev.type
      }
    }
    // Player-specific enrichment for passes when ids exist to ensure names appear
    if (ev.type==='PASS' && ev.passerId && ev.receiverId && !/passes to/.test(text)){
      text = `${playerMeta[ev.passerId]?.name||'Player'} passes to ${playerMeta[ev.receiverId]?.name||'teammate'}.`
    } else if (ev.type==='PASS' && !ev.success && ev.defenderId && ev.passerId && !/wins it/.test(text)){
      text = `${playerMeta[ev.defenderId]?.name||'Opponent'} wins it from ${playerMeta[ev.passerId]?.name||'player'}.`
    }
    return <li key={ev.id} className="group-line" dangerouslySetInnerHTML={{ __html: colorize(text) }} />
  }

  function renderItem(e){
    if (e.type==='GROUP'){
      return <li key={e.id} className="key group-block">
        <span className="event-clock">{String(e.minute).padStart(2,'0')}'</span>
        <span>{ICONS.GROUP}</span>
        <div style={{ flex:1 }}>
          <ul className="group-lines">
            {e.events.map(ev => renderEventLine(ev))}
          </ul>
        </div>
      </li>
    }
    // Non-group single event
    let text = e.commentary || e.type
    return <li key={e.id} className={e.isKey?'key':''}>
      <span className="event-clock">{String(Math.floor(e.t/60)).padStart(2,'0')}'</span>
      <span>{ICONS[e.type] || '·'}</span>
      <span style={{ flex:1 }} dangerouslySetInnerHTML={{ __html: colorize(text) }} />
    </li>
  }
  return (
    <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:420 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <h4 style={{ margin:0 }}>Timeline</h4>
        <label style={{ fontSize:11, display:'flex', gap:4, alignItems:'center' }}>
          <input type="checkbox" checked={showKeyOnly} onChange={e=> setShowKeyOnly(e.target.checked)} /> Solo Eventi Chiave
        </label>
      </div>
      <ul className="timeline-log">
        {display.map(e => renderItem(e))}
        {!display.length && <li style={{ opacity:0.6 }}>No events yet…</li>}
      </ul>
    </div>
  )
}

function TacticsPanel({ queueTactic }) {
  const [pressing, setPressing] = React.useState(0.5)
  const [tempo, setTempo] = React.useState(0.5)
  const [verticality, setVerticality] = React.useState(0.5)
  const [width, setWidth] = React.useState(0.5)
  const [formation, setFormation] = React.useState('442')
  function commit(){ queueTactic('HOME',{ pressing:parseFloat(pressing), tempo:parseFloat(tempo), verticality:parseFloat(verticality), width:parseFloat(width), formation }) }
  const slider = (label,val,setter) => (
    <div className="tactic-control">
      <label>{label}: {val}</label>
      <input type="range" min={0} max={1} step={0.05} value={val} onChange={(e)=> setter(parseFloat(e.target.value))} />
    </div>)
  return (
    <div className="card" style={{ flex:1 }}>
      <h4 style={{ marginTop:0 }}>Tactics</h4>
      <div className="tactics-grid">
        {slider('Pressing', pressing, setPressing)}
        {slider('Tempo', tempo, setTempo)}
        {slider('Verticality', verticality, setVerticality)}
        {slider('Width', width, setWidth)}
      </div>
      <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center' }}>
        <label style={{ fontSize:12 }}>Formation:</label>
        <select value={formation} onChange={e=> setFormation(e.target.value)} className="ui-select" style={{ minWidth:120 }}>
          {['442','433','451','4231','352','343'].map(f => <option key={f}>{f}</option>)}
        </select>
        <button className="btn-primary" onClick={commit}>Apply</button>
      </div>
      <div style={{ fontSize:11, marginTop:12, color:'var(--muted)' }}>Queued changes apply at next internal processing moment (action boundary).</div>
    </div>
  )
}

function SubsPanel({ team, queueSub, pending, state }) {
  const [selectedOut, setSelectedOut] = React.useState(null)
  const [selectedIn, setSelectedIn] = React.useState(null)
  const starters = React.useMemo(()=> team.players.filter(p => p.starting && p.slot), [team])
  const bench = React.useMemo(()=> team.players.filter(p => !p.starting), [team])
  function add(){ if (!selectedIn) return; queueSub('HOME', selectedOut, selectedIn); setSelectedOut(null); setSelectedIn(null) }
  return (
    <div className="card" style={{ flex:1, display:'flex', flexDirection:'column' }}>
      <h4 style={{ marginTop:0 }}>Substitutions</h4>
      <table className="subs-table">
        <thead><tr><th>Out</th><th>Stam</th><th></th></tr></thead>
        <tbody>
          {starters.map(p => <tr key={p.id} className={selectedOut===p.id?'highlight-amber':''} onClick={()=> setSelectedOut(p.id)} style={{ cursor:'pointer' }}>
            <td>{p.name}</td><td>{p.liveStamina? Math.round(p.liveStamina): '—'}</td><td>{p.fatigueFlag}</td>
          </tr>)}
        </tbody>
      </table>
      <div style={{ fontSize:11, margin:'6px 0 4px' }}>Bench</div>
      <table className="subs-table" style={{ marginBottom:6 }}>
        <thead><tr><th>In</th><th>OVR</th><th></th></tr></thead>
        <tbody>
          {bench.map(p => <tr key={p.id} className={selectedIn===p.id?'highlight-amber':''} style={{ cursor:'pointer' }} onClick={()=> setSelectedIn(p.id)}>
            <td>{p.name}</td><td>{p.overall}</td><td>{p.primaryRole}</td>
          </tr>)}
        </tbody>
      </table>
      <button className="btn-primary" disabled={!selectedIn} onClick={add}>Queue Sub</button>
      <div style={{ marginTop:8 }}>
        <strong style={{ fontSize:12 }}>Pending:</strong>
        <ul className="pending-subs">
          {pending.map((s,i)=><li key={i}>#{i+1} {abbrName(team.players.find(p=> p.id===s.outId)?.name)} → {abbrName(team.players.find(p=> p.id===s.inId)?.name)}</li>)}
          {!pending.length && <li style={{ opacity:0.6 }}>None</li>}
        </ul>
      </div>
      <div style={{ fontSize:11, marginTop:'auto', color:'var(--muted)' }}>Windows and usage displayed after engine expands substitution events.</div>
    </div>
  )
}

function abbrName(name){ if (!name) return '—'; const parts=name.split(' '); if (parts.length===1) return name; return parts[0][0]+'. '+parts.slice(1).join(' ') }

function PitchView({ homeTeam, awayTeam, userTeamName, state, homeColors, awayColors, events }) {
  // Helpers
  const deriveSection = (role) => {
    if (!role) return 'MF'
    if (role === 'GK') return 'GK'
    if (['DR','DC','DL'].includes(role)) return 'DF'
    if (['MR','MC','ML'].includes(role)) return 'MF'
    if (['FR','ST','FL'].includes(role)) return 'FW'
    return 'MF'
  }
  function buildStarters(team){
    const formation = team.tactics?.formation || team.formation || '442'
    const layout = (GAME_CONSTANTS.POSITION_ROLES?.[formation]) || GAME_CONSTANTS.POSITION_ROLES?.['442'] || {}
    // Prefer explicit starters with slot metadata
    let starters = team.players.filter(p=> p.starting && p.slot)
    // If count wrong, attempt rebuild using flagged starters first then any player
    if (starters.length !== 11){
      const pickFrom = (onlyStarting) => {
        const grouped = { GK:[], DF:[], MF:[], FW:[] }
        team.players.forEach(p => {
          if (!onlyStarting || p.starting){ grouped[deriveSection(p.primaryRole)].push(p) }
        })
        Object.keys(grouped).forEach(sec => grouped[sec].sort((a,b)=> (b.overall||0)-(a.overall||0)))
        const rebuilt=[]
        ;['GK','DF','MF','FW'].forEach(sec=> { const slots = layout[sec]||[]; for (let i=0;i<slots.length && grouped[sec].length;i++){ const pl=grouped[sec].shift(); if (pl) rebuilt.push({ ...pl, slot: pl.slot || { section:sec,index:i } }) } })
        return rebuilt
      }
      let rebuilt = pickFrom(true)
      if (rebuilt.length !== 11) rebuilt = pickFrom(false)
      if (rebuilt.length === 11) starters = rebuilt
    }
    if (starters.length !== 11){
      console.warn('[LiveMatch] Could not build full XI for team', team.name, 'have', starters.length)
    }
    return { starters, formation, layout }
  }
  const homeData = React.useMemo(()=> buildStarters(homeTeam), [homeTeam])
  const awayData = React.useMemo(()=> buildStarters(awayTeam), [awayTeam])
  const sections = ['GK','DF','MF','FW']
  // Inject lightweight style tag for animations once
  React.useEffect(()=> {
    if (document.getElementById('live-player-anim-style')) return
    const st = document.createElement('style'); st.id='live-player-anim-style'; st.textContent = `
      @keyframes lpPulse { 0%{ transform:translate(-50%, -50%) scale(1);} 50%{ transform:translate(-50%, -50%) scale(1.08);} 100%{ transform:translate(-50%, -50%) scale(1);} }
      @keyframes lpPossess { 0%{ box-shadow:0 0 0 0 rgba(251,191,36,0.55);} 70%{ box-shadow:0 0 0 12px rgba(251,191,36,0);} 100%{ box-shadow:0 0 0 0 rgba(251,191,36,0);} }
      @keyframes passDraw { 0%{ stroke-dashoffset:120; opacity:1;} 80%{opacity:1;} 100%{ stroke-dashoffset:0; opacity:0; } }
      @keyframes shotBurst { 0%{ transform:translate(-50%, -50%) scale(0.2); opacity:0.9;} 70%{ transform:translate(-50%, -50%) scale(1); opacity:0.4;} 100%{ transform:translate(-50%, -50%) scale(1.15); opacity:0;} }
      @keyframes goalFlash { 0%{ opacity:0.95; } 60%{ opacity:0.55;} 100%{ opacity:0; } }
      @keyframes keeperSavePulse { 0%{ transform:translate(-50%, -50%) scale(0.4); opacity:0.9;} 70%{ transform:translate(-50%, -50%) scale(1); opacity:0.4;} 100%{ transform:translate(-50%, -50%) scale(1.25); opacity:0;} }
      @keyframes goalOverlay { 0%{ opacity:0; transform:scale(0.85);} 25%{ opacity:1; transform:scale(1);} 75%{ opacity:1; transform:scale(1);} 100%{ opacity:0; transform:scale(1.05);} }
    `; document.head.appendChild(st)
  }, [])
  const colorsHome = homeColors
  const colorsAway = awayColors

  // Perspective: user team always at bottom (non-mirrored). If userTeamName not provided, default to home team bottom.
  const userIsHome = userTeamName ? homeTeam.name === userTeamName : true
  const bottomData = userIsHome ? homeData : awayData
  const topData = userIsHome ? awayData : homeData
  const bottomColors = userIsHome ? colorsHome : colorsAway
  const topColors = userIsHome ? colorsAway : colorsHome

  // --- Micro animations state (Task 44) ---
  const [passArcs, setPassArcs] = React.useState([]) // {id, from:{x,y}, to:{x,y}, created}
  const [shotBursts, setShotBursts] = React.useState([]) // {id, x,y, created}
  const [goalFlashes, setGoalFlashes] = React.useState([]) // {id, side, created}
  const [saveBursts, setSaveBursts] = React.useState([]) // {id,x,y,created}
  const [goalCelebrations, setGoalCelebrations] = React.useState([]) // {id, scorerSide, created, scorerId}
  const [ballPos, setBallPos] = React.useState({ x:50, y:50 })
  const prevHolderRef = React.useRef(null)
  const lastCountRef = React.useRef(0)
  const driftRef = React.useRef({}) // playerId -> {x,y}

  // Build player position map (id -> {x,y}) in percentage units
  // Combined player position map (home normal orientation, away mirrored vertically)
  const playerPosMap = React.useMemo(()=> {
    const map = {}
    bottomData.starters.forEach(p => { const slot=p.slot; if (!slot) return; const posDef = bottomData.layout[slot.section]?.[slot.index]; if (posDef) map[p.id] = { x: posDef.x, y: posDef.y } })
    topData.starters.forEach(p => { const slot=p.slot; if (!slot) return; const posDef = topData.layout[slot.section]?.[slot.index]; if (posDef) map[p.id] = { x: posDef.x, y: (100 - posDef.y) } })
    return map
  }, [bottomData, topData])

  React.useEffect(()=> {
    if (!events || !events.length) return
    const newEvents = events.slice(lastCountRef.current)
    lastCountRef.current = events.length
    const now = performance.now()
    const newPasses = []
    const newShots = []
    const newGoals = []
    const newSaves = []
    const newCelebrations = []
    newEvents.forEach(ev => {
      if (ev.type === 'PASS' && ev.success && ev.passerId && ev.receiverId) {
        const from = playerPosMap[ev.passerId]; const to = playerPosMap[ev.receiverId]
        if (from && to) newPasses.push({ id: ev.id||`P${now}${Math.random()}`, from, to, created: now })
      } else if ((ev.type === 'SHOT' || ev.type === 'GOAL' || ev.type === 'PENALTY_SCORED' || ev.type==='SHOT_SAVED') && ev.shooterId) {
        const pos = playerPosMap[ev.shooterId]
        if (pos) newShots.push({ id: ev.id||`S${now}${Math.random()}`, x: pos.x, y: pos.y, created: now })
        if (ev.type==='GOAL') {
          newGoals.push({ id: ev.id||`G${now}${Math.random()}`, side: ev.scorerSide, created: now })
          newCelebrations.push({ id: `C${ev.id||now}`, scorerSide: ev.scorerSide, created: now, scorerId: ev.scorerId })
        }
      }
      if (ev.type==='SHOT_SAVED' && ev.keeperId){
        const kp = playerPosMap[ev.keeperId];
        if (kp) newSaves.push({ id:`K${ev.id||now}`, x:kp.x, y:kp.y, created: now })
      }
    })
    if (newPasses.length) setPassArcs(prev => [...prev, ...newPasses])
    if (newShots.length) setShotBursts(prev => [...prev, ...newShots])
    if (newGoals.length) setGoalFlashes(prev => [...prev, ...newGoals])
    if (newSaves.length) setSaveBursts(prev => [...prev, ...newSaves])
    if (newCelebrations.length) setGoalCelebrations(prev => [...prev, ...newCelebrations])
  }, [events, playerPosMap])

  // Ball movement: animate to current holder position
  React.useEffect(()=> {
    const holder = state?.ballHolder
    if (!holder) return
    if (holder === prevHolderRef.current) return
    prevHolderRef.current = holder
    const pos = playerPosMap[holder]
    if (pos) setBallPos({ x: pos.x, y: pos.y })
  }, [state?.ballHolder, playerPosMap])

  // If after mount we still have default center ball but a kickoff event defined holder, snap once
  React.useEffect(()=> {
    if (!state || !events.length) return
    if (prevHolderRef.current) return
    const ko = events.find(e=> e.type==='KICKOFF' && e.holderId)
    if (ko && state.ballHolder === ko.holderId){
      const pos = playerPosMap[ko.holderId]
      if (pos){ prevHolderRef.current = ko.holderId; setBallPos({ x: pos.x, y: pos.y }) }
    }
  }, [state, events, playerPosMap])

  // Cleanup timers
  React.useEffect(()=> {
    const t = setInterval(()=> {
      const cutoff = performance.now() - 1400
      setPassArcs(p => p.filter(a => a.created > cutoff))
      setShotBursts(s => s.filter(b => b.created > cutoff))
      setGoalFlashes(g => g.filter(fl => fl.created > performance.now() - 1800))
      setSaveBursts(sv => sv.filter(s => s.created > performance.now() - 1100))
      setGoalCelebrations(c => c.filter(cc => cc.created > performance.now() - 2600))
    }, 600)
    return ()=> clearInterval(t)
  }, [])

  // Lightweight autonomous drift for players to create subtle motion (not tactical pathfinding)
  React.useEffect(()=> {
    const interval = setInterval(()=> {
      const updated = { ...driftRef.current }
      // small random jitter within +/-1.2% around base slot position
      Object.keys(playerPosMap).forEach(id => {
        const base = playerPosMap[id]
        if (!base) return
        const cur = updated[id] || { x: base.x, y: base.y }
        const targetX = base.x + (Math.random()*2.4 - 1.2)
        const targetY = base.y + (Math.random()*2.4 - 1.2)
        // ease a bit toward target
        cur.x = cur.x + (targetX - cur.x)*0.25
        cur.y = cur.y + (targetY - cur.y)*0.25
        updated[id] = cur
      })
      driftRef.current = updated
    }, 1200)
    return ()=> clearInterval(interval)
  }, [playerPosMap])

  function renderPassArcs(){
    if (!passArcs.length) return null
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {passArcs.map(a => {
          const mx = (a.from.x + a.to.x)/2
          const my = (a.from.y + a.to.y)/2 - 6
          const path = `M ${a.from.x} ${a.from.y} Q ${mx} ${my} ${a.to.x} ${a.to.y}`
          const strokeCol = bottomColors.secondary || '#ffffff'
          return <path key={a.id} d={path} stroke={strokeCol} strokeWidth={2.2} fill="none" strokeDasharray="120" style={{ animation:'passDraw 1.1s linear forwards' }} />
        })}
      </svg>
    )
  }
  function renderShotBursts(){
    return shotBursts.map(b => <div key={b.id} style={{ position:'absolute', left:`${b.x}%`, top:`${b.y}%`, width:20, height:20, borderRadius:'50%', background:'radial-gradient(circle at center, rgba(251,191,36,0.9), rgba(251,191,36,0.05))', transform:'translate(-50%, -50%)', animation:'shotBurst 700ms ease-out forwards', pointerEvents:'none' }} />)
  }
  function renderGoalFlashes(){
    if (!goalFlashes.length) return null
    return goalFlashes.map(g => <div key={g.id} style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(255,215,0,0.55), rgba(255,215,0,0) 65%)', animation:'goalFlash 1.2s ease-out forwards', pointerEvents:'none', mixBlendMode:'screen' }} />)
  }
  function renderSaveBursts(){
    return saveBursts.map(s => <div key={s.id} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, width:28, height:28, borderRadius:'50%', background:'radial-gradient(circle at center, rgba(59,130,246,0.85), rgba(59,130,246,0.05))', transform:'translate(-50%, -50%)', animation:'keeperSavePulse 800ms ease-out forwards', pointerEvents:'none' }} />)
  }
  function renderGoalCelebrations(){
    if (!goalCelebrations.length) return null
    return goalCelebrations.map(c => (
      <div key={c.id} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', animation:'goalOverlay 2.4s ease-in-out forwards' }}>
        <div style={{ background:'rgba(0,0,0,0.55)', padding:'18px 26px', borderRadius:18, border:'2px solid rgba(255,215,0,0.9)', boxShadow:'0 0 18px rgba(255,215,0,0.8), 0 0 42px rgba(255,215,0,0.4)', fontSize:34, fontWeight:800, letterSpacing:2, color:'#fde047', textShadow:'0 2px 4px rgba(0,0,0,0.6)' }}>GOAL!</div>
      </div>
    ))
  }
  // Render function for each side
  function renderSide(data, isBottom, teamColors){
    return sections.flatMap(sec => (data.layout[sec]||[]).map((pos, idx) => {
      const pl = data.starters.find(p=> p.slot && p.slot.section===sec && p.slot.index===idx)
      if (!pl) return null
      const flag = pl.fatigueFlag || (pl.liveStamina>=70?'OK': pl.liveStamina>=55?'WARN':'CRIT')
      const hasBall = state?.ballHolder === pl.id
      // Interleaved lane spacing (rich vertical separation) requested by user:
      // Order top->bottom: Opp GK, Opp DF, My FW, Opp MF, My MF, Opp FW, My DF, My GK
      // We map sections to target bands (min..max) and scale original slot.y inside.
  // Layout (updated request):
  // Opponent (top): GK 2–8, DF 12–20, MF 38–46, FW 68–76
  // User (bottom):  FW 30–36 (updated), MF 46–64, DF 78–86, GK 88–94
      // Note: This creates very advanced user forwards and very deep opponent forwards.
      const bands = isBottom ? {
        GK:{min:88,max:94},
        DF:{min:78,max:86},
        MF:{min:46,max:64},
        FW:{min:30,max:36}
      } : {
        GK:{min:2,max:8},
        DF:{min:12,max:20},
        MF:{min:38,max:46},
        FW:{min:68,max:76}
      }
      const b = bands[sec] || {min:isBottom?60:40,max:isBottom?70:50}
      const localY = (pos.y/100) // 0..1
      const y = b.min + (b.max - b.min)*localY
      return <LivePlayer key={pl.id} player={pl} x={pos.x} y={y} flag={flag} hasBall={hasBall} teamColors={teamColors} />
    }))
  }
  const anyMissing = (!bottomData.starters.length || !topData.starters.length)
  return (
    <div className="pitch-wrapper" style={{ background:`url(${fieldImg}) center/cover no-repeat`, width:600, aspectRatio:'0.64', position:'relative', border:'1px solid var(--border)', borderRadius:12, margin:'0 auto', overflow:'hidden', minHeight: '380px' }}>
      {renderSide(bottomData, true, bottomColors)}
      {renderSide(topData, false, topColors)}
      {anyMissing && (
        <div style={{ position:'absolute', bottom:4, left:4, fontSize:11, padding:'4px 6px', background:'rgba(0,0,0,0.45)', borderRadius:6, color:'#facc15' }}>Lineup auto-built (incomplete).</div>
      )}
      {renderPassArcs()}
      {renderShotBursts()}
      {renderGoalFlashes()}
      {renderSaveBursts()}
      {renderGoalCelebrations()}
      <div className="live-ball" style={{ left:`${ballPos.x}%`, top:`${ballPos.y}%` }} />
    </div>
  )
}

function LivePlayer({ player, x, y, flag, hasBall, teamColors }) {
  const isGK = player.primaryRole === 'GK'
  // Outfield uses primary fill; GK uses secondary fill (swap if equal)
  const primary = teamColors.primary || '#1565c0'
  const secondary = teamColors.secondary || '#ffffff'
  const gkFill = primary.toLowerCase() === secondary.toLowerCase() ? '#ffffff' : secondary
  const outfieldFill = primary
  const fill = isGK ? gkFill : outfieldFill
  const border = isGK ? primary : secondary
  const textColor = '#fff'
  const stamina = player.liveStamina || 100
  const ringColor = flag==='CRIT' ? '#dc2626' : flag==='WARN' ? '#facc15' : 'rgba(255,255,255,0.55)'
  // Drifted position (subtle movement) if available
  const drift = window.livePlayerDriftCache?.[player.id]
  const dx = drift?.x ?? x
  const dy = drift?.y ?? y
  return (
    <div title={`${player.name} • ${player.primaryRole} • OVR ${Math.round(player.effectiveOverall || player.overall||0)} • Stam ${Math.round(stamina)}`}
      style={{ position:'absolute', left:`${dx}%`, top:`${dy}%`, transform:'translate(-50%, -50%)', width:44, height:44, borderRadius:'50%', background:fill, border:`3px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:textColor, boxShadow:'0 2px 6px rgba(0,0,0,0.45)', animation:'lpPulse 6s infinite ease-in-out' }}>
      <span>{player.number}</span>
      <svg width={48} height={48} style={{ position:'absolute', top:-2, left:-2, transform:'rotate(-90deg)' }}>
        <circle cx={24} cy={24} r={20} stroke="rgba(255,255,255,0.15)" strokeWidth={4} fill="none" />
        <circle cx={24} cy={24} r={20} stroke={ringColor} strokeWidth={4} fill="none" strokeDasharray={`${(stamina/100)*2*Math.PI*20} ${2*Math.PI*20}`} strokeLinecap="round" />
      </svg>
    </div>
  )
}
