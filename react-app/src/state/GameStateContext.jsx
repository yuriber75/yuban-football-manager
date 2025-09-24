import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GAME_CONSTANTS } from '../constants'

const GameStateContext = createContext(null)

const defaultState = {
  manager: '',
  teamName: '',
  teams: [],
  ui: {
    marketBadge: false, // show dot on Market tab for new offers/accepted outcomes
  },
  league: {
    week: 1,
    currentViewWeek: 0,
    fixtures: [],
    table: {},
    results: [],
    statistics: {
      topScorers: [],
      topAssisters: [],
      bestRatings: [],
      cleanSheets: [],
      yellowCards: [],
      redCards: [],
    },
    seasonStats: {
      matchesPlayed: 0,
      totalGoals: 0,
      avgGoalsPerGame: 0,
      cleanSheets: 0,
      cardsTotal: 0,
    },
  },
  career: {
    cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
    wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
    sponsorTech: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH,
    sponsorShirt: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT,
  },
  freeAgents: [],
  negotiations: {
    pendingOffers: [],
    rejectedPlayers: new Set(),
    attemptsCount: {},
  },
}

function serialize(state) {
  return JSON.stringify({
    ...state,
    negotiations: {
      ...state.negotiations,
      rejectedPlayers: Array.from(state.negotiations?.rejectedPlayers || []),
    },
  })
}

function hydrate(raw) {
  const parsed = JSON.parse(raw)
  // Ensure required shapes
  parsed.negotiations = parsed.negotiations || {}
  parsed.negotiations.pendingOffers = parsed.negotiations.pendingOffers || []
  parsed.negotiations.rejectedPlayers = new Set(parsed.negotiations.rejectedPlayers || [])
    parsed.negotiations.attemptsCount = parsed.negotiations.attemptsCount || {}

  function roleSection(role) {
    if (role === 'GK') return 'GK'
    if (['DR','DC','DL'].includes(role)) return 'DF'
    if (['MR','MC','ML'].includes(role)) return 'MF'
    if (['FR','ST','FL'].includes(role)) return 'FW'
    return 'MF'
  }

  function ensureJerseyNumbers(players) {
    const POOLS = {
      GK: [1, 12, 13, 22, 23, 31],
      DF: [2, 3, 4, 5, 6, 15, 16, 20, 21, 24, 25],
      MF: [6, 7, 8, 10, 11, 14, 17, 18, 19, 26],
      FW: [9, 10, 17, 18, 19, 27, 28],
    }
    const used = new Set(players.filter(p => typeof p.number === 'number').map(p => p.number))
    let fallback = 30
    for (const p of players) {
      if (typeof p.number === 'number') continue
      const sec = roleSection(p.primaryRole)
      const pool = POOLS[sec] || []
      let assigned = null
      for (const n of pool) {
        if (!used.has(n)) { assigned = n; break }
      }
      if (assigned == null) {
        while (used.has(fallback)) fallback++
        assigned = fallback
        fallback++
      }
      p.number = assigned
      used.add(assigned)
    }
  }

  if (Array.isArray(parsed.teams)) {
    parsed.teams = parsed.teams.map((team) => {
      const fin = {
        cash: 0,
        wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
        stadiumCapacity: GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY,
        attendance: GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE,
          stadiumCondition: (team.finances?.stadiumCondition ?? GAME_CONSTANTS.FINANCE.STADIUM_CONDITION?.INITIAL ?? 0.85),
          maintenancePlanId: team.finances?.maintenancePlanId || 'basic',
        loans: Array.isArray(team.finances?.loans) ? team.finances.loans : [],
        ...(team.finances || {}),
        sponsorContract: team.finances?.sponsorContract || null,
        investments: team.finances?.investments || { merchandising: 0, hospitality: 0 },
      }
      // Migrate wages: ensure wages are in M per WEEK (~0.02–0.10). If looks annual (>= 0.30 M/wk), convert by /52.
      const migratedPlayers = (team.players || []).map(p => {
        let w = Number(p.wage || 0)
        if (w >= 0.30) w = w / 52
        const minW = GAME_CONSTANTS.FINANCE.MIN_PLAYER_WAGE
        const maxW = GAME_CONSTANTS.FINANCE.MAX_PLAYER_WAGE
        if (!isFinite(w) || isNaN(w)) w = minW
        w = Math.max(minW, Math.min(maxW, Number(w.toFixed(2))))
        return { ...p, wage: w, contractYearsRemaining: (typeof p.contractYearsRemaining === 'number' ? p.contractYearsRemaining : (1 + Math.floor(Math.random() * 5))) }
      })
      return {
        ...team,
        finances: fin,
        tactics: team.tactics || { formation: team.formation || '442' },
        players: migratedPlayers,
      }
    })

    // Ensure jersey numbers exist/unique per team
    parsed.teams.forEach(t => {
      if (Array.isArray(t.players)) ensureJerseyNumbers(t.players)
    })
  }

  return parsed
}

export function GameStateProvider({ children }) {
  // Boot behavior: do NOT auto-load saved state; start with defaults.
  const [state, setState] = useState(defaultState)
  const [ready, setReady] = useState(false) // when true, allow saving
  const [hasSaved, setHasSaved] = useState(() => {
    try { return !!localStorage.getItem(GAME_CONSTANTS.STORAGE.SAVE_KEY) } catch { return false }
  })

  const saveRef = useRef(null)

  // Persist to localStorage (debounced) only after boot confirmation
  useEffect(() => {
    if (!ready) return
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      try {
        localStorage.setItem(GAME_CONSTANTS.STORAGE.SAVE_KEY, serialize(state))
        setHasSaved(true)
      } catch (e) {
        console.error('Failed to save state', e)
      }
    }, 50)
    return () => clearTimeout(saveRef.current)
  }, [state, ready])

  const api = useMemo(() => ({
    state,
    setState,
    // UI helpers
    setMarketBadge: (on) => setState((s) => ({ ...s, ui: { ...(s.ui || {}), marketBadge: !!on } })),
    clearMarketBadge: () => setState((s) => ({ ...s, ui: { ...(s.ui || {}), marketBadge: false } })),
    saveNow: () => {
      if (!ready) return
      try { localStorage.setItem(GAME_CONSTANTS.STORAGE.SAVE_KEY, serialize(state)); setHasSaved(true) } catch {}
    },
    hasSaved,
    confirmLoadSaved: () => {
      try {
        const raw = localStorage.getItem(GAME_CONSTANTS.STORAGE.SAVE_KEY)
        if (raw) {
          const hydrated = hydrate(raw)
          setState(hydrated)
        }
        setReady(true)
      } catch (e) {
        console.warn('No saved state to load', e)
        setReady(true)
      }
    },
    confirmStartNew: () => {
      // ensure we don't save defaults until user starts the new career; mark ready and clear stale save key
      try { localStorage.removeItem(GAME_CONSTANTS.STORAGE.SAVE_KEY) } catch {}
      setHasSaved(false)
      setReady(true)
    },
    reset: () => {
      setState(defaultState)
      try { localStorage.removeItem(GAME_CONSTANTS.STORAGE.SAVE_KEY) } catch {}
      setHasSaved(false)
      setReady(false)
    },
  }), [state, ready, hasSaved])

  return (
    <GameStateContext.Provider value={api}>{children}</GameStateContext.Provider>
  )
}

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider')
  return ctx
}
