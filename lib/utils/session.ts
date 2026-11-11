export function getOrCreateSessionId(): string {
  const key = 'meowmory_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  localStorage.setItem(key, id);
  return id;
}
