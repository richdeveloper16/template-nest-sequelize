/** Timestamp HTTP: ISO 8601 UTC, compartido por todos los entornos. */
export function formatApiTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
