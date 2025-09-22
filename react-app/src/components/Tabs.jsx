import React from 'react'

const tabs = [
  { id: 'squad', label: 'Squad' },
  { id: 'market', label: 'Market' },
  { id: 'finance', label: 'Finance' },
  { id: 'league', label: 'League' },
  { id: 'match', label: 'Match' },
]

export function Tabs({ current, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 12 }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: current === t.id ? '#0ea5e9' : '#f8fafc',
            color: current === t.id ? 'white' : '#111827',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
