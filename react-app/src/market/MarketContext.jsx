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

  function canAffordWage(team, wage) {
    const current = team.players.reduce((sum, p) => sum + (p.wage || 0), 0)
    return current + wage <= (team.finances?.wageBudget || GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET)
  }
  function canBuy(player, fee, buyer) {
    if (!buyer?.finances) return { ok: false, reason: 'No finances' }
    if ((buyer.finances.cash ?? 0) < fee) return { ok: false, reason: 'Insufficient cash' }
    if (!canAffordWage(buyer, player.wage)) return { ok: false, reason: 'Wage budget exceeded' }
    if (buyer.players.length >= GAME_CONSTANTS.FINANCE.MAX_SQUAD_SIZE) return { ok: false, reason: 'Squad size limit' }
    return { ok: true }
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
      return s
    })
    saveNow()
  }

  const api = useMemo(() => ({
    initMarketIfNeeded,
    generateFreeAgents,
    autoListAIPlayers,
    aggregateTransferList,
    findPlayerById,
    canAffordWage,
    canBuy,
    signFreeAgent,
    listPlayer,
    unlistPlayer,
    buyListedPlayer,
    processWeeklyMarket,
  }), [state])

  return <MarketContext.Provider value={api}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error('useMarket must be used within MarketProvider')
  return ctx
}
