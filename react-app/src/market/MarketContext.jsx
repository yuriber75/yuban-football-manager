import React, { createContext, useContext, useMemo, useRef } from 'react'
import { useGameState } from '../state/GameStateContext'
import { makePlayer } from '../generation/playerGenerator'
import { GAME_CONSTANTS } from '../constants'

const MarketContext = createContext(null)

function roleSection(role) {
  if (role === 'GK') return 'GK'
  if (['DR','DC','DL'].includes(role)) return 'DF'
  if (['MR','MC','ML'].includes(role)) return 'MF'
  if (['FR','ST','FL'].includes(role)) return 'FW'
  return 'MF'
}

function ensureTeamMarketFinances(team) {
  const finances = team.finances || {}
  if (!finances.playersForSale) finances.playersForSale = []
  return { ...team, finances }
}

export function MarketProvider({ children }) {
  const { state, setState, saveNow } = useGameState()
  const initedRef = useRef(false)

  function getMyTeamIndex(s = state) {
    return (s.teams || []).findIndex((t) => t.name === s.teamName)
  }
  function getMyTeam(s = state) {
    const idx = getMyTeamIndex(s)
    return idx >= 0 ? s.teams[idx] : null
  }

  function generateFreeAgents(count = 15) {
    const roles = ['GK','DR','DC','DL','MR','MC','ML','FR','ST','FL']
    const pool = []
    for (let i = 0; i < count; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)]
      const p = makePlayer(role)
      pool.push(p)
    }
    setState((s) => ({ ...s, freeAgents: pool }))
    saveNow()
  }

  function autoListAIPlayers(maxPerTeam = 2) {
    setState((s) => {
      const my = s.teamName
      const teams = (s.teams || []).map((team) => {
        const withFin = ensureTeamMarketFinances(team)
        if (withFin.name === my) return withFin
        // Already listed count
        const listedIds = new Set(withFin.finances.playersForSale.map((e) => e.id))
        const canListMore = Math.max(0, maxPerTeam - listedIds.size)
        if (canListMore <= 0) return withFin
        // Choose low-impact players to list (non-starters, lower overall)
        const candidates = withFin.players
          .filter((p) => !p.starting && !listedIds.has(p.id))
          .sort((a,b)=> a.overall - b.overall)
        const toList = candidates.slice(0, canListMore)
        const playersForSale = [...withFin.finances.playersForSale]
        toList.forEach((p) => {
          playersForSale.push({ id: p.id, asking: Number((p.value).toFixed(2)) })
        })
        return { ...withFin, finances: { ...withFin.finances, playersForSale } }
      })
      return { ...s, teams }
    })
    saveNow()
  }

  function initMarketIfNeeded() {
    if (initedRef.current) return
    initedRef.current = true
    // Ensure playersForSale arrays exist and seed free agents/transfer list
    setState((s) => {
      const teams = (s.teams || []).map((t) => ensureTeamMarketFinances(t))
      return { ...s, teams, freeAgents: s.freeAgents && s.freeAgents.length ? s.freeAgents : [] }
    })
    if (!state.freeAgents || state.freeAgents.length === 0) {
      generateFreeAgents(18)
    }
    // Light auto-seed of transfer list for AI teams
    autoListAIPlayers(2)
  }

  function aggregateTransferList(s = state) {
    const out = []
    for (const team of s.teams || []) {
      const list = team.finances?.playersForSale || []
      for (const entry of list) {
        out.push({ team: team.name, playerId: entry.id, asking: entry.asking })
      }
    }
    return out
  }

  function findPlayerById(id, s = state) {
    for (const t of s.teams || []) {
      const p = t.players.find((pp) => pp.id === id)
      if (p) return { player: p, team: t }
    }
    const fa = (s.freeAgents || []).find((p) => p.id === id)
    if (fa) return { player: fa, team: null }
    return { player: null, team: null }
  }

  // Offers utilities — gather and rank current pending offers for a player
  function getOffersForPlayer(playerId, s = state) {
    const neg = s.negotiations || { pendingOffers: [] }
    return (neg.pendingOffers || []).filter(o => o.status === 'pending' && o.playerId === playerId)
  }
  function getOfferStatsForPlayer(playerId, s = state) {
    const offers = getOffersForPlayer(playerId, s)
    if (!offers.length) return { total: 0, best: null, rankOfMine: null }
    // Rank according to the same logic used in resolveNegotiations
    const sample = offers[0]
    const ranked = offers.slice().sort((a,b)=> {
      if (sample.type === 'free') {
        return (b.wage + b.contractLength*0.1) - (a.wage + a.contractLength*0.1)
      }
      return (b.amount + b.wage*0.18 + b.contractLength*0.2) - (a.amount + a.wage*0.18 + a.contractLength*0.2)
    })
    const best = ranked[0]
    const myIdx = ranked.findIndex(o => o.buyer === s.teamName)
    return { total: offers.length, best, rankOfMine: myIdx >= 0 ? (myIdx + 1) : null }
  }

  // Centralized acceptance calculators (React-only parity mirroring vanilla tolerances)
  function acceptanceFA(player, offer, constants = GAME_CONSTANTS.FINANCE) {
    const ranges = constants.NEGOTIATION_RANGES
    const rel = (offer.wage / Math.max(0.01, player.wage))
    const agePref = (player.age <= 23 ? (offer.contractLength >= 3 ? +0.08 : -0.04)
                    : player.age <= 28 ? (offer.contractLength >= 3 ? +0.05 : 0)
                    : player.age <= 32 ? (offer.contractLength >= 2 ? +0.02 : -0.02)
                    : (offer.contractLength >= 1 ? 0 : -0.05))
    const starBias = player.overall >= 86 ? -0.1 : player.overall >= 80 ? -0.05 : player.overall <= 65 ? +0.05 : 0
    const base = 0.48 + (rel - (ranges.WAGES.PREFERRED || 1.0)) * 0.85 + agePref + starBias
    return Math.min(0.96, Math.max(0.04, base))
  }

  function acceptanceTransfer(player, offer, asking, constants = GAME_CONSTANTS.FINANCE) {
    const ranges = constants.NEGOTIATION_RANGES
    const feeRel = offer.amount / Math.max(0.01, asking)
    const agePref = (player.age <= 23 ? (offer.contractLength >= 4 ? +0.05 : -0.03)
                    : player.age <= 28 ? (offer.contractLength >= 3 ? +0.03 : 0)
                    : player.age <= 32 ? (offer.contractLength >= 2 ? +0.01 : -0.01)
                    : (offer.contractLength >= 1 ? 0 : -0.02))
    const starBias = player.overall >= 86 ? -0.08 : player.overall >= 80 ? -0.04 : player.overall <= 65 ? +0.05 : 0
    let base = 0.45 + (feeRel - (ranges.TRANSFER_FEE.PREFERRED || 1.0)) * 0.85 + agePref + starBias
    // Small premium for meeting/exceeding asking
    if (feeRel >= 1.05) base += 0.08
    else if (feeRel >= 0.99) base += 0.03
    return Math.min(0.96, Math.max(0.04, base))
  }

  // Pending commitments for a team (outgoing buy offers still pending)
  function getPendingCommitments(teamName, s = state, excludeOfferId = null) {
    const neg = s.negotiations || { pendingOffers: [] }
    const offers = (neg.pendingOffers || []).filter(o => o.status === 'pending' && o.buyer === teamName && (!excludeOfferId || o.id !== excludeOfferId))
    const pendingFees = offers.reduce((sum, o) => sum + (o.type === 'transfer' ? (o.amount || 0) : 0), 0)
    const pendingWages = offers.reduce((sum, o) => sum + (o.wage || 0), 0)
    return { pendingFees, pendingWages }
  }

  function computeSalaryCap(team, s = state) {
    // Salary cap based on stable weekly incomes to keep sustainability
    const ticketPrice = team.finances?.ticketPrice || GAME_CONSTANTS.FINANCE.TICKET_PRICE
    const attendance = team.finances?.attendance || GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE
    const gate = (attendance * ticketPrice) / 1_000_000
    const planId = team.finances?.sponsorContract?.planId
    const weeksRem = team.finances?.sponsorContract?.weeksRemaining
    let sponsor = (GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT + GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH) / 52
    const plan = (GAME_CONSTANTS.FINANCE.SPONSOR_PLANS || []).find(p => p.id === planId)
    if (plan && weeksRem > 0) sponsor = plan.weekly
    const invCfg = GAME_CONSTANTS.FINANCE.INVESTMENTS
    const inv = team.finances?.investments || { merchandising: 0, hospitality: 0 }
    const merchLvl = Math.max(0, Math.min(invCfg.merchandising.levels.length, inv.merchandising))
    const hospLvl = Math.max(0, Math.min(invCfg.hospitality.levels.length, inv.hospitality))
    const merchWeekly = merchLvl > 0 ? invCfg.merchandising.levels[merchLvl - 1].weekly : 0
    const hospWeekly = hospLvl > 0 ? invCfg.hospitality.levels[hospLvl - 1].weekly : 0
    const passive = merchWeekly + hospWeekly
    // Maintenance rough estimate (does not include cash percentage to avoid feedback loop)
    const perSeat = team.finances?.facilityCostPerSeat || GAME_CONSTANTS.FINANCE.FACILITY_COST_PER_SEAT
    const maintenance = (team.finances?.stadiumCapacity || GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY) * perSeat / 1_000_000
    const stableIncome = Math.max(0, gate + sponsor + passive - maintenance)
    const ratio = GAME_CONSTANTS.FINANCE.SALARY_CAP_RATIO || 0.85
    return Number((stableIncome * ratio).toFixed(3))
  }

  function canAffordWage(team, wage, s = state, excludeOfferId = null) {
    const current = team.players.reduce((sum, p) => sum + (p.wage || 0), 0)
    const { pendingWages } = getPendingCommitments(team.name, s, excludeOfferId)
    const planned = current + pendingWages + (wage || 0)
    const budget = (team.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET)
    const cap = computeSalaryCap(team, s)
    return planned <= Math.min(budget, Math.max(0.01, cap))
  }
  function wageWarning(team, addWage = 0, s = state) {
    const budget = team.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET
    const current = team.players.reduce((sum, p) => sum + (p.wage || 0), 0)
    const { pendingWages } = getPendingCommitments(team.name, s)
    const cap = computeSalaryCap(team, s)
    const hard = Math.min(budget, Math.max(0.01, cap))
    const ratio = (current + pendingWages + addWage) / Math.max(0.0001, hard)
    return ratio >= (GAME_CONSTANTS.FINANCE.WAGE_BUDGET_WARNING_THRESHOLD || 0.9)
  }
  function getRoleCounts(team) {
    const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 }
    for (const p of team.players) {
      const sec = roleSection(p.primaryRole)
      if (sec === 'GK') counts.GK++
      else if (sec === 'DF') counts.DEF++
      else if (sec === 'MF') counts.MID++
      else if (sec === 'FW') counts.ATT++
    }
    return counts
  }
  function wouldExceedMaxOnBuy(team, player) {
    const sec = roleSection(player.primaryRole)
    const counts = getRoleCounts(team)
    const after = { ...counts }
    if (sec === 'GK') after.GK++
    else if (sec === 'DF') after.DEF++
    else if (sec === 'MF') after.MID++
    else if (sec === 'FW') after.ATT++
    const max = GAME_CONSTANTS.FINANCE.MAX_PER_ROLE || { GK: 4, DEF: 9, MID: 9, ATT: 6 }
    return (after.GK > max.GK) || (after.DEF > max.DEF) || (after.MID > max.MID) || (after.ATT > max.ATT)
  }
  function willViolateMinOnSell(team, playerId) {
    const min = {
      GK: GAME_CONSTANTS.FINANCE.MIN_GOALKEEPER || 2,
      DEF: GAME_CONSTANTS.FINANCE.MIN_DEFENDER || 4,
      MID: GAME_CONSTANTS.FINANCE.MIN_MIDFIELDER || 4,
      ATT: GAME_CONSTANTS.FINANCE.MIN_FORWARD || 2,
    }
    const counts = getRoleCounts(team)
    const player = team.players.find(p => p.id === playerId)
    if (!player) return false
    const sec = roleSection(player.primaryRole)
    const after = { ...counts }
    if (sec === 'GK') after.GK--
    else if (sec === 'DF') after.DEF--
    else if (sec === 'MF') after.MID--
    else if (sec === 'FW') after.ATT--
    const squadSizeAfter = team.players.length - 1
    if (squadSizeAfter < (GAME_CONSTANTS.FINANCE.MIN_SQUAD_SIZE || 14)) return true
    return (after.GK < min.GK) || (after.DEF < min.DEF) || (after.MID < min.MID) || (after.ATT < min.ATT)
  }
  function canListWithReason(team, playerId) {
    const finances = team.finances || { playersForSale: [] }
    const listed = finances.playersForSale || []
    const maxListed = GAME_CONSTANTS.FINANCE.MAX_PLAYERS_FOR_SALE || 4
    if (listed.some(e => e.id === playerId)) return { ok: false, reason: 'Already listed' }
    if (listed.length >= maxListed) return { ok: false, reason: `Max listed reached (${maxListed})` }
    if (willViolateMinOnSell(team, playerId)) return { ok: false, reason: 'Would break minimum squad/role' }
    return { ok: true }
  }
  function canBuy(player, fee, buyer, opts = {}, s = state) {
    if (!buyer?.finances) return { ok: false, reason: 'No finances' }
    const { pendingFees } = getPendingCommitments(buyer.name, s, opts.excludeOfferId || null)
    const cash = (buyer.finances.cash ?? 0)
    if (cash < fee + pendingFees) return { ok: false, reason: 'Insufficient cash (with pending offers)' }
    const wageToCheck = (opts.wage != null ? opts.wage : player.wage) || 0
    if (!canAffordWage(buyer, wageToCheck, s, opts.excludeOfferId || null)) return { ok: false, reason: 'Wage budget exceeded (with pending offers)' }
    if (buyer.players.length >= GAME_CONSTANTS.FINANCE.MAX_SQUAD_SIZE) return { ok: false, reason: 'Squad size limit' }
    if (wouldExceedMaxOnBuy(buyer, player)) return { ok: false, reason: 'Would exceed per-role max' }
    return { ok: true }
  }

  // Negotiations: offers structure
  // { id, playerId, seller, buyer, type: 'transfer'|'free', amount, wage, contractLength, team: buyerName, deadlineWeek, status: 'pending'|'accepted'|'rejected'|'expired', incoming?: boolean, requiresDecision?: boolean }

  function ensureNegotiations(s) {
    const neg = s.negotiations || { pendingOffers: [], rejectedPlayers: new Set(), attemptsCount: {} }
    if (!Array.isArray(neg.pendingOffers)) neg.pendingOffers = []
    return neg
  }

  function submitOfferForListed(playerId, sellerName, amount, wage, contractLength = 3) {
    setState((s) => {
      const buyerName = s.teamName
      const myIdx = getMyTeamIndex(s)
      if (myIdx < 0) return s
      const { player } = findPlayerById(playerId, s)
      if (!player) return s
      const buyer = s.teams[myIdx]
      const buyCheck = canBuy(player, amount, buyer, { wage }, s)
      if (!buyCheck.ok) return s
      const neg = ensureNegotiations(s)
      const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      const submittedWeek = s.league.week
      const decisionAfterWeeks = 3
      const deadlineWeek = submittedWeek + decisionAfterWeeks
      const offer = { id, playerId, seller: sellerName, buyer: buyerName, type: 'transfer', amount: Number(amount.toFixed(2)), wage: Number(wage.toFixed(2)), contractLength, team: buyerName, deadlineWeek, submittedWeek, decisionAfterWeeks, status: 'pending' }
      // generate 1-2 competing AI offers
      const rivals = generateCompetingOffers(playerId, sellerName)
      const pendingOffers = [...neg.pendingOffers, offer, ...rivals]
      return { ...s, negotiations: { ...neg, pendingOffers } }
    })
    saveNow()
  }

  function generateCompetingOffers(playerId, sellerName) {
    const offers = []
    const s = state
    const teams = (s.teams || []).map(t => t.name)
    const pool = teams.filter(n => n !== s.teamName && n !== sellerName)
    // Vanilla-like: typically 1, sometimes 2 competing offers
    const max = Math.min((Math.random() < 0.3 ? 2 : 1), pool.length)
    const { player } = findPlayerById(playerId, s)
    if (!player) return offers
    for (let i = 0; i < max; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      const buyer = pool.splice(idx, 1)[0]
      // Tighter around asking/wage to feel more grounded
      const amountVar = 0.92 + Math.random() * 0.2 // 0.92..1.12 × value as proxy
      const wageVar = 0.95 + Math.random() * 0.18 // 0.95..1.13 × wage
      const submittedWeek = s.league.week
      const decisionAfterWeeks = 3
      const deadlineWeek = submittedWeek + decisionAfterWeeks
      offers.push({ id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)), playerId, seller: sellerName, buyer, type: 'transfer', amount: Number((player.value * amountVar).toFixed(2)), wage: Number((player.wage * wageVar).toFixed(2)), contractLength: 2 + Math.floor(Math.random() * 3), team: buyer, deadlineWeek, submittedWeek, decisionAfterWeeks, status: 'pending', ai: true })
    }
    return offers
  }

  function submitOfferForFreeAgent(playerId, wage, contractLength = 2) {
    setState((s) => {
      const buyerName = s.teamName
      const player = (s.freeAgents || []).find(p => p.id === playerId)
      if (!player) return s
      const buyer = s.teams.find(t => t.name === buyerName)
      if (!buyer) return s
      if (wouldExceedMaxOnBuy(buyer, player)) return s
      if (!canAffordWage(buyer, wage, s)) return s
      const neg = ensureNegotiations(s)
      const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      const submittedWeek = s.league.week
      const decisionAfterWeeks = 3
      const deadlineWeek = submittedWeek + decisionAfterWeeks
      const offer = { id, playerId, seller: null, buyer: buyerName, type: 'free', amount: 0, wage: Number(wage.toFixed(2)), contractLength, team: buyerName, deadlineWeek, submittedWeek, decisionAfterWeeks, status: 'pending' }
      // simulate competing AI bids for the free agent
      const teams = (s.teams || []).filter(t => t.name !== buyerName).map(t => t.name)
      const max = Math.min((Math.random() < 0.3 ? 2 : 1), teams.length)
      const rivals = []
      for (let i = 0; i < max; i++) {
        const idx = Math.floor(Math.random() * teams.length)
        const buyerR = teams.splice(idx, 1)[0]
        const w = Number((player.wage * (0.96 + Math.random() * 0.22)).toFixed(2))
        const rSubmittedWeek = s.league.week
        const rDecisionAfterWeeks = 3
        const rDeadlineWeek = rSubmittedWeek + rDecisionAfterWeeks
        rivals.push({ id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)), playerId, seller: null, buyer: buyerR, type: 'free', amount: 0, wage: w, contractLength: 2 + Math.floor(Math.random()*3), team: buyerR, deadlineWeek: rDeadlineWeek, submittedWeek: rSubmittedWeek, decisionAfterWeeks: rDecisionAfterWeeks, status: 'pending', ai: true })
      }
      const pendingOffers = [...neg.pendingOffers, offer, ...rivals]
      return { ...s, negotiations: { ...neg, pendingOffers } }
    })
    saveNow()
  }

  function acceptIncomingOffer(offerId) {
    setState((s) => {
      const neg = ensureNegotiations(s)
      const offer = neg.pendingOffers.find(o => o.id === offerId && o.incoming && o.status === 'pending')
      if (!offer) return s
      // finalize transfer: user is seller
      const sellerIdx = s.teams.findIndex(t => t.name === offer.seller)
      const buyerIdx = s.teams.findIndex(t => t.name === offer.buyer)
      if (sellerIdx < 0) return s
      const seller = ensureTeamMarketFinances(s.teams[sellerIdx])
      const player = seller.players.find(p => p.id === offer.playerId)
      if (!player) return s
      // If buyer is external/foreign (not in our league teams), transfer out and credit cash to seller
      if (buyerIdx < 0) {
        const sellerFin = { ...seller.finances, cash: Number(((seller.finances.cash || 0) + offer.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
        const nextSellerPlayers = seller.players.filter(pp => pp.id !== offer.playerId)
        const nextSellerListings = seller.finances.playersForSale.filter(e => e.id !== offer.playerId)
        const teams = [...s.teams]
        teams[sellerIdx] = { ...seller, finances: { ...sellerFin, playersForSale: nextSellerListings }, players: nextSellerPlayers }
        const pendingOffers = neg.pendingOffers.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o).filter(o => o.playerId !== offer.playerId || o.status !== 'pending')
        return { ...s, teams, negotiations: { ...neg, pendingOffers } }
      }
      const buyer = ensureTeamMarketFinances(s.teams[buyerIdx])
      // If buyer cannot afford wages, try to adjust to hard headroom (min of budget and cap), down to min acceptable
      let effWage = offer.wage
      const budget = buyer.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET
      const current = buyer.players.reduce((sum, p) => sum + (p.wage || 0), 0)
      const { pendingWages } = getPendingCommitments(buyer.name, s, offer.id)
      const cap = computeSalaryCap(buyer, s)
      const hard = Math.min(budget, Math.max(0.01, cap))
      const headroom = Math.max(0, hard - (current + pendingWages))
      if (effWage > headroom) {
        const minAcceptable = Math.max(
          player.wage * (GAME_CONSTANTS.FINANCE.NEGOTIATION_RANGES?.WAGES?.MIN_ACCEPTABLE || 0.8),
          GAME_CONSTANTS.FINANCE.MIN_PLAYER_WAGE || 0.01
        )
        if (headroom >= minAcceptable) {
          effWage = Number(headroom.toFixed(2))
        }
      }
      const check = canBuy({ ...player, wage: effWage }, offer.amount, buyer, { wage: effWage, excludeOfferId: offer.id }, s)
      if (!check.ok) {
        // mark rejected due to affordability
        const pendingOffers = neg.pendingOffers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o)
        return { ...s, negotiations: { ...neg, pendingOffers } }
      }
      const buyerFin = { ...buyer.finances, cash: Number(((buyer.finances.cash || 0) - offer.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
      const sellerFin = { ...seller.finances, cash: Number(((seller.finances.cash || 0) + offer.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
      const nextSellerPlayers = seller.players.filter(pp => pp.id !== offer.playerId)
      const nextBuyerPlayers = [...buyer.players, { ...player, starting: false, wage: effWage }]
      const nextSellerListings = seller.finances.playersForSale.filter(e => e.id !== offer.playerId)
      const teams = [...s.teams]
      teams[sellerIdx] = { ...seller, finances: { ...sellerFin, playersForSale: nextSellerListings }, players: nextSellerPlayers }
      teams[buyerIdx] = { ...buyer, finances: buyerFin, players: nextBuyerPlayers }
      const pendingOffers = neg.pendingOffers.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o).filter(o => o.playerId !== offer.playerId || o.status !== 'pending')
      return { ...s, teams, negotiations: { ...neg, pendingOffers } }
    })
    saveNow()
  }

  function rejectIncomingOffer(offerId) {
    setState((s) => {
      const neg = ensureNegotiations(s)
      const pendingOffers = neg.pendingOffers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o)
      return { ...s, negotiations: { ...neg, pendingOffers } }
    })
    saveNow()
  }

  function cancelOutgoingOffer(offerId) {
    setState((s) => {
      const neg = ensureNegotiations(s)
      const pendingOffers = neg.pendingOffers.filter(o => o.id !== offerId)
      return { ...s, negotiations: { ...neg, pendingOffers } }
    })
    saveNow()
  }

  function signFreeAgent(playerId) {
    setState((s) => {
      const idxMy = getMyTeamIndex(s)
      if (idxMy < 0) return s
      const team = s.teams[idxMy]
      const player = (s.freeAgents || []).find((p) => p.id === playerId)
      if (!player) return s
      if (!canAffordWage(team, player.wage)) return s
      const nextFA = s.freeAgents.filter((p) => p.id !== playerId)
      const nextTeam = { ...team, players: [...team.players, { ...player, starting: false }] }
      const teams = [...s.teams]
      teams[idxMy] = nextTeam
      return { ...s, teams, freeAgents: nextFA }
    })
    saveNow()
  }

  function listPlayer(playerId, asking) {
    setState((s) => {
      const idxMy = getMyTeamIndex(s)
      if (idxMy < 0) return s
      const team = ensureTeamMarketFinances(s.teams[idxMy])
      const exists = team.finances.playersForSale.some((e) => e.id === playerId)
      if (exists) return s
      const p = team.players.find((pp) => pp.id === playerId)
      if (!p) return s
      const entry = { id: p.id, asking: Number((asking ?? p.value).toFixed(2)) }
      const finances = { ...team.finances, playersForSale: [...team.finances.playersForSale, entry] }
      const teams = [...s.teams]
      teams[idxMy] = { ...team, finances }
      return { ...s, teams }
    })
    saveNow()
  }

  function unlistPlayer(playerId) {
    setState((s) => {
      const idxMy = getMyTeamIndex(s)
      if (idxMy < 0) return s
      const team = ensureTeamMarketFinances(s.teams[idxMy])
      const finances = { ...team.finances, playersForSale: team.finances.playersForSale.filter((e) => e.id !== playerId) }
      const teams = [...s.teams]
      teams[idxMy] = { ...team, finances }
      return { ...s, teams }
    })
    saveNow()
  }

  function buyListedPlayer(playerId) {
    setState((s) => {
      const buyerIdx = getMyTeamIndex(s)
      if (buyerIdx < 0) return s
      const buyer = ensureTeamMarketFinances(s.teams[buyerIdx])
      // find selling team and price
      let sellerIdx = -1
      let asking = 0
      for (let i = 0; i < s.teams.length; i++) {
        const team = s.teams[i]
        const entry = (team.finances?.playersForSale || []).find((e) => e.id === playerId)
        if (entry) { sellerIdx = i; asking = entry.asking; break }
      }
      if (sellerIdx < 0) return s
      const seller = ensureTeamMarketFinances(s.teams[sellerIdx])
      const player = seller.players.find((pp) => pp.id === playerId)
      if (!player) return s
      const check = canBuy(player, asking, buyer)
      if (!check.ok) return s
      // move money
      const buyerFin = { ...buyer.finances, cash: Number(((buyer.finances.cash || 0) - asking).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
      const sellerFin = { ...seller.finances, cash: Number(((seller.finances.cash || 0) + asking).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
      // move player
      const nextSellerPlayers = seller.players.filter((pp) => pp.id !== playerId)
      const nextBuyerPlayers = [...buyer.players, { ...player, starting: false }]
      // remove listing entry
      const nextSellerListings = seller.finances.playersForSale.filter((e) => e.id !== playerId)
      const teams = [...s.teams]
      teams[sellerIdx] = { ...seller, finances: { ...sellerFin, playersForSale: nextSellerListings }, players: nextSellerPlayers }
      teams[buyerIdx] = { ...buyer, finances: buyerFin, players: nextBuyerPlayers }
      return { ...s, teams }
    })
    saveNow()
  }

  function processWeeklyMarket() {
    // Simple weekly process: small chance to auto-list AI players and refresh free agents if low
    autoListAIPlayers(1)
    setState((s) => {
      if ((s.freeAgents || []).length < 12) {
        const add = 6
        const roles = ['GK','DR','DC','DL','MR','MC','ML','FR','ST','FL']
        const extra = Array.from({ length: add }, () => makePlayer(roles[Math.floor(Math.random() * roles.length)]))
        return { ...s, freeAgents: [...s.freeAgents, ...extra] }
      }
      // Chance to create incoming AI offers for user's listed players
      const my = s.teamName
      const meIdx = s.teams.findIndex(t => t.name === my)
      if (meIdx >= 0) {
        const me = ensureTeamMarketFinances(s.teams[meIdx])
        const myListed = me.finances.playersForSale || []
        if (myListed.length) {
          // Increased frequency and quantity: generate 1 to 3 offers most weeks
          const attempts = (Math.random() < 0.8) ? (1 + Math.floor(Math.random() * 3)) : 0
          if (attempts > 0) {
            const domestic = s.teams.filter(t => t.name !== my).map(t => t.name)
            const foreign = (GAME_CONSTANTS.TEAMS?.FOREIGN_TEAMS || [])
            const buyersPool = [...domestic, ...foreign]
            if (buyersPool.length) {
              const neg = ensureNegotiations(s)
              let pendingOffers = [...neg.pendingOffers]
              for (let i = 0; i < attempts; i++) {
                const pick = myListed[Math.floor(Math.random() * myListed.length)]
                const buyer = buyersPool[Math.floor(Math.random() * buyersPool.length)]
                const { player } = findPlayerById(pick.id, s)
                if (!player) continue
                const isForeign = !s.teams.some(t => t.name === buyer)
                // Broader ranges; foreign teams can lowball more aggressively
                const feeVar = isForeign ? (0.6 + Math.random() * 0.45) : (0.8 + Math.random() * 0.3) // 0.60..1.05 or 0.80..1.10
                const wageVar = isForeign ? (0.8 + Math.random() * 0.25) : (0.9 + Math.random() * 0.2) // 0.80..1.05 or 0.90..1.10
                const amount = Number((pick.asking * feeVar).toFixed(2))
                const wage = Number((player.wage * wageVar).toFixed(2))
                // For domestic buyers, ensure they can afford the offer; foreign buyers are always feasible
                if (!isForeign) {
                  const buyerTeam = s.teams.find(t => t.name === buyer)
                  const can = canBuy(player, amount, buyerTeam, { wage }, s)
                  if (!can.ok) continue
                }
                const offer = { id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)), playerId: pick.id, seller: my, buyer, type: 'transfer', amount, wage, contractLength: 2 + Math.floor(Math.random() * 3), team: buyer, deadlineWeek: s.league.week + 1, status: 'pending', incoming: true, requiresDecision: true }
                pendingOffers.push(offer)
              }
              // set UI badge: new incoming offers for user
              return { ...s, ui: { ...(s.ui || {}), marketBadge: true }, negotiations: { ...neg, pendingOffers } }
            }
          }
        }
      }
      return s
    })
    saveNow()
  }

  function resolveNegotiations() {
    setState((s) => {
      const neg = ensureNegotiations(s)
      if (!neg.pendingOffers.length) return s
      const week = s.league.week
      // Group offers by player (only offers expiring this week, vanilla parity)
      const byPlayer = new Map()
      for (const o of neg.pendingOffers) {
        if (o.status !== 'pending') continue
        if (o.incoming && o.requiresDecision) continue // wait for user action
        if (o.deadlineWeek !== week) continue // only resolve offers due this week
        const key = o.playerId
        if (!byPlayer.has(key)) byPlayer.set(key, [])
        byPlayer.get(key).push(o)
      }
  let next = { ...s }
      let pending = [...neg.pendingOffers]
  let anyMineResolved = false
      const ranges = GAME_CONSTANTS.FINANCE.NEGOTIATION_RANGES
      // Resolve per player: choose best offer and probabilistically accept
  byPlayer.forEach((offers, pid) => {
        const entry = offers[0]
  if (entry.type === 'free') {
          // player picks best wage/length
          offers.sort((a,b)=> (b.wage + b.contractLength*0.1) - (a.wage + a.contractLength*0.1))
          const best = offers[0]
          const { player } = findPlayerById(pid, next) || {}
          if (!player) return
          const buyerIdx = next.teams.findIndex(t => t.name === best.buyer)
          if (buyerIdx < 0) return
          const buyer = ensureTeamMarketFinances(next.teams[buyerIdx])
          if (!canAffordWage(buyer, best.wage, next, best.id)) return
          const pAccept = acceptanceFA(player, best)
          if (Math.random() < pAccept) {
            // finalize
            const nextFA = (next.freeAgents || []).filter(p => p.id !== pid)
            const nextBuyer = { ...buyer, players: [...buyer.players, { ...player, starting: false, wage: best.wage }] }
            const teams = [...next.teams]; teams[buyerIdx] = nextBuyer
            next = { ...next, teams, freeAgents: nextFA }
            pending = pending.map(o => {
              if (o.playerId !== pid) return o
              const updated = { ...o, status: o.id === best.id ? 'accepted' : 'rejected' }
              if (updated.buyer === s.teamName) anyMineResolved = true
              return updated
            })
          }
        } else {
          // transfer: seller chooses best fee, modulated by wage attractiveness and contract length
          offers.sort((a,b)=> (b.amount + b.wage*0.18 + b.contractLength*0.2) - (a.amount + a.wage*0.18 + a.contractLength*0.2))
          const best = offers[0]
          const sellerIdx = next.teams.findIndex(t => t.name === best.seller)
          const buyerIdx = next.teams.findIndex(t => t.name === best.buyer)
          if (sellerIdx < 0) return
          const seller = ensureTeamMarketFinances(next.teams[sellerIdx])
          const player = seller.players.find(p => p.id === pid)
          if (!player) return
          const askingEntry = (seller.finances.playersForSale || []).find(e => e.id === pid)
          const asking = askingEntry?.asking ?? player.value
          const pAccept = acceptanceTransfer(player, best, asking)
          const isForeign = buyerIdx < 0
          let canProceed = true
          let buyer
          if (!isForeign) {
            buyer = ensureTeamMarketFinances(next.teams[buyerIdx])
            const can = canBuy(player, best.amount, buyer, { wage: best.wage, excludeOfferId: best.id }, next)
            canProceed = can.ok
          }
          if (canProceed && Math.random() < pAccept) {
            const sellerFin = { ...seller.finances, cash: Number(((seller.finances.cash || 0) + best.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
            const nextSellerPlayers = seller.players.filter(pp => pp.id !== pid)
            const nextSellerListings = seller.finances.playersForSale.filter(e => e.id !== pid)
            const teams = [...next.teams]
            teams[sellerIdx] = { ...seller, finances: { ...sellerFin, playersForSale: nextSellerListings }, players: nextSellerPlayers }
            if (!isForeign) {
              const buyerFin = { ...buyer.finances, cash: Number(((buyer.finances.cash || 0) - best.amount).toFixed(GAME_CONSTANTS.FINANCE.DECIMAL_PLACES)) }
              const nextBuyerPlayers = [...buyer.players, { ...player, starting: false, wage: best.wage }]
              teams[buyerIdx] = { ...buyer, finances: buyerFin, players: nextBuyerPlayers }
            }
            next = { ...next, teams }
            pending = pending.map(o => {
              if (o.playerId !== pid) return o
              const updated = { ...o, status: o.id === best.id ? 'accepted' : 'rejected' }
              if (updated.buyer === s.teamName) anyMineResolved = true
              return updated
            })
          }
        }
      })
      // Expire or reject offers that hit their deadline this week
      // For the user's outgoing offers, treat as 'rejected' (not 'expired') after consideration window
      pending = pending.map(o => {
        if (o.status === 'pending' && o.deadlineWeek === week) {
          const mine = o.buyer === s.teamName
          const updated = { ...o, status: mine ? 'rejected' : 'expired' }
          if (mine) anyMineResolved = true
          return updated
        }
        return o
      })
      // Build a summary for the user's outgoing offers due this week
      try {
        const my = s.teamName
        const mine = pending.filter(o => o.buyer === my && o.deadlineWeek === week && o.status !== 'pending')
        if (mine.length) {
          const accepted = []
          const rejected = []
          const expired = []
          for (const o of mine) {
            const { player } = findPlayerById(o.playerId, next) || {}
            const label = player ? `${player.name} (${o.type === 'free' ? 'Free' : 'Transfer'})` : `${o.playerId}`
            if (o.status === 'accepted') accepted.push(label)
            else if (o.status === 'rejected') rejected.push(label)
            else if (o.status === 'expired') expired.push(label)
          }
          const block = (title, items) => items.length ? `<li><strong>${title}:</strong> ${items.join(', ')}</li>` : ''
          const html = `
            <div>
              <h3 style="margin-top:0">Negotiations Update — Week ${week}</h3>
              <ul>
                ${block('Accepted', accepted)}
                ${block('Rejected', rejected)}
                ${block('Expired', expired)}
              </ul>
            </div>`
          // Inform the user via debug modal if available
          window.debugUI?.showModal?.('Negotiations', html)
        }
      } catch (e) {
        // Non-fatal if UI hook not present
        console.warn('Negotiations summary modal failed', e)
      }
      // If any of my outgoing offers were resolved, set Market badge
      const ui = anyMineResolved ? { ...(next.ui || {}), marketBadge: true } : (next.ui || next.ui)
      return { ...next, ui, negotiations: { ...neg, pendingOffers: pending } }
    })
    saveNow()
  }

  const api = useMemo(() => ({
    initMarketIfNeeded,
    generateFreeAgents,
    autoListAIPlayers,
    aggregateTransferList,
    findPlayerById,
  getOffersForPlayer,
  getOfferStatsForPlayer,
    getPendingCommitments,
    canAffordWage,
    wageWarning,
    computeSalaryCap,
    canBuy,
    wouldExceedMaxOnBuy,
    willViolateMinOnSell,
    canListWithReason,
    signFreeAgent,
    listPlayer,
    unlistPlayer,
    buyListedPlayer,
    submitOfferForListed,
    generateCompetingOffers,
    submitOfferForFreeAgent,
    acceptIncomingOffer,
    rejectIncomingOffer,
    cancelOutgoingOffer,
    processWeeklyMarket,
    resolveNegotiations,
  }), [state])

  return <MarketContext.Provider value={api}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error('useMarket must be used within MarketProvider')
  return ctx
}
