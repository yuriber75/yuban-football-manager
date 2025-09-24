import React, { useMemo, useState } from 'react'
import { useGameState } from '../state/GameStateContext'
import { formatMillions, formatMoney } from '../utils/formatters'
import { GAME_CONSTANTS } from '../constants'
import { computeStadiumValue } from '../engine/financeEngine'

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
  const [tab, setTab] = useState('overview')
  const [loanModal, setLoanModal] = useState({ open: false, loanId: null, amount: '' })
  const players = useMemo(() => (team?.players || []).map(p => ({ ...p, section: sectionOf(p.primaryRole) })), [team])
  const money = (v) => formatMillions(v, { decimals: 2 })
  if (!team) return <div className="card">No team found. Start a career.</div>

  // Memoized random offers (refresh when switching to Revenues tab)
  const loanOffers = useMemo(() => {
    if (tab !== 'revenues') return []
    const fin = team.finances || {}
    const stadiumValue = computeStadiumValue(fin)
    const banks = GAME_CONSTANTS.FINANCE.LOAN_BANKS || []
    const ltvMin = GAME_CONSTANTS.FINANCE.LOAN_LTV_RANGE.MIN
    const ltvMax = GAME_CONSTANTS.FINANCE.LOAN_LTV_RANGE.MAX
    const rMin = GAME_CONSTANTS.FINANCE.LOAN_RATE_RANGE_WEEKLY.MIN
    const rMax = GAME_CONSTANTS.FINANCE.LOAN_RATE_RANGE_WEEKLY.MAX
    const terms = GAME_CONSTANTS.FINANCE.LOAN_TERMS_WEEKS
    const shuffled = [...banks].sort(() => Math.random() - 0.5).slice(0, Math.min(3, banks.length))
    return shuffled.map((name) => {
      const ltv = (ltvMin + Math.random()*(ltvMax-ltvMin))
      const amount = Number((stadiumValue * ltv).toFixed(2))
      const rate = Number((rMin + Math.random()*(rMax-rMin)).toFixed(4))
      const term = terms[Math.floor(Math.random()*terms.length)]
      const weeklyInterest = Number((amount * rate).toFixed(3))
      return { bank: name, amount, weeklyRate: rate, term, weeklyInterest }
    })
  }, [tab])

  const sponsorOffersMemo = useMemo(() => {
    if (tab !== 'revenues') return []
    const plans = GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []
    const brands = GAME_CONSTANTS.FINANCE.SPONSOR_BRANDS || []
    const shuffled = [...brands].sort(()=> Math.random() - 0.5)
    return (plans || []).map((p, i) => ({ plan: p, brand: shuffled[i % (shuffled.length||1)] || `Sponsor ${i+1}` }))
  }, [tab])

  const tvOffersMemo = useMemo(() => {
    if (tab !== 'revenues') return []
    const providers = GAME_CONSTANTS.FINANCE.TV_PROVIDERS || []
    const dealTemplates = GAME_CONSTANTS.FINANCE.TV_DEAL_OPTIONS || []
    function pickN(arr, n) { const a = [...arr]; a.sort(()=> Math.random()-0.5); return a.slice(0, Math.max(0, Math.min(n, a.length))) }
    function rndIn([a,b]) { return Number((a + Math.random()*(b-a)).toFixed(2)) }
    function rndIntIn([a,b]) { const min = Math.ceil(a); const max = Math.floor(b); return Math.floor(Math.random()*(max-min+1))+min }
    return pickN(providers, 3).map((provider) => {
      const tpl = dealTemplates[Math.floor(Math.random()*(dealTemplates.length||1))] || { fixedWeeklyRange:[0.2,0.4], variableWeeklyRange:[0.1,0.2], durationWeeks:[26,52], id: 'custom' }
      const fixed = rndIn(tpl.fixedWeeklyRange)
      const variableTop = rndIn(tpl.variableWeeklyRange)
      const duration = rndIntIn(tpl.durationWeeks)
      return { provider, template: tpl.id, fixed, variableTop, duration }
    })
  }, [tab])

  // Weekly snapshot (mirrors engine aggregation)
  const inv = team.finances?.investments || { merchandising: 0, hospitality: 0 }
  const capacity = team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
  const attendance = team.finances?.attendance || GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE
  const ticketPrice = team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE
  const gate = (attendance * ticketPrice) / 1_000_000
  const planId = team.finances?.sponsorContract?.planId
  const weeksRem = team.finances?.sponsorContract?.weeksRemaining
  let sponsor = (GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT + GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH) / 52
  const sponsorPlan = (GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []).find(p => p.id === planId)
  if (sponsorPlan && weeksRem > 0) sponsor = sponsorPlan.weekly
  const merchCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS.merchandising
  const hospCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS.hospitality
  const merchWeekly = (inv.merchandising || 0) > 0 ? merchCfg.levels[(inv.merchandising||0) - 1].weekly : 0
  const hospWeekly = (inv.hospitality || 0) > 0 ? hospCfg.levels[(inv.hospitality||0) - 1].weekly : 0
  const passive = merchWeekly + hospWeekly
  const wagesWeekly = (players || []).reduce((s,p)=> s + (p.wage || 0), 0)
  const perSeat = team.finances?.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT
  const maintenance = (capacity * perSeat) / 1_000_000 + ((team.finances?.cash || 0) * GAME_CONSTANTS.FINANCE.MAINTENANCE_COST_PERCENTAGE) / 52
  const tvRights = team.finances?.tvRightsWeekly ?? GAME_CONSTANTS.FINANCE.TV_RIGHTS_DEFAULT_WEEKLY
  const compPrizes = team.finances?.competitionPrizesWeekly ?? GAME_CONSTANTS.FINANCE.COMPETITION_PRIZES_DEFAULT_WEEKLY
  const clausesProvision = team.finances?.clausesProvisionWeekly ?? GAME_CONSTANTS.FINANCE.CLAUSES_PROVISION_DEFAULT_WEEKLY
  const maintPlanWeekly = (()=>{ const id = team.finances?.maintenancePlanId || 'basic'; const plan = (GAME_CONSTANTS.FINANCE.STADIUM_MAINTENANCE_PLANS||[]).find(p=>p.id===id); return plan?.weekly || 0 })()
  const trainUpkeep = (()=>{
    const cfg = GAME_CONSTANTS.FINANCE.TRAINING_FACILITY
    const legacyLvl = team.finances?.trainingLevel||0
    const tf = team.finances?.trainingFacility || { pitches: 0, gym: 0, lockers: 0 }
    // If per-area not initialized, fall back to legacy single-level config
    const usingAreas = (tf.pitches||0) + (tf.gym||0) + (tf.lockers||0) > 0
    if (!usingAreas) {
      return legacyLvl>0 ? (cfg.levels[legacyLvl-1]?.weekly||0) : 0
    }
    const sum = ['pitches','gym','lockers'].reduce((acc, key) => {
      const lvl = tf[key] || 0
      const lvls = cfg.AREAS?.[key]?.levels || []
      return acc + (lvl>0 ? (lvls[lvl-1]?.weekly || 0) : 0)
    }, 0)
    return sum
  })()
  const medUpkeep = (()=>{ const lvl = team.finances?.medicalLevel||0; const cfg = GAME_CONSTANTS.FINANCE.MEDICAL_DEPT; return lvl>0 ? (cfg.levels[lvl-1]?.weekly||0) : 0 })()
  const doctorsPay = (team.finances?.doctors||0) * (GAME_CONSTANTS.FINANCE.MEDICAL_DEPT?.perDoctorWeekly||0)
  const techStaffWeekly = (()=>{ const id = team.finances?.technicalStaffId || 'basic'; const opt = (GAME_CONSTANTS.FINANCE.TECHNICAL_STAFF||[]).find(s=>s.id===id); return opt?.weekly || 0 })()
  const loanInterest = (team.finances?.history?.slice(-1)[0]?.loanInterest) || 0
  const principalPayment = (team.finances?.history?.slice(-1)[0]?.principalPayment) || 0
  const income = gate + sponsor + passive + tvRights + compPrizes
  const expenses = maintenance + maintPlanWeekly + trainUpkeep + medUpkeep + doctorsPay + techStaffWeekly + clausesProvision + wagesWeekly + loanInterest + principalPayment
  const net = Number((income - expenses).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))

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

  // Helpers used in Revenues/Loans
  function computeWeeklyPayment(principal, weeklyRate, weeks) {
    const P = principal
    const r = weeklyRate
    const n = weeks
    if (!r || r <= 0) return Number((P / n).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    const num = P * r * Math.pow(1 + r, n)
    const den = Math.pow(1 + r, n) - 1
    return Number((num / den).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
  }

  function acceptLoan(offer) {
    const idx = state.teams.findIndex(t => t.name === team.name)
    if (idx === -1) return
    const t = { ...state.teams[idx] }
    const fin2 = { ...t.finances }
    const activeLoans = Array.isArray(fin2.loans) ? fin2.loans.length : 0
    const maxLoans = GAME_CONSTANTS.FINANCE.MAX_ACTIVE_LOANS || 2
    if (activeLoans >= maxLoans) return
    let adjRate = offer.weeklyRate
    if (activeLoans === 1) adjRate = Number((adjRate * (GAME_CONSTANTS.FINANCE.SECOND_LOAN_RATE_MULT || 2.5)).toFixed(4))
    fin2.cash = Number(((fin2.cash || 0) + offer.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    const weeklyPayment = computeWeeklyPayment(offer.amount, adjRate, offer.term)
    const newLoan = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, bank: offer.bank, principal: offer.amount, principalRemaining: offer.amount, weeklyRate: adjRate, weeksRemaining: offer.term, weeklyPayment }
    fin2.loans = Array.isArray(fin2.loans) ? [...fin2.loans, newLoan] : [newLoan]
    const teams = [...state.teams]; teams[idx] = { ...t, finances: fin2 }
    setState({ ...state, teams }); saveNow()
  }

  // loanOffers now memoized above

  return (
    <div>
      {team.finances?.inAdministration && (
        <div className="card" style={{ marginBottom: 12, borderColor:'#b91c1c' }}>
          <strong className="admin-badge">Administration</strong>
          <div className="hint error">Club under financial administration. Transfers and new loans are blocked until cash is positive for 2 consecutive weeks.</div>
        </div>
      )}
      {/* Subtabs */}
      <div className="subtabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'revenues', label: 'Revenues' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'staff', label: 'Staff' },
          { id: 'projections', label: 'Projections' },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={()=> setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
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
                <td style={{ padding: '6px 8px' }}>TV Rights</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#16a34a' }}>{money(tvRights)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Competition Prizes</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#16a34a' }}>{money(compPrizes)}</td>
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
              <tr>
                <td style={{ padding: '6px 8px' }}>Maintenance Plan add-on</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(maintPlanWeekly)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Training Facility upkeep</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(trainUpkeep)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Medical Dept upkeep</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(medUpkeep)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Doctors salaries</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(doctorsPay)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Technical Staff</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(techStaffWeekly)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>Contract Clauses provision</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#dc2626' }}>-{money(clausesProvision)}</td>
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
      )}

      {/* Revenues - Loans */}
      {tab === 'revenues' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Loans</h3>
          {(() => {
            const fin = team.finances || {}
            return (
              <div>
                {fin.loans && fin.loans.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div>Active loans:</div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {fin.loans.map((l) => (
                        <li key={l.id}>
                          {l.bank}: remaining {money(l.principalRemaining)} — {l.weeksRemaining}w left @ {Math.round((l.weeklyRate||0)*10000)/100}%/wk
                          {l.weeklyPayment ? <span> • Weekly payment: <strong>{money(l.weeklyPayment)}</strong></span> : null}
                          <span> • </span>
                          <button title="Reduce debt via early principal payment" onClick={() => setLoanModal({ open: true, loanId: l.id, amount: '' })}>Reduce debt (pay in advance)</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {loanOffers.map((o,i) => {
                    const activeLoans = fin.loans ? fin.loans.length : 0
                    const maxLoans = GAME_CONSTANTS.FINANCE.MAX_ACTIVE_LOANS || 2
                    const disabled = activeLoans >= maxLoans || !!fin.inAdministration
                    const mult = activeLoans === 1 ? (GAME_CONSTANTS.FINANCE.SECOND_LOAN_RATE_MULT || 2.5) : 1
                    const adjRate = Number((o.weeklyRate * mult).toFixed(4))
                    const weeklyPaymentM = (() => {
                      const P = o.amount, r = adjRate, n = o.term
                      if (!r || r <= 0) return Number((P / n).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                      const num = P * r * Math.pow(1 + r, n)
                      const den = Math.pow(1 + r, n) - 1
                      return Number((num / den).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                    })()
                    const weeklyPaymentEuro = formatMoney(Math.round(weeklyPaymentM * 1_000_000), { decimals: 0, useCommaDecimal: true })
                    const title = disabled
                      ? (fin.inAdministration ? 'Blocked under administration' : `Maximum of ${maxLoans} active loans reached.`)
                      : `Amount ${money(o.amount)} • Term ${o.term}w • Weekly payment ${weeklyPaymentEuro} (${(adjRate*100).toFixed(2)}% interest)`
                    return (
                      <button key={i} onClick={() => acceptLoan(o)} disabled={disabled} title={title}>
                        {o.bank}: {money(o.amount)} @ {(adjRate*100).toFixed(2)}%/wk • Payment {weeklyPaymentEuro}/wk • {o.term}w
                      </button>
                    )
                  })}
                </div>
                {fin.inAdministration && <div className="hint error" style={{ marginTop: 6 }}>No new loans allowed while under administration.</div>}
                {/* Loan extra payment modal rendered once here */}
                {loanModal.open && (() => {
                  const t = state.teams.find(x => x.name === team.name)
                  const finCur = t?.finances || {}
                  const loan = (finCur.loans || []).find(x => x.id === loanModal.loanId)
                  const maxPay = Math.max(0, Math.min(finCur.cash || 0, loan?.principalRemaining || 0))
                  const valNum = Number(loanModal.amount || 0)
                  const valid = valNum > 0 && valNum <= maxPay
                  function doConfirm() {
                    const idx = state.teams.findIndex(tt => tt.name === team.name)
                    if (idx === -1) return setLoanModal({ open: false, loanId: null, amount: '' })
                    const teamCopy = { ...state.teams[idx] }
                    const fin2 = { ...teamCopy.finances }
                    const loans2 = (fin2.loans || []).map(x => ({ ...x }))
                    const i = loans2.findIndex(x => x.id === loanModal.loanId)
                    if (i === -1) return setLoanModal({ open: false, loanId: null, amount: '' })
                    const pay = Math.min(Number(valNum || 0), loans2[i].principalRemaining, fin2.cash)
                    if (!(pay > 0)) return
                    fin2.cash = Number(((fin2.cash || 0) - pay).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                    loans2[i].principalRemaining = Number((loans2[i].principalRemaining - pay).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                    fin2.loans = loans2
                    const teams = [...state.teams]; teams[idx] = { ...teamCopy, finances: fin2 }
                    setState({ ...state, teams })
                    saveNow()
                    setLoanModal({ open: false, loanId: null, amount: '' })
                  }
                  function closeModal() { setLoanModal({ open: false, loanId: null, amount: '' }) }
                  return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={closeModal}>
                      <div className="card" style={{ width: 420, maxWidth: '95vw' }} role="dialog" aria-modal="true" onClick={(e)=> e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Reduce debt (pay in advance)</h3>
                        <div className="hint" style={{ marginBottom: 8 }}>Enter an extra principal payment to reduce your remaining debt. Max: {money(maxPay)}.</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <label htmlFor="loanExtraPay">Amount (M€)</label>
                          <input id="loanExtraPay" type="number" min="0" step="0.01" value={loanModal.amount} onChange={(e)=> setLoanModal(prev => ({ ...prev, amount: e.target.value }))} />
                          {!valid && <span className="hint error">Enter a value &gt; 0 and ≤ {money(maxPay)}</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                          <button disabled={!valid} onClick={doConfirm}>Confirm payment</button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                <div className="hint" style={{ marginTop: 6 }}>French amortization: fixed weekly payment (interest + principal). You can make extra principal payments to reduce remaining debt and shorten the term.</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Expenses - Stadium & Tickets (moved from Facilities) */}
      {tab === 'expenses' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Stadium & Tickets</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>Attendance: {team.finances?.attendance || 0} / {team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY}</div>
            <div>Ticket Price: <strong>{(team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE)}€</strong>
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
                <button key={u.id} onClick={() => {
                  const cfg = (GAME_CONSTANTS.FINANCE.STADIUM_UPGRADES || []).find(x => x.id === u.id)
                  if (!cfg) return
                  const idx = state.teams.findIndex(t => t.name === team.name)
                  if (idx === -1) return
                  const t = { ...state.teams[idx] }
                  const fin = { ...t.finances }
                  if ((fin.cash || 0) < cfg.cost) return
                  const maxCap2 = GAME_CONSTANTS.FINANCE.MAX_STADIUM_CAPACITY
                  const nextCap2 = Math.min(maxCap2, (fin.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY) + cfg.addSeats)
                  fin.cash = Number(((fin.cash || 0) - cfg.cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                  fin.stadiumCapacity = nextCap2
                  fin.facilityCostPerSeat = Number(((fin.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT) * cfg.upkeepPerSeatMult).toFixed(3))
                  const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                  setState({ ...state, teams }); saveNow()
                }} disabled={atCap || !canAfford} title={`Add ${u.addSeats} seats → ${nextCap} total • Cost ${money(u.cost)} • Upkeep x${u.upkeepPerSeatMult}${reason ? `\n${reason}` : ''}`}>
                  Upgrade {u.id.toUpperCase()} (+{u.addSeats}) — Cost {money(u.cost)} → {nextCap}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Projections */}
      {tab === 'projections' && (
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
              return (<>
                <polyline fill="none" stroke="#2dd4bf" strokeWidth="2" points={last.map((_, i)=>`${xs[i]},${ys[i]+10}`).join(' ')} />
                <path d={d} fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.6" />
              </>)
            })()}
          </svg>
        </div>
      )}

      {tab === 'projections' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Weekly Breakdown (last {last.length}w)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
            {last.map((e, i) => {
              const inc = e.gate + e.sponsor + e.passive
              const exp = e.wages + e.maintenance + (e.maintPlanWeekly || 0)
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
      )}

      {/* Revenues - Sponsor */}
      {tab === 'revenues' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Sponsor</h3>
          {(() => {
            const contract = team.finances?.sponsorContract
            const plans = GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []
            const sponsorOffers = sponsorOffersMemo
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
            return (
              <div>
                {!contract || contract.weeksRemaining <= 0 ? (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {sponsorOffers.map(({ plan: p, brand }) => (
                      <button key={p.id} onClick={() => chooseSponsor(p.id, brand)} title={`Upfront: ${money(p.upfront)}, Weekly: ${money(p.weekly)}, Duration: ${p.durationWeeks}w`}>
                        {brand} — Upfront {money(p.upfront)} / Weekly {money(p.weekly)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>Active: {contract.brand || plans.find(x => x.id === contract.planId)?.label || contract.planId} — Weeks remaining: {contract.weeksRemaining}</div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Revenues - Investments */}
      {tab === 'revenues' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Investments</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {(['merchandising','hospitality']).map(track => {
              const cfg = GAME_CONSTANTS.FINANCE.INVESTMENTS[track]
              const lvl = inv[track] || 0
              const next = lvl < cfg.levels.length ? cfg.levels[lvl] : null
              return (
                <div key={track} className="card" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: '1 1 auto' }}>
                    <h4 style={{ margin: '4px 0' }}>{cfg.label}</h4>
                    <div>Level: {lvl}/{cfg.levels.length}</div>
                    <div>Current weekly: {money(lvl > 0 ? cfg.levels[lvl-1].weekly : 0)}</div>
                    {next ? (
                      <button onClick={() => {
                        const idx = state.teams.findIndex(t => t.name === team.name)
                        if (idx === -1) return
                        const t = { ...state.teams[idx] }
                        const fin = { ...t.finances, investments: { ...(t.finances?.investments || { merchandising: 0, hospitality: 0 }) } }
                        const currentLevel = fin.investments[track] || 0
                        if (currentLevel >= cfg.levels.length) return
                        const cost = cfg.levels[currentLevel].cost
                        if ((fin.cash || 0) < cost) return
                        fin.cash = Number(((fin.cash || 0) - cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                        fin.investments[track] = currentLevel + 1
                        const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                        setState({ ...state, teams }); saveNow()
                      }} title={`Cost ${money(next.cost)} → Weekly +${money(next.weekly)}`}>Invest (Cost {money(next.cost)})</button>
                    ) : (<div>Max level reached</div>)}
                  </div>
                  {(track === 'hospitality' || track === 'merchandising') && (() => {
                    const isHosp = track === 'hospitality'
                    const base = isHosp ? 'rest' : 'merch'
                    const fallback = isHosp ? '/image/rest1.png' : '/image/merch1.png'
                    const idx = (lvl <= 0) ? 0 : Math.min(3, lvl)
                    return (
                      <img
                        alt={`${cfg.label} level ${lvl}`}
                        src={`/image/${base}${idx}.png`}
                        onError={(e)=>{ if (e.currentTarget.src.indexOf(fallback) === -1) e.currentTarget.src = fallback }}
                        style={{ width: 192, height: 192, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Projections - forward-looking chart */}
      {tab === 'projections' && (() => {
        const weeks = GAME_CONSTANTS.FINANCE.PROJECTION_WEEKS || 12
        const weeklyNet = income - expenses
        const points = Array.from({ length: weeks+1 }, (_, i) => ({ x: (i/weeks)*300 + 10, yVal: (team.finances?.cash || 0) + weeklyNet * i }))
        const vals = points.map(p => p.yVal)
        const min = Math.min(...vals)
        const max = Math.max(...vals)
        const scaleY = (v) => 100 - (max === min ? 0.5 : (v - min)/(max - min)) * 100
        const pts = points.map((p)=> `${p.x},${scaleY(p.yVal)+10}`).join(' ')
        return (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Projections (next {weeks} weeks)</h3>
            <div className="hint">Assumes current weekly net remains constant.</div>
            <svg width="100%" height="120" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ background: '#0b1420', borderRadius: 6 }}>
              <polyline fill="none" stroke="#fbbf24" strokeWidth="2" points={pts} />
            </svg>
          </div>
        )
      })()}

      {/* Revenues - TV Rights */}
      {tab === 'revenues' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>TV Rights</h3>
          <div className="hint">Negotiate and sign a TV deal.</div>
          {(() => {
            const currentDeal = team.finances?.tvRightsDeal
            const offers = tvOffersMemo
            function acceptTv(o) {
              const idx = state.teams.findIndex(t => t.name === team.name)
              if (idx === -1) return
              const t = { ...state.teams[idx] }
              const fin = { ...t.finances }
              const previewVar = Number((o.variableTop * 0.4).toFixed(2))
              fin.tvRightsWeekly = Number((o.fixed + previewVar).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
              fin.tvRightsDeal = { provider: o.provider, template: o.template, fixed: o.fixed, variableTop: o.variableTop, weeksRemaining: o.duration }
              const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
              setState({ ...state, teams }); saveNow()
            }
            return (
              <div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom: 8 }}>
                  <div>TV Rights weekly: <strong>{money(team.finances?.tvRightsWeekly ?? GAME_CONSTANTS.FINANCE.TV_RIGHTS_DEFAULT_WEEKLY)}</strong> {currentDeal ? <span className="hint">({currentDeal.provider}, {currentDeal.weeksRemaining}w left)</span> : <span className="hint">(no active deal)</span>}</div>
                </div>
                {!currentDeal && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom: 8 }}>
                    {offers.map((o,i) => (
                      <button key={i} onClick={() => acceptTv(o)} title={`Fixed ${money(o.fixed)} + variable up to ${money(o.variableTop)} (top teams) • Duration ${o.duration}w`}>
                        {o.provider}: Fixed {money(o.fixed)} + Var up to {money(o.variableTop)} • {o.duration}w
                      </button>
                    ))}
                  </div>
                )}
                <div className="hint" style={{ marginTop: 6 }}>The variable part depends on table position (future). Shown weekly uses a mid-table preview.</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Revenues - Competition Prizes Accrual (separate, compact) */}
      {tab === 'revenues' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Competition Prizes — Accrual</h3>
          {(() => {
            function choosePrizePlan(planId) {
              const plan = (GAME_CONSTANTS.FINANCE.COMP_PRIZE_PLANS || []).find(p => p.id === planId)
              if (!plan) return
              const idx = state.teams.findIndex(t => t.name === team.name)
              if (idx === -1) return
              const t = { ...state.teams[idx] }
              const fin = { ...t.finances, competitionPrizesWeekly: Number((plan.weekly || 0).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)), competitionPrizePlanId: plan.id }
              const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
              setState({ ...state, teams }); saveNow()
            }
            const activePlan = team.finances?.competitionPrizePlanId || 'off'
            // Risk badge computed from current snapshot
            const wagesW = wagesWeekly
            const loanService = (team.finances?.history?.slice(-1)[0]?.loanInterest || 0) + (team.finances?.history?.slice(-1)[0]?.principalPayment || 0)
            const outflow = wagesW + (maintenance) + (maintPlanWeekly) + loanService
            const runway = outflow > 0 ? ((team.finances?.cash||0) / outflow) : 999
            const weeklyOperating = (gate + sponsor + passive) - (wagesW + maintenance + maintPlanWeekly)
            const dscr = loanService > 0 ? (weeklyOperating / loanService) : 99
            let rLevel = 'low'; if (runway < 2 || ((team.finances?.cash||0) + weeklyOperating - loanService) < 0) rLevel = 'critical'; else if (runway < 6 || dscr < 1.1) rLevel = 'high'; else if (runway < 12 || dscr < 1.5) rLevel = 'medium'
            return (
              <div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom: 8 }}>
                  <div>Current accrual weekly: <strong>{money(team.finances?.competitionPrizesWeekly ?? GAME_CONSTANTS.FINANCE.COMPETITION_PRIZES_DEFAULT_WEEKLY)}</strong></div>
                  <div title={`Runway ${runway.toFixed(1)}w • DSCR ${isFinite(dscr)?dscr.toFixed(2):'∞'}`}>
                    <span className={`risk-badge risk-${rLevel}`}>Risk: {rLevel.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(GAME_CONSTANTS.FINANCE.COMP_PRIZE_PLANS || []).map(p => (
                    <button key={p.id} className={activePlan===p.id ? 'active' : ''} onClick={() => choosePrizePlan(p.id)} title={`Weekly accrual ${money(p.weekly)}`}>
                      {p.label}{activePlan===p.id ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
                <div className="hint" style={{ marginTop: 6 }}>Accrual is a smoothing preview of future competition payouts; actual one-off rounds/payouts will apply separately.</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Expenses - Maintenance Plan */}
      {tab === 'expenses' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Stadium Maintenance Plan</h3>
          {(() => {
            const activePlanId = team.finances?.maintenancePlanId || 'basic'
            const imgIdx = activePlanId === 'enhanced' ? 3 : (activePlanId === 'standard' ? 2 : 1)
            const src = `/image/stad${imgIdx}.png`
            const fallback = '/image/stad1.png'
            return (
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {(GAME_CONSTANTS.FINANCE.STADIUM_MAINTENANCE_PLANS || []).map(p => {
                    const active = activePlanId === p.id
                    return (
                      <button key={p.id} className={active ? 'active' : ''} onClick={()=> {
                        const idx = state.teams.findIndex(t => t.name === team.name)
                        if (idx === -1) return
                        const t = { ...state.teams[idx] }
                        const fin = { ...t.finances, maintenancePlanId: p.id }
                        const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                        setState({ ...state, teams }); saveNow()
                      }} title={`Weekly upkeep add-on ${money(p.weekly)}`}>{p.label} {active ? '✓' : ''}</button>
                    )
                  })}
                </div>
                <img
                  alt={`Stadium maintenance level ${imgIdx}`}
                  src={src}
                  onError={(e) => { if (e.currentTarget.src.indexOf(fallback) === -1) e.currentTarget.src = fallback }}
                  style={{ width: 192, height: 192, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
              </div>
            )
          })()}
          <div style={{ marginTop: 8 }}>Stadium Condition: <strong>{Math.round(100 * (team.finances?.stadiumCondition ?? (GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.INITIAL || 0.85)))}%</strong></div>
          <div className="hint">Plans now affect attendance and condition: higher plans slightly boost attendance and slow condition decay, but cost more weekly.</div>
        </div>
      )}

      {/* Expenses - Training Facility (moved from Facilities) */}
      {tab === 'expenses' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Training Facilities</h3>
          {(() => {
            const cfg = GAME_CONSTANTS.FINANCE.TRAINING_FACILITY
            const legacyLvl = team.finances?.trainingLevel || 0
            const tf = team.finances?.trainingFacility || { pitches: 0, gym: 0, lockers: 0 }
            const tiers = ['None','Basic','Standard','Elite']
            const tierNow = tiers[Math.min(legacyLvl, tiers.length-1)]
            const tierNext = tiers[Math.min(legacyLvl+1, tiers.length-1)]

            // Benefits by aspect (UI only; hooks to growth/injuries/morale planned)
            const pitchesBenefits = [
              '—',
              'Standard training intensity (growth +5%)',
              'High training intensity (growth +10%)',
              'Elite training intensity (growth +15%)'
            ]
            const gymBenefits = [
              '—',
              'Condition & recovery +2%',
              'Recovery +4%, injury risk −3%',
              'Recovery +6%, injury risk −5%'
            ]
            const lockerBenefits = [
              '—',
              'Squad cohesion +1%/week',
              'Cohesion +2%/week, steadier morale',
              'Cohesion +3%/week, stable morale'
            ]

            return (
              <div>
                <div style={{ marginBottom: 8 }}>Levels — Pitches: {tf.pitches||0}/3 • Gym: {tf.gym||0}/3 • Lockers: {tf.lockers||0}/3 <span className="hint">(Legacy tier: {tierNow})</span></div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
                  <div className="card" style={{ padding: 8 }}>
                    <h4 style={{ margin: '4px 0' }}>Training Pitches</h4>
                    <div className="hint">Pitches and training infrastructure</div>
                    <div style={{ marginTop: 6 }}>Current: <strong>{pitchesBenefits[Math.min(tf.pitches||0, pitchesBenefits.length-1)]}</strong></div>
                    <div>Next: <strong>{pitchesBenefits[Math.min((tf.pitches||0)+1, pitchesBenefits.length-1)]}</strong></div>
                    {(() => {
                      const cur = tf.pitches || 0
                      const lvls = cfg.AREAS.pitches.levels
                      const next = cur < lvls.length ? lvls[cur] : null
                      const can = !!next && (team.finances?.cash||0) >= next.cost
                      return (
                        <div style={{ marginTop: 8, display:'flex', gap:8, alignItems:'center' }}>
                          <button disabled={!next || !can} onClick={() => {
                            const idx = state.teams.findIndex(t => t.name === team.name)
                            if (idx === -1) return
                            const t = { ...state.teams[idx] }
                            const fin = { ...t.finances, trainingFacility: { ...(t.finances?.trainingFacility||{ pitches:0, gym:0, lockers:0 }) } }
                            if (cur >= lvls.length) return
                            if ((fin.cash||0) < next.cost) return
                            fin.cash = Number(((fin.cash||0) - next.cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                            fin.trainingFacility.pitches = cur + 1
                            const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                            setState({ ...state, teams }); saveNow()
                          }}>Upgrade Pitches (Cost {next ? money(next.cost) : '—'})</button>
                          {!can && next && <span className="hint">Need {money(next.cost)}</span>}
                          {!next && <span className="hint">Max level reached</span>}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="card" style={{ padding: 8 }}>
                    <h4 style={{ margin: '4px 0' }}>Gym</h4>
                    <div className="hint">Gym and athletic preparation</div>
                    <div style={{ marginTop: 6 }}>Current: <strong>{gymBenefits[Math.min(tf.gym||0, gymBenefits.length-1)]}</strong></div>
                    <div>Next: <strong>{gymBenefits[Math.min((tf.gym||0)+1, gymBenefits.length-1)]}</strong></div>
                    {(() => {
                      const cur = tf.gym || 0
                      const lvls = cfg.AREAS.gym.levels
                      const next = cur < lvls.length ? lvls[cur] : null
                      const can = !!next && (team.finances?.cash||0) >= next.cost
                      return (
                        <div style={{ marginTop: 8, display:'flex', gap:8, alignItems:'center' }}>
                          <button disabled={!next || !can} onClick={() => {
                            const idx = state.teams.findIndex(t => t.name === team.name)
                            if (idx === -1) return
                            const t = { ...state.teams[idx] }
                            const fin = { ...t.finances, trainingFacility: { ...(t.finances?.trainingFacility||{ pitches:0, gym:0, lockers:0 }) } }
                            if (cur >= lvls.length) return
                            if ((fin.cash||0) < next.cost) return
                            fin.cash = Number(((fin.cash||0) - next.cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                            fin.trainingFacility.gym = cur + 1
                            const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                            setState({ ...state, teams }); saveNow()
                          }}>Upgrade Gym (Cost {next ? money(next.cost) : '—'})</button>
                          {!can && next && <span className="hint">Need {money(next.cost)}</span>}
                          {!next && <span className="hint">Max level reached</span>}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="card" style={{ padding: 8 }}>
                    <h4 style={{ margin: '4px 0' }}>Locker Rooms</h4>
                    <div className="hint">Locker rooms, comfort and amenities</div>
                    <div style={{ marginTop: 6 }}>Current: <strong>{lockerBenefits[Math.min(tf.lockers||0, lockerBenefits.length-1)]}</strong></div>
                    <div>Next: <strong>{lockerBenefits[Math.min((tf.lockers||0)+1, lockerBenefits.length-1)]}</strong></div>
                    {(() => {
                      const cur = tf.lockers || 0
                      const lvls = cfg.AREAS.lockers.levels
                      const next = cur < lvls.length ? lvls[cur] : null
                      const can = !!next && (team.finances?.cash||0) >= next.cost
                      return (
                        <div style={{ marginTop: 8, display:'flex', gap:8, alignItems:'center' }}>
                          <button disabled={!next || !can} onClick={() => {
                            const idx = state.teams.findIndex(t => t.name === team.name)
                            if (idx === -1) return
                            const t = { ...state.teams[idx] }
                            const fin = { ...t.finances, trainingFacility: { ...(t.finances?.trainingFacility||{ pitches:0, gym:0, lockers:0 }) } }
                            if (cur >= lvls.length) return
                            if ((fin.cash||0) < next.cost) return
                            fin.cash = Number(((fin.cash||0) - next.cost).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
                            fin.trainingFacility.lockers = cur + 1
                            const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                            setState({ ...state, teams }); saveNow()
                          }}>Upgrade Lockers (Cost {next ? money(next.cost) : '—'})</button>
                          {!can && next && <span className="hint">Need {money(next.cost)}</span>}
                          {!next && <span className="hint">Max level reached</span>}
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="hint" style={{ marginBottom: 8 }}>Why upgrade? Higher training intensity → faster player growth; better preparation → quicker recovery and fewer injuries; improved locker rooms → stronger cohesion and steadier morale. These bonuses will be tied into growth, injuries and morale systems.</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Staff - Technical Staff */}
      {tab === 'staff' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Technical Staff</h3>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {(GAME_CONSTANTS.FINANCE.TECHNICAL_STAFF||[]).map(sopt => {
              const active = (team.finances?.technicalStaffId || 'basic') === sopt.id
              return (
                <button key={sopt.id} className={active ? 'active' : ''} onClick={()=>{
                  const idx = state.teams.findIndex(t => t.name === team.name)
                  if (idx === -1) return
                  const t = { ...state.teams[idx] }
                  const fin = { ...t.finances, technicalStaffId: sopt.id }
                  const teams = [...state.teams]; teams[idx] = { ...t, finances: fin }
                  setState({ ...state, teams }); saveNow()
                }} title={`Weekly pay ${money(sopt.weekly)} • Performance boost ${(sopt.boost*100).toFixed(1)}%`}>
                  {sopt.label} {active ? '✓' : ''}
                </button>
              )
            })}
          </div>
          <div className="hint">Better staff slightly improves performance (future hook) but costs more weekly.</div>
        </div>
      )}
    </div>
  )
}
