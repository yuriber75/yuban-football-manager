import React from 'react'

export default function ConfirmDialog({ open, title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card" style={{ width: 380, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <div style={{ color: 'var(--muted)', marginBottom: 12 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
