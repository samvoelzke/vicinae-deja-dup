export function formatBytes(n?: number): string {
  if (!n || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Compact relative time like "2h ago", "3d ago", "Just now". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Coarse recency bucket used to group snapshots into list sections. */
export function recencyBucket(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "Older";
  const days = (Date.now() - then) / (1000 * 60 * 60 * 24);
  if (days < 1) return "Today";
  if (days < 7) return "This Week";
  if (days < 31) return "This Month";
  if (days < 366) return "This Year";
  return "Older";
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso || "—" : d.toLocaleString();
}
