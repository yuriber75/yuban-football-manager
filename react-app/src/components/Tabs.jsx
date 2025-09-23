import React from 'react'

const tabs = [
  { id: 'squad', label: 'My Team' },
  { id: 'teams', label: 'Other Teams' },
  { id: 'market', label: 'Market' },
  { id: 'finance', label: 'Finance' },
  { id: 'league', label: 'League' },
  { id: 'match', label: 'Match' },
]

export function Tabs({ current, onChange, marketBadge = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingBottom: 8, marginBottom: 12 }}>
      {tabs.map((t) => {
        const showBadge = t.id === 'market' && marketBadge
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`tab ${current === t.id ? 'active' : ''}`}
            style={{ position: 'relative' }}
          >
            {t.label}
            {showBadge ? (
              <span
                aria-label="New market activity"
                title="New market activity"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  background: '#e74c3c',
                  display: 'inline-block',
                }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
