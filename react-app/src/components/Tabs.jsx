import React from 'react'

const tabs = [
  { id: 'squad', label: 'My Team' },
  { id: 'market', label: 'Market' },
  { id: 'finance', label: 'Finance' },
  { id: 'league', label: 'League' },
  { id: 'match', label: 'Match' },
]

export function Tabs({ current, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingBottom: 8, marginBottom: 12 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`tab ${current === t.id ? 'active' : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
