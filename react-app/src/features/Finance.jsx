import React, { useMemo } from 'react'
import { useGameState } from '../state/GameStateContext'
import { formatMillions } from '../utils/formatters'
import { GAME_CONSTANTS } from '../constants'
import { computeStadiumValue } from '../engine/financeEngine'
import { formatMoney } from '../utils/formatters'

function sectionOf(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

export default function Finance() {
  const { state, setState, saveNow } = useGameState()
  const team = state.teams.find(t => t.name === state.teamName)
  const players = useMemo(() => (team?.players || []).map(p => ({ ...p, section: sectionOf(p.primaryRole) })), [team])
  const money = (v) => formatMillions(v, { decimals: 2 })
  if (!team) return <div className="card">No team found. Start a career.</div>

  const sections = [
    { key: 'GK', label: 'Goalkeepers' },
    { key: 'DF', label: 'Defenders' },
    { key: 'MF', label: 'Midfielders' },
    { key: 'FW', label: 'Forwards' },
  ]

  function chooseSponsor(planId, brand) {
    const plan = (GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []).find(p => p.id === planId)
    if (!plan) return
    const idx = state.teams.findIndex(t => t.name === team.name)
    if (idx === -1) return
    const t = { ...state.teams[idx] }
    const fin = { ...t.finances }
    fin.cash = Number(((fin.cash || 0) + plan.upfront).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    fin.sponsorContract = { planId: plan.id, brand: brand || null, weeksRemaining: plan.durationWeeks }
    const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
    setState({ ...state, teams }); saveNow()
  }

  function invest(track) {
    const cfg = GAME_CONSTANTS.FINANCE.INVESTMENTS[track]
    if (!cfg) return
    const idx = state.teams.findIndex(t => t.name === team.name)
    if (idx === -1) return
    const t = { ...state.teams[idx] }
    const fin = { ...t.finances, investments: { ...(t.finances?.investments || { merchandising: 0, hospitality: 0 }) } }
    const currentLevel = fin.investments[track] || 0
    if (currentLevel >= cfg.levels.length) return
    const nextLevel = currentLevel + 1
    const cost = cfg.levels[currentLevel].cost
    if ((fin.cash || 0) < cost) return
    fin.cash = Number(((fin.cash || 0) - cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    fin.investments[track] = nextLevel
    const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
    setState({ ...state, teams }); saveNow()
  }

  function upgradeStadium(tierId) {
    const cfg = (GAME_CONSTANTS.FINANCE.STADIUM_UPGRADES || []).find(x => x.id === tierId)
    if (!cfg) return
    const idx = state.teams.findIndex(t => t.name === team.name)
    if (idx === -1) return
    const t = { ...state.teams[idx] }
    const fin = { ...t.finances }
    if ((fin.cash || 0) < cfg.cost) return
    const maxCap = GAME_CONSTANTS.FINANCE.MAX_STADIUM_CAPACITY
    const nextCap = Math.min(maxCap, (fin.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY) + cfg.addSeats)
    fin.cash = Number(((fin.cash || 0) - cfg.cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    fin.stadiumCapacity = nextCap
    fin.facilityCostPerSeat = Number(((fin.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT) * cfg.upkeepPerSeatMult).toFixed(3))
    const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
    setState({ ...state, teams }); saveNow()
  }

  const contract = team.finances?.sponsorContract
  const plans = GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []
  const sponsorOffers = React.useMemo(() => {
    const brands = GAME_CONSTANTS.FINANCE.SPONSOR_BRANDS || []
    const shuffled = [...brands].sort(()=> Math.random() - 0.5)
    return (plans || []).map((p, i) => ({ plan: p, brand: shuffled[i % (shuffled.length||1)] || `Sponsor ${i+1}` }))
  }, [plans, state.league?.week])
  const inv = team.finances?.investments || { merchandising: 0, hospitality: 0 }
  // Compute weekly recap mirroring finance engine logic
  const capacity = team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
  const attendance = team.finances?.attendance || GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE
  const ticketPrice = team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE
  const gate = (attendance * ticketPrice) / 1_000_000
  const planId = team.finances?.sponsorContract?.planId
  const weeksRem = team.finances?.sponsorContract?.weeksRemaining
  let sponsor = (GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT + GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH) / 52
  const plan = (GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []).find(p => p.id === planId)
  if (plan && weeksRem > 0) sponsor = plan.weekly
  const merchCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS.merchandising
  const hospCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS.hospitality
  const merchWeekly = (inv.merchandising || 0) > 0 ? merchCfg.levels[(inv.merchandising||0) - 1].weekly : 0
  const hospWeekly = (inv.hospitality || 0) > 0 ? hospCfg.levels[(inv.hospitality||0) - 1].weekly : 0
  const passive = merchWeekly + hospWeekly
  const wagesWeekly = (players || []).reduce((s,p)=> s + (p.wage || 0), 0)
  const perSeat = team.finances?.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT
  const maintenance = (capacity * perSeat) / 1_000_000 + ((team.finances?.cash || 0) * GAME_CONSTANTS.FINANCE.MAINTENANCE_COST_PERCENTAGE) / 52
  const loanInterest = (team.finances?.history?.slice(-1)[0]?.loanInterest) || 0
  const principalPayment = (team.finances?.history?.slice(-1)[0]?.principalPayment) || 0
  const income = gate + sponsor + passive
  const expenses = maintenance + wagesWeekly + loanInterest + principalPayment
  const net = Number((income - expenses).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))

  // Finance history for charts
  const history = team.finances?.history || []
  const last = history.slice(-8)

  function setTicketPrice(v) {
    const idx = state.teams.findIndex(t => t.name === team.name)
    if (idx === -1) return
    const t = { ...state.teams[idx] }
    const fin = { ...t.finances, ticketPrice: Math.round(Number(v)) }
    const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
    setState({ ...state, teams }); saveNow()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Weekly Finance Summary</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Income</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px' }}>Cash</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#2dd4bf' }}>{money(team.finances?.cash || 0)}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px' }}>Gate</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#16a34a' }}>{money(gate)}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px' }}>Sponsor</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#16a34a' }}>{money(sponsor)}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px' }}>Passive</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#16a34a' }}>{money(passive)}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px' }}>Wages</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(wagesWeekly)}</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px' }}>Maintenance</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(maintenance)}</td>
            </tr>
            {loanInterest > 0 && (
              <tr>
                <td style={{ padding: '6px 8px' }}>Loan interest</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(loanInterest)}</td>
              </tr>
            )}
            {principalPayment > 0 && (
              <tr>
                <td style={{ padding: '6px 8px' }}>Loan principal</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(principalPayment)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ padding: 0 }}>
                <div style={{ borderTop: '1px solid #334155', margin: '6px 0' }}></div>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', fontWeight: 700 }}>Net</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
              <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 800, color: net >= 0 ? '#16a34a' : '#dc2626' }}>{money(net)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Loans */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Loans</h3>
        {(() => {
          const fin = team.finances || {}
          const stadiumValue = computeStadiumValue(fin)
          const banks = GAME_CONSTANTS.FINANCE.LOAN_BANKS || []
          // Propose 3 random offers based on LTV and rate ranges
          function rngPick3(arr) {
            const a = [...arr]
            a.sort(()=> Math.random()-0.5)
            return a.slice(0,3)
          }
          const picks = rngPick3(banks)
          const ltvMin = GAME_CONSTANTS.FINANCE.LOAN_LTV_RANGE.MIN
          const ltvMax = GAME_CONSTANTS.FINANCE.LOAN_LTV_RANGE.MAX
          const rMin = GAME_CONSTANTS.FINANCE.LOAN_RATE_RANGE_WEEKLY.MIN
          const rMax = GAME_CONSTANTS.FINANCE.LOAN_RATE_RANGE_WEEKLY.MAX
          const terms = GAME_CONSTANTS.FINANCE.LOAN_TERMS_WEEKS

          function makeOffer(name) {
            const ltv = (ltvMin + Math.random()*(ltvMax-ltvMin))
            const amount = Number((stadiumValue * ltv).toFixed(2))
            const rate = Number((rMin + Math.random()*(rMax-rMin)).toFixed(4))
            const term = terms[Math.floor(Math.random()*terms.length)]
            const weeklyInterest = Number((amount * rate).toFixed(3))
            return { bank: name, amount, weeklyRate: rate, term, weeklyInterest }
          }
          const offers = picks.map(makeOffer)

          function acceptLoan(offer) {
            const idx = state.teams.findIndex(t => t.name === team.name)
            if (idx === -1) return
            const t = { ...state.teams[idx] }
            const fin2 = { ...t.finances }
            const activeLoans = Array.isArray(fin2.loans) ? fin2.loans.length : 0
            const maxLoans = GAME_CONSTANTS.FINANCE.MAX_ACTIVE_LOANS || 2
            if (activeLoans >= maxLoans) return
            // second loan has extra interest multiplier
            let adjRate = offer.weeklyRate
            if (activeLoans === 1) {
              adjRate = Number((adjRate * (GAME_CONSTANTS.FINANCE.SECOND_LOAN_RATE_MULT || 2.5)).toFixed(4))
            }
            fin2.cash = Number(((fin2.cash || 0) + offer.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
            const newLoan = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              bank: offer.bank,
              principal: offer.amount,
              principalRemaining: offer.amount,
              weeklyRate: adjRate,
              weeksRemaining: offer.term,
            }
            fin2.loans = Array.isArray(fin2.loans) ? [...fin2.loans, newLoan] : [newLoan]
            const teams = [...state.teams]; teams[idx] = { ...t, finances: fin2 }
            setState({ ...state, teams }); saveNow()
          }

          return (
            <div>
              <div style={{ marginBottom: 6 }}>Stadium value: <strong>{money(stadiumValue)}</strong></div>
              {fin.loans && fin.loans.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div>Active loans:</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {fin.loans.map((l) => (
                      <li key={l.id}>{l.bank}: principal {money(l.principalRemaining)} — {l.weeksRemaining}w left @ {Math.round((l.weeklyRate||0)*10000)/100}%/wk</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {offers.map((o,i) => {
                  const activeLoans = fin.loans ? fin.loans.length : 0
                  const maxLoans = GAME_CONSTANTS.FINANCE.MAX_ACTIVE_LOANS || 2
                  const disabled = activeLoans >= maxLoans
                  const mult = activeLoans === 1 ? (GAME_CONSTANTS.FINANCE.SECOND_LOAN_RATE_MULT || 2.5) : 1
                  const adjRate = Number((o.weeklyRate * mult).toFixed(4))
                  const weeklyInterestEuro = formatMoney(Math.round(o.amount * adjRate * 1_000_000), { decimals: 0, useCommaDecimal: true })
                  const title = disabled
                    ? `Maximum of ${maxLoans} active loans reached.`
                    : `Amount ${money(o.amount)} • Term ${o.term}w • Weekly interest ${weeklyInterestEuro} (${(adjRate*100).toFixed(2)}%)`
                  return (
                    <button key={i} onClick={() => acceptLoan(o)} disabled={disabled} title={title}>
                      {o.bank}: {money(o.amount)} @ {(adjRate*100).toFixed(2)}%/wk • Interest {weeklyInterestEuro}/wk • {o.term}w
                    </button>
                  )
                })}
              </div>
              <div className="hint" style={{ marginTop: 6 }}>Interest is paid weekly; principal is due at the end of term.</div>
            </div>
          )
        })()}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Stadium & Tickets</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>Attendance: {team.finances?.attendance || 0} / {team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY}</div>
          <div>
            Ticket Price: <strong>{(team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE)}€</strong>
            <input style={{ marginLeft: 8 }} type="range" min="20" max="120" step="1" value={team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE} onChange={(e)=> setTicketPrice(e.target.value)} />
          </div>
          <div className="hint">Higher price raises gate per fan but may cap total income if attendance bottoms at min fill.</div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {(GAME_CONSTANTS.FINANCE.STADIUM_UPGRADES || []).map(u => {
            const capNow = team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
            const maxCap = GAME_CONSTANTS.FINANCE.MAX_STADIUM_CAPACITY
            const nextCap = Math.min(maxCap, capNow + u.addSeats)
            const canAfford = (team.finances?.cash || 0) >= u.cost
            const atCap = capNow >= maxCap
            const reason = atCap ? `At max capacity (${maxCap}).` : (!canAfford ? `Need ${money(u.cost)} cash.` : '')
            return (
              <button
                key={u.id}
                onClick={() => upgradeStadium(u.id)}
                disabled={atCap || !canAfford}
                title={`Add ${u.addSeats} seats → ${nextCap} total • Cost ${money(u.cost)} • Upkeep x${u.upkeepPerSeatMult}${reason ? `\n${reason}` : ''}`}
              >
                Upgrade {u.id.toUpperCase()} (+{u.addSeats}) — Cost {money(u.cost)} → {nextCap}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Cash Trend (last {last.length} weeks)</h3>
        <svg width="100%" height="120" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ background: '#0b1420', borderRadius: 6 }}>
          {last.length > 1 && (() => {
            const xs = last.map((_, i) => (i/(last.length-1))*300 + 10)
            const ys = (() => {
              const vals = last.map(e => e.cash)
              const min = Math.min(...vals)
              const max = Math.max(...vals)
              const scale = (v) => 100 - (max === min ? 0.5 : (v - min)/(max - min)) * 100
              return vals.map(scale)
            })()
            const d = last.map((_, i) => `${i===0?'M':'L'} ${xs[i]} ${ys[i]+10}`).join(' ')
            return (
              <>
                <polyline fill="none" stroke="#2dd4bf" strokeWidth="2" points={last.map((_, i)=>`${xs[i]},${ys[i]+10}`).join(' ')} />
                <path d={d} fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.6" />
              </>
            )
          })()}
        </svg>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Weekly Breakdown (last {last.length}w)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
          {last.map((e, i) => {
            const inc = e.gate + e.sponsor + e.passive
            const exp = e.wages + e.maintenance
            const incH = Math.max(4, Math.min(100, Math.round((inc/(inc+exp||1))*100)))
            const expH = 100 - incH
            return (
              <div key={i} title={`W${e.week} Net ${money(e.net)} | Inc ${money(inc)} / Exp ${money(exp)}`} style={{ display:'flex', flexDirection:'column', height:120 }}>
                <div style={{ flex: `${incH} 1 0`, background:'#16a34a', borderRadius:'4px 4px 0 0' }}></div>
                <div style={{ flex: `${expH} 1 0`, background:'#dc2626', borderRadius:'0 0 4px 4px' }}></div>
                <div style={{ textAlign:'center', marginTop:4 }}>W{e.week}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Sponsor</h3>
        {!contract || contract.weeksRemaining <= 0 ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {sponsorOffers.map(({ plan: p, brand }) => (
              <button key={p.id} onClick={() => chooseSponsor(p.id, brand)} title={`Upfront: ${money(p.upfront)}, Weekly: ${money(p.weekly)}, Duration: ${p.durationWeeks}w`}>
                {brand} — Upfront {money(p.upfront)} / Weekly {money(p.weekly)}
              </button>
            ))}
          </div>
        ) : (
          <div>
            Active: {contract.brand || plans.find(x => x.id === contract.planId)?.label || contract.planId} — Weeks remaining: {contract.weeksRemaining}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Investments</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {(['merchandising','hospitality']).map(track => {
            const cfg = GAME_CONSTANTS.FINANCE.INVESTMENTS[track]
            const lvl = inv[track] || 0
            const next = lvl < cfg.levels.length ? cfg.levels[lvl] : null
            return (
              <div key={track} className="card" style={{ padding: 8 }}>
                <h4 style={{ margin: '4px 0' }}>{cfg.label}</h4>
                <div>Level: {lvl}/{cfg.levels.length}</div>
                <div>Current weekly: {money(lvl > 0 ? cfg.levels[lvl-1].weekly : 0)}</div>
                {next ? (
                  <button onClick={() => invest(track)} title={`Cost ${money(next.cost)} → Weekly +${money(next.weekly)}`}>Invest (Cost {money(next.cost)})</button>
                ) : (
                  <div>Max level reached</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Suggestions</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(() => {
            const items = []
            if (wagesWeekly > gate + sponsor + passive) items.push('Your weekly wages exceed your income. Consider a cheaper sponsor plan, selling a high earner, or investing to grow passive income.')
            if ((team.finances?.attendance||0) >= (team.finances?.stadiumCapacity||GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY) * 0.95) items.push('Stadium near capacity. Consider increasing ticket price slightly to improve gate revenue.')
            if ((team.finances?.attendance||0) <= (team.finances?.stadiumCapacity||GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY) * GAME_CONSTANTS.FINANCE.MIN_ATTENDANCE_PERCENTAGE + 100) items.push('Attendance near minimum. Lowering ticket price might increase total gate if fans return above the floor.')
            if ((team.finances?.investments?.merchandising||0) === 0) items.push('Invest in Merchandising to unlock steady weekly passive income.')
            if ((team.finances?.sponsorContract?.weeksRemaining||0) < 4) items.push('Sponsor contract ending soon. Plan a renewal to avoid losing weekly sponsor income.')
            // Show indicative salary cap
            const capEstimate = (() => {
              const perSeat = team.finances?.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT
              const maintenanceEst = (capacity * perSeat) / 1_000_000
              const cap = Math.max(0, gate + sponsor + passive - maintenanceEst) * (GAME_CONSTANTS.FINANCE.SALARY_CAP_RATIO || 0.85)
              return Number(cap.toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
            })()
            items.unshift(`Estimated weekly salary cap: ${money(capEstimate)} (offers exceeding this may be rejected).`)
            return items.length ? items.map((s,i)=>(<li key={i}>{s}</li>)) : (<li>No immediate suggestions. Keep up the good management!</li>)
          })()}
        </ul>
      </div>
      {/* Player list moved to Market > My Players tab */}
    </div>
  )
}
