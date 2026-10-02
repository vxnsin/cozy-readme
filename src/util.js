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
    'github.stars': data.github ? data.github.stars : '',
    'repo.name': data.repo ? data.repo.name : (config.repo || ''),
    'repo.shortName': data.repo ? data.repo.shortName : '',
    'repo.description': data.repo ? data.repo.description : '',
    'repo.stars': data.repo ? data.repo.stars : '',
    'repo.forks': data.repo ? data.repo.forks : '',
    'repo.commits': data.repo && data.repo.commitCount != null ? data.repo.commitCount : '',
    'repo.release': data.repo && data.repo.releases[0] ? data.repo.releases[0].tag : '',
    'repo.license': data.repo && data.repo.license ? data.repo.license : '',
    'repo.branch': data.repo ? data.repo.defaultBranch : ''
  };
}

// Linguist colours for common languages; the REST API does not return them.
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', Kotlin: '#A97BFF', Go: '#00ADD8',
  Rust: '#dea584', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4F5D95', Ruby: '#701516', Swift: '#F05138',
  Dart: '#00B4AB', Lua: '#000080', Shell: '#89e051', PowerShell: '#012456', HTML: '#e34c26', CSS: '#663399',
  SCSS: '#c6538c', Vue: '#41b883', Svelte: '#ff3e00', Astro: '#ff5a03', Dockerfile: '#384d54', Makefile: '#427819',
  'Jupyter Notebook': '#DA5B0B', Elixir: '#6e4a7e', Haskell: '#5e5086', Scala: '#c22d40', Zig: '#ec915c', Nix: '#7e7eff',
  MDX: '#fcb32c', Batchfile: '#C1F12E', GDScript: '#355570', Groovy: '#4298b8'
};

export function langColor(name) {
  if (LANG_COLORS[name]) return LANG_COLORS[name];
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360},55%,55%)`;
}

export function shortDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}
