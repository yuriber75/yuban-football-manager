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
