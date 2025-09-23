export function formatMoney(value, { decimals = 2, useSpaces = false, useCommaDecimal = false } = {}) {
  if (value === null || value === undefined || isNaN(value)) return '€0'
  const abs = Math.abs(value)
  let num = value
  let suffix = ''
  if (abs >= 1_000_000) { num = value / 1_000_000; suffix = 'M' }
  else if (abs >= 1_000) { num = value / 1_000; suffix = 'K' }
  const locale = useCommaDecimal ? 'it-IT' : 'en-US'
  let out = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
  if (useSpaces) out = out.replace(/,/g, ' ')
  return `€${out}${suffix}`
}

// Format numbers that are already in "millions" units used by the game (e.g., 1.5 => €1.50M)
export function formatMillions(value, { decimals = 2, useSpaces = false, useCommaDecimal = true } = {}) {
  if (value === null || value === undefined || isNaN(value)) return '€0M'
  const locale = useCommaDecimal ? 'it-IT' : 'en-US'
  let out = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
  if (useSpaces) out = out.replace(/,/g, ' ')
  return `€${out}M`
}

// Format values expressed in "millions" to thousands of euros explicitly (e.g., 0.050 -> €50k)
// Useful when game data uses millions-per-week but UI needs €k/week for readability
export function formatKFromMillions(valueInMillions, { decimals = 0, useSpaces = false, useCommaDecimal = true } = {}) {
  const m = Number(valueInMillions || 0)
  const thousands = m * 1000
  const locale = useCommaDecimal ? 'it-IT' : 'en-US'
  let out = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(thousands)
  if (useSpaces) out = out.replace(/,/g, ' ')
  return `€${out}k`
}
