export function getCurrentUrl(): string {
  return (window && window.location.href) || (self && self.location.href) || '';
}
