const severityLabels = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High']

export function formatSeverity(severity) {
  const numericSeverity = Number(severity)
  if (Number.isInteger(numericSeverity) && severityLabels[numericSeverity]) {
    return severityLabels[numericSeverity]
  }
  return String(severity || 'Unspecified')
}

export function severityClass(severity) {
  const label = formatSeverity(severity).toLowerCase()
  if (label === 'critical' || label === 'high' || label === 'very high') return 'high'
  if (label === 'medium' || label === 'moderate') return 'medium'
  return 'low'
}

export function formatRelativeTime(timestamp) {
  const time = new Date(timestamp).getTime()
  if (!Number.isFinite(time)) return 'Recently'

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} hr ago`

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
}

export function isToday(timestamp) {
  const time = new Date(timestamp)
  if (!Number.isFinite(time.getTime())) return false

  const today = new Date()
  return (
    time.getFullYear() === today.getFullYear() &&
    time.getMonth() === today.getMonth() &&
    time.getDate() === today.getDate()
  )
}
