export function sanitizeForKv<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue
    if (value instanceof Date) {
      clean[key] = value.toISOString()
    } else if (typeof value === 'object') {
      clean[key] = JSON.stringify(value)
    } else {
      clean[key] = value
    }
  }
  return clean
}
