// "{years} years" -> "8 years". Unknown keys stay as they are.
export function fill(text, vars) {
  return String(text ?? '').replace(/\{([\w.]+)\}/g, (match, key) => (vars[key] != null ? String(vars[key]) : match));
}

export function yearsSince(since, now) {
  const start = new Date(since);
  if (Number.isNaN(start.getTime())) return '';
  return Math.floor((now - start) / (365.25 * 86400000));
}

export function ago(date, now) {
  const days = Math.floor((now - new Date(date)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function episodeLabel(anime) {
  return [anime.season != null ? `S${anime.season}` : null, anime.episode != null ? `E${anime.episode}` : null]
    .filter(Boolean).join(' ');
}

// Values every text field can reference.
export function variables(data, config = {}) {
  const now = data.now;
  const latest = data.anime && data.anime[0];
  const push = data.github && data.github.lastPush;
  return {
    year: now.getFullYear(),
    date: now.toISOString().slice(0, 10),
    years: config.since ? yearsSince(config.since, now) : '',
    since: config.since ? new Date(config.since).getFullYear() : '',
    'anime.latest': latest ? [latest.title, episodeLabel(latest)].filter(Boolean).join(' ') : 'nothing, for once',
    'anime.title': latest ? latest.title : 'nothing, for once',
    'github.lastPush': push ? `${push.name} · ${ago(push.at, now)}` : 'somewhere',
    'github.user': (config.github && config.github.user) || '',
    'github.contributions': data.github ? data.github.contributions : '',
    'github.repos': data.github ? data.github.repos : '',
    'github.stars': data.github ? data.github.stars : ''
  };
}
