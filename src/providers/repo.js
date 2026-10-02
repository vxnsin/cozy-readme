// Repository data via the GitHub REST API. Works with a token (action) and
// without one (configurator preview, 60 requests per hour).
const API = 'https://api.github.com';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function headers(token) {
  const h = { Accept: 'application/vnd.github+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (typeof window === 'undefined') h['User-Agent'] = 'cozy-readme';
  return h;
}

async function get(path, token) {
  const response = await fetch(`${API}${path}`, { headers: headers(token) });
  if (response.status === 404) throw new Error(`${path} not found (is the repo public?)`);
  if (response.status === 403 || response.status === 429) throw new Error('github rate limit reached, try again later');
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response;
}

// The total commit count is the last page number of a one-per-page listing.
async function commitCount(repo, token) {
  const response = await get(`/repos/${repo}/commits?per_page=1`, token);
  const link = response.headers.get('link') || '';
  const last = link.match(/[?&]page=(\d+)>; rel="last"/);
  if (last) return Number(last[1]);
  return (await response.json()).length;
}

// GitHub computes these stats lazily and answers 202 until they are ready.
async function commitActivity(repo, token) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${API}/repos/${repo}/stats/commit_activity`, { headers: headers(token) });
    if (response.status === 200) {
      const weeks = await response.json();
      return Array.isArray(weeks) ? weeks.map(w => w.total) : [];
    }
    if (response.status !== 202) return [];
    await sleep(1500 * (attempt + 1));
  }
  return [];
}

export async function loadRepo({ repo, token, commits = 8, contributors = 12, releases = 5 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error(`"${repo}" is not an owner/name repo`);
  const json = path => get(path, token).then(r => r.json());

  const [info, languages, log, people, rel, total, weeks] = await Promise.all([
    json(`/repos/${repo}`),
    json(`/repos/${repo}/languages`),
    json(`/repos/${repo}/commits?per_page=${commits}`),
    json(`/repos/${repo}/contributors?per_page=${contributors}`).catch(() => []),
    json(`/repos/${repo}/releases?per_page=${releases}`).catch(() => []),
    commitCount(repo, token).catch(() => null),
    commitActivity(repo, token).catch(() => [])
  ]);

  const langTotal = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  return {
    name: info.full_name,
    shortName: info.name,
    description: info.description || '',
    homepage: info.homepage || '',
    url: info.html_url,
    stars: info.stargazers_count,
    forks: info.forks_count,
    watchers: info.subscribers_count,
    issues: info.open_issues_count,
    license: info.license && info.license.spdx_id !== 'NOASSERTION' ? info.license.spdx_id : null,
    topics: info.topics || [],
    pushedAt: info.pushed_at,
    createdAt: info.created_at,
    defaultBranch: info.default_branch,
    commitCount: total,
    weeks,
    languages: Object.entries(languages).slice(0, 6).map(([name, size]) => ({ name, share: size / langTotal })),
    commits: log.map(c => ({
      sha: c.sha.slice(0, 7),
      message: (c.commit.message || '').split('\n')[0],
      author: (c.author && c.author.login) || (c.commit.author && c.commit.author.name) || 'someone',
      date: (c.commit.author && c.commit.author.date) || (c.commit.committer && c.commit.committer.date)
    })),
    contributors: people.filter(p => p.type !== 'Bot').map(p => ({ login: p.login, contributions: p.contributions, avatar: `${p.avatar_url}${p.avatar_url.includes('?') ? '&' : '?'}s=64` })),
    releases: rel.filter(r => !r.draft).map(r => ({ tag: r.tag_name, name: r.name || r.tag_name, date: r.published_at, prerelease: r.prerelease }))
  };
}
