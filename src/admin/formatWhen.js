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
