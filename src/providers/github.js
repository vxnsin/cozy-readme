const QUERY = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        pushedAt
        stargazerCount
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
      }
    }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount } }
      }
    }
  }
}`;

export async function loadGithub({ user, token, excludeLanguages = [] }) {
  if (!token) throw new Error('no github token, skipping github stats');
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'cozy-readme' },
    body: JSON.stringify({ query: QUERY, variables: { login: user } })
  });
  const body = await response.json();
  if (body.errors) throw new Error(body.errors.map(e => e.message).join('; '));
  if (!body.data || !body.data.user) throw new Error(`github user "${user}" not found`);

  const u = body.data.user;
  const repos = u.repositories.nodes;
  const skip = new Set(excludeLanguages.map(l => l.toLowerCase()));
  const languages = new Map();
  for (const repo of repos) {
    for (const { size, node } of repo.languages.edges) {
      if (skip.has(node.name.toLowerCase())) continue;
      const entry = languages.get(node.name) || { name: node.name, color: node.color || '#8b949e', size: 0 };
      entry.size += size;
      languages.set(node.name, entry);
    }
  }
  const totalSize = [...languages.values()].reduce((sum, l) => sum + l.size, 0) || 1;
  const collection = u.contributionsCollection;

  return {
    contributions: collection.contributionCalendar.totalContributions,
    commits: collection.totalCommitContributions + collection.restrictedContributionsCount,
    repos: u.repositories.totalCount,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    followers: u.followers.totalCount,
    weeks: collection.contributionCalendar.weeks
      .map(week => week.contributionDays.reduce((sum, day) => sum + day.contributionCount, 0))
      .slice(-52),
    topLanguages: [...languages.values()].sort((a, b) => b.size - a.size).slice(0, 6)
      .map(l => ({ name: l.name, color: l.color, share: l.size / totalSize })),
    lastPush: repos[0] ? { name: repos[0].name, at: repos[0].pushedAt } : null
  };
}
