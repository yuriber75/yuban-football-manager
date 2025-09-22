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
      finances: team.finances || { cash: 0, wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET },
      tactics: team.tactics || { formation: team.formation || '442' },
    }))
  }

  return parsed
}

export function GameStateProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(GAME_CONSTANTS.STORAGE.SAVE_KEY)
      if (!raw) return defaultState
      return hydrate(raw)
    } catch (e) {
      console.warn('Failed to load saved state, using defaults', e)
      return defaultState
    }
  })

  const saveRef = useRef(null)

  // Persist to localStorage (debounced)
  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      try {
        localStorage.setItem(GAME_CONSTANTS.STORAGE.SAVE_KEY, serialize(state))
      } catch (e) {
        console.error('Failed to save state', e)
      }
    }, 50)
    return () => clearTimeout(saveRef.current)
  }, [state])

  const api = useMemo(() => ({
    state,
    setState,
    saveNow: () => {
      try { localStorage.setItem(GAME_CONSTANTS.STORAGE.SAVE_KEY, serialize(state)) } catch {}
    },
    reset: () => {
      setState(defaultState)
      try { localStorage.removeItem(GAME_CONSTANTS.STORAGE.SAVE_KEY) } catch {}
    },
  }), [state])

  return (
    <GameStateContext.Provider value={api}>{children}</GameStateContext.Provider>
  )
}

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider')
  return ctx
}
