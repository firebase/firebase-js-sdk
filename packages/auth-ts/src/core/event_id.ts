export function generateEventId(prefix?: string): string {
  return `${prefix ? prefix : ''}${Math.floor(Math.random() * 1000000000)}`;
}
