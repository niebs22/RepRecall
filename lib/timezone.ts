export function toUTC(date: string): Date {
  return new Date(date.endsWith('Z') ? date : date + 'Z')
}

export function formatTimeInZone(utcDate: string, timezone: string) {
  return toUTC(utcDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  })
}

export function formatDateInZone(utcDate: string, timezone: string) {
  return toUTC(utcDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone
  })
}

export function getHourInZone(utcDate: string, timezone: string): number {
  return parseInt(toUTC(utcDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone
  }))
}

export function getDayInZone(utcDate: string, timezone: string): number {
  const day = toUTC(utcDate).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: timezone
  })
  const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  return dayMap[day] ?? 0
}