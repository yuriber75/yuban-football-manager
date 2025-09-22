import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GAME_CONSTANTS } from '../constants'

const GameStateContext = createContext(null)

const defaultState = {
  manager: '',
  teamName: '',
  teams: [],
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

  if (Array.isArray(parsed.teams)) {
    parsed.teams = parsed.teams.map((team) => ({
      ...team,
      finances: {
        cash: 0,
        wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
        stadiumCapacity: GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY,
        attendance: GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE,
        ...(team.finances || {}),
      },
      tactics: team.tactics || { formation: team.formation || '442' },
    }))
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
