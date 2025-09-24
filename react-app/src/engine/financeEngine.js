import { GAME_CONSTANTS } from '../constants'

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

export function computeAttendance(prevAttendance, resultTrend = 0, capacity, priceMultiplier = 1) {
  const base = prevAttendance || GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE
  const trendMult = resultTrend > 0 ? GAME_CONSTANTS.FINANCE.ATTENDANCE_WIN_BOOST : resultTrend < 0 ? GAME_CONSTANTS.FINANCE.ATTENDANCE_LOSS_PENALTY : 1
  const next = Math.floor(base * trendMult * priceMultiplier)
  const min = Math.floor(capacity * GAME_CONSTANTS.FINANCE.MIN_ATTENDANCE_PERCENTAGE)
  return clamp(next, min, capacity)
}

export function computeStadiumValue(finances) {
  const capacity = finances.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
  const condition = finances.stadiumCondition || 0.8
  const perSeat = GAME_CONSTANTS.FINANCE.STADIUM_BASE_VALUE_PER_SEAT || 0.002
  const raw = capacity * perSeat // in M€
  return Number((raw * clamp(condition, 0.5, 1.2)).toFixed(3))
}

export function weeklyTeamFinances(team, lastWeekResultForTeam) {
  const fin = { ...team.finances }
  const capacity = fin.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY
  const trend = !lastWeekResultForTeam ? 0 : lastWeekResultForTeam.homeTeamWon === undefined ? 0 : (lastWeekResultForTeam.homeTeamWon ? (lastWeekResultForTeam.isHome ? 1 : -1) : (lastWeekResultForTeam.isHome ? -1 : 1))
  fin.attendance = computeAttendance(fin.attendance, trend, capacity)

  const ticketPrice = fin.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE
  // Apply simple price elasticity: higher price lowers attendance; lower price increases it within bounds
  const ratio = ticketPrice / GAME_CONSTANTS.FINANCE.TICKET_PRICE
  const elasticity = GAME_CONSTANTS.FINANCE.ATTENDANCE_PRICE_ELASTICITY || 0.6
  const priceMult = clamp(1 - elasticity * (ratio - 1), 0.5, 1.3)
  fin.attendance = computeAttendance(fin.attendance, trend, capacity, priceMult)
  // Apply stadium maintenance plan and condition effects on attendance
  const maintPlanId = fin.maintenancePlanId || 'basic'
  const planEff = (GAME_CONSTANTS.FINANCE.STADIUM_PLAN_EFFECTS || {})[maintPlanId] || { attendanceMult: 1.0, weeklyDecay: 0.004 }
  const cond = typeof fin.stadiumCondition === 'number' ? fin.stadiumCondition : (GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.INITIAL || 0.85)
  const condClamped = clamp(cond, GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MIN || 0.5, GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MAX || 1.0)
  const condMult = clamp(0.80 + 0.40 * ((condClamped - (GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MIN || 0.5)) / ((GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MAX || 1.0) - (GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MIN || 0.5))), 0.8, 1.2)
  fin.attendance = Math.floor(clamp(fin.attendance * planEff.attendanceMult * condMult, Math.floor(capacity * GAME_CONSTANTS.FINANCE.MIN_ATTENDANCE_PERCENTAGE), capacity))
  const gate = (fin.attendance * ticketPrice) / 1_000_000 // in millions
  const wages = team.players.reduce((s, p) => s + (p.wage || 0), 0)
  const wagesWeekly = wages // wages are already weekly in this sim
  // Sponsor income: from chosen plan if any; else base weekly sponsors
  let sponsor = (GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT + GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH) / 52
  const planId = team.finances?.sponsorContract?.planId
  const weeksRem = team.finances?.sponsorContract?.weeksRemaining
  if (planId && weeksRem > 0) {
    const plan = (GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []).find(p => p.id === planId)
    if (plan) sponsor = plan.weekly
  }
  // Sponsor performance bonuses: small weekly variation by wins/clean sheets and current table position
  let sponsorBonus = 0
  if (lastWeekResultForTeam) {
    if (lastWeekResultForTeam.homeTeamWon === true && lastWeekResultForTeam.isHome) sponsorBonus += GAME_CONSTANTS.FINANCE.SPONSOR_BONUS_WIN || 0
    if (lastWeekResultForTeam.homeTeamWon === false && !lastWeekResultForTeam.isHome) sponsorBonus += GAME_CONSTANTS.FINANCE.SPONSOR_BONUS_WIN || 0
  }
  // Table position bonus: top half small weekly bump, top 3 bigger bump
  try {
    const table = team && team.name && window?.gameUtils?.getGameState ? window.gameUtils.getGameState().league.table : null
    const positions = table ? Object.values(table).sort((a,b)=> b.pts - a.pts) : null
    const pos = positions ? positions.findIndex(r => r.team === team.name) : -1
    if (pos >= 0) {
      if (pos <= 2) sponsorBonus += 0.05 // +50k/wk in M
      else if (pos <= Math.floor((positions.length-1)/2)) sponsorBonus += 0.02 // +20k/wk in M
    }
  } catch {}
  sponsor += sponsorBonus
  // Investments weekly income
  const invCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS
  const inv = team.finances?.investments || { merchandising: 0, hospitality: 0 }
  const merchLvl = Math.max(0, Math.min(invCfg.merchandising.levels.length, inv.merchandising))
  const hospLvl = Math.max(0, Math.min(invCfg.hospitality.levels.length, inv.hospitality))
  const merchWeekly = merchLvl > 0 ? invCfg.merchandising.levels[merchLvl - 1].weekly : 0
  const hospWeekly = hospLvl > 0 ? invCfg.hospitality.levels[hospLvl - 1].weekly : 0
  const passive = merchWeekly + hospWeekly
  const perSeat = fin.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT
  const maintenance = (capacity * perSeat) / 1_000_000 + (fin.cash * GAME_CONSTANTS.FINANCE.MAINTENANCE_COST_PERCENTAGE) / 52
  const maintPlanWeekly = (() => {
    const plans = GAME_CONSTANTS.FINANCE.STADIUM_MAINTENANCE_PLANS || []
    const p = plans.find(x => x.id === maintPlanId)
    return p ? (p.weekly || 0) : 0
  })()

  // TV rights and competition prizes weekly accruals (if configured on team finances)
  const tvRightsWeekly = (fin.tvRightsWeekly ?? GAME_CONSTANTS.FINANCE.TV_RIGHTS_DEFAULT_WEEKLY) || 0
  const compPrizesWeekly = (fin.competitionPrizesWeekly ?? GAME_CONSTANTS.FINANCE.COMPETITION_PRIZES_DEFAULT_WEEKLY) || 0
  const income = gate + sponsor + passive + tvRightsWeekly + compPrizesWeekly
  const expenses = maintenance + maintPlanWeekly + wagesWeekly
  // Loans: apply weekly interest and amortization (French method if weeklyPayment provided; else bullet at term)
  const loans = Array.isArray(fin.loans) ? fin.loans.map(l => ({ ...l })) : []
  let loanInterest = 0
  let principalPayment = 0
  for (const loan of loans) {
    const r = Number(loan.weeklyRate || 0)
    const remaining = Number(loan.principalRemaining || 0)
    const scheduledPayment = Number(loan.weeklyPayment || 0)
    // Compute weekly interest on remaining principal
    const interest = Number((remaining * r).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    loanInterest += interest
    if (scheduledPayment > 0 && loan.weeksRemaining > 0) {
      // French amortization: fixed payment each week
      const maxDue = Number((remaining + interest).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
      const pay = Math.min(scheduledPayment, maxDue)
      const princPart = Number((pay - interest).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
      principalPayment += Math.max(0, princPart)
      loan.principalRemaining = Number((remaining - Math.max(0, princPart)).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
      loan.weeksRemaining = Math.max(0, (loan.weeksRemaining || 0) - 1)
    } else {
      // Fallback: bullet repayment at term end
      if (loan.weeksRemaining <= 1) {
        principalPayment += remaining
        loan.principalRemaining = 0
      }
      loan.weeksRemaining = Math.max(0, (loan.weeksRemaining || 0) - 1)
    }
  }
  const loanExpenses = loanInterest + principalPayment
  const totalExpenses = expenses + loanExpenses
  fin.cash = Number((fin.cash + income - totalExpenses).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
  // Decay/improve stadium condition based on plan
  const dec = planEff.weeklyDecay || 0
  const nextCond = clamp(condClamped - dec, GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MIN || 0.5, GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.MAX || 1.0)
  fin.stadiumCondition = Number(nextCond.toFixed(3))
  // Remove fully paid loans
  fin.loans = loans.filter(l => (l.principalRemaining || 0) > 0)
  // Tick down sponsor contract
  if (planId && weeksRem > 0) {
    fin.sponsorContract = { planId, weeksRemaining: weeksRem - 1 }
  }
  // Tick down TV deal if present
  if (fin.tvRightsDeal && typeof fin.tvRightsDeal.weeksRemaining === 'number' && fin.tvRightsDeal.weeksRemaining > 0) {
    const nextWeeks = fin.tvRightsDeal.weeksRemaining - 1
    fin.tvRightsDeal = { ...fin.tvRightsDeal, weeksRemaining: nextWeeks }
    if (nextWeeks <= 0) {
      // Deal expired → revert weekly to default
      fin.tvRightsWeekly = GAME_CONSTANTS.FINANCE.TV_RIGHTS_DEFAULT_WEEKLY
    }
  }

  return { finances: fin, breakdown: { gate, sponsor, maintenance, maintPlanWeekly, wages: wagesWeekly, passive, sponsorBonus, loanInterest, principalPayment, tv: tvRightsWeekly, compPrizes: compPrizesWeekly, stadiumCondition: fin.stadiumCondition } }
}

export function applyWeeklyFinances(state, weekResults) {
  const teamIndex = Object.fromEntries(state.teams.map((t, i) => [t.name, i]))
  // Build quick lookup for win/loss per team for trend calculation
  const perTeam = {}
  for (const r of weekResults) {
    const homeTeamWon = r.homeGoals > r.awayGoals
    const awayTeamWon = r.awayGoals > r.homeGoals
    perTeam[r.home] = { isHome: true, homeTeamWon }
    perTeam[r.away] = { isHome: false, homeTeamWon }
  }

  const breakdowns = {}
  const week = state.league.week
  const nextTeams = state.teams.map((team) => {
    const res = perTeam[team.name]
    const { finances, breakdown } = weeklyTeamFinances(team, res)
    // Compute sustainability risk metrics for this team
  const wagesWeekly = breakdown.wages || 0
  const loanService = (breakdown.loanInterest || 0) + (breakdown.principalPayment || 0)
  const otherFixed = (breakdown.maintenance || 0) + (breakdown.maintPlanWeekly || 0)
    const outflow = wagesWeekly + loanService + otherFixed
    const cash = finances.cash || 0
    const runway = outflow > 0 ? cash / outflow : 999
  const weeklyOperating = (breakdown.gate + breakdown.sponsor + breakdown.passive) - (breakdown.wages + breakdown.maintenance + (breakdown.maintPlanWeekly || 0))
    const dscr = loanService > 0 ? (weeklyOperating / loanService) : 99
    let riskLevel = 'low'
    if (runway < 2 || (cash + weeklyOperating - loanService) < 0) riskLevel = 'critical'
    else if (runway < 6 || dscr < 1.1) riskLevel = 'high'
    else if (runway < 12 || dscr < 1.5) riskLevel = 'medium'
    const risk = { runwayWeeks: Number(runway.toFixed(1)), dscr: Number((isFinite(dscr)?dscr:99).toFixed(2)), level: riskLevel }
    breakdowns[team.name] = { ...breakdown, risk }
    const net = Number((breakdown.gate + breakdown.sponsor + breakdown.passive - (breakdown.wages + breakdown.maintenance + (breakdown.loanInterest||0) + (breakdown.principalPayment||0))).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES))
    const entry = { week, cash: finances.cash, ...breakdown, net }
    const prevHist = Array.isArray(team.finances?.history) ? team.finances.history : []
    const history = [...prevHist, entry].slice(-26)
    return { ...team, finances: { ...finances, history } }
  })

  // Track insolvency streak and apply penalties
  const penMode = (GAME_CONSTANTS.FINANCE.DEFAULT_PENALTY_MODE || 'light')
  let league = state.league
  const teamsWithFlags = nextTeams.map((t) => {
    const fin = { ...t.finances }
    const cashNeg = (fin.cash || 0) < 0
    const prevStreak = Number(fin.negativeCashStreak || 0)
    const streak = cashNeg ? (prevStreak + 1) : 0
    fin.negativeCashStreak = streak
    // Enter administration after 2 consecutive weeks negative cash
    if (streak >= 2 && !fin.inAdministration) {
      fin.inAdministration = true
      fin.adminStartedWeek = state.league.week
      // Apply league points deduction once if configured
      if (penMode === 'points') {
        const table = { ...(league?.table || {}) }
        if (table[t.name]) {
          table[t.name] = { ...table[t.name], pts: Math.max(0, (table[t.name].pts || 0) - (GAME_CONSTANTS.FINANCE.DEFAULT_PENALTY_POINTS || 3)) }
          league = { ...league, table }
        }
      }
    }
    return { ...t, finances: fin }
  })

  return { nextState: { ...state, teams: teamsWithFlags, league }, breakdowns }
}
