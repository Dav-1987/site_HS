const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * When something happened, the way a person says it: "сегодня, 12:40",
 * "вчера, 19:20", "18 окт, 13:15", "18.10.2025, 13:15". For orders and for
 * the last site rebuild alike.
 */
export function formatWhen(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 864e5);
  if (days === 0) return `сегодня, ${time}`;
  if (days === 1) return `вчера, ${time}`;
  const date =
    d.getFullYear() === now.getFullYear()
      ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '')
      : d.toLocaleDateString('ru-RU');
  return `${date}, ${time}`;
}

/** How long something took, the same way: "38 с", "2 мин 38 с", "1 ч 5 мин". */
export function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} мин ${s % 60} с` : `${m} мин`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} ч ${m % 60} мин` : `${h} ч`;
}
