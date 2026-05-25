export function formatExpiry(expires?: number) {
  if (expires === undefined) return "Session";
  if (expires < Date.now()) return "Expired";
  return new Date(expires).toLocaleString();
}
