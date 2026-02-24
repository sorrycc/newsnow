export function parseRelativeDate(dateStr: string, _timezone?: string): Date {
  const now = new Date()

  const relativeMatch = dateStr.match(/(\d+)\s*(秒|分钟|小时|天|周|月|年)前/)
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1])
    const unit = relativeMatch[2]
    const units: Record<string, number> = {
      "秒": 1000,
      "分钟": 60 * 1000,
      "小时": 60 * 60 * 1000,
      "天": 24 * 60 * 60 * 1000,
      "周": 7 * 24 * 60 * 60 * 1000,
      "月": 30 * 24 * 60 * 60 * 1000,
      "年": 365 * 24 * 60 * 60 * 1000,
    }
    if (units[unit]) {
      return new Date(now.getTime() - num * units[unit])
    }
  }

  const dateOnly = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/)
  if (dateOnly) {
    return new Date(`${dateOnly[1]}-${dateOnly[2].padStart(2, "0")}-${dateOnly[3].padStart(2, "0")}T${dateOnly[4].padStart(2, "0")}:${dateOnly[5].padStart(2, "0")}:00+08:00`)
  }

  const todayMatch = dateStr.match(/今天\s*(\d{1,2}):(\d{1,2})/)
  if (todayMatch) {
    const d = new Date(now)
    d.setHours(parseInt(todayMatch[1]), parseInt(todayMatch[2]), 0, 0)
    return d
  }

  const yesterdayMatch = dateStr.match(/昨天\s*(\d{1,2}):(\d{1,2})/)
  if (yesterdayMatch) {
    const d = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    d.setHours(parseInt(yesterdayMatch[1]), parseInt(yesterdayMatch[2]), 0, 0)
    return d
  }

  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) return parsed

  return now
}

export function tranformToUTC(dateStr: string): number {
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d.getTime()
  return Date.now()
}
