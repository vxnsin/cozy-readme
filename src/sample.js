// Stand-in data for the configurator preview. The action always uses live data.
export function sampleData() {
  const weeks = [];
  for (let i = 0; i < 52; i++) weeks.push(Math.max(0, Math.round(6 + 5 * Math.sin(i / 4) + ((i * 7) % 5) - 2)));
  const poster = path => `https://media.kitsu.app/anime/${path}`;
  return {
    preview: true,
    now: new Date(),
    anime: [
      { title: 'Sousou no Frieren', season: 1, episode: 24, cover: poster('46474/poster_image/small-2dc1165f5acd773939c7befb0949d258.jpeg') },
      { title: 'SPY×FAMILY', season: 2, episode: 7, cover: poster('45398/poster_image/small-d2d2ddd1b7f5a9c20bbb69b2b476a0d6.jpeg') },
      { title: 'Bocchi the Rock!', season: 1, episode: 12, cover: poster('44196/poster_image/small-6bbc75b8d81acea5f4a884a2ffed25e8.jpeg') },
      { title: 'Cowboy Bebop', season: 1, episode: 26, cover: poster('poster_images/1/small.jpg') },
      { title: 'Mob Psycho 100', season: 3, episode: 5, cover: poster('11578/poster_image/small-286944fe8e3610c8a8a68e70a5a8ec61.jpeg') },
      { title: 'Violet Evergarden', season: 1, episode: 13, cover: poster('poster_images/12230/small.jpg') },
      { title: 'Haikyuu!!', season: 4, episode: 2, cover: poster('poster_images/8133/small.jpg') },
      { title: 'Kimi no Na wa.', season: null, episode: null, cover: poster('poster_images/11614/small.jpg') }
    ],
    github: {
      contributions: 1234,
      commits: 987,
      repos: 21,
      stars: 42,
      followers: 17,
      weeks,
      topLanguages: [
        { name: 'TypeScript', color: '#3178c6', share: 0.38 },
        { name: 'JavaScript', color: '#f1e05a', share: 0.24 },
        { name: 'Java', color: '#b07219', share: 0.16 },
        { name: 'Python', color: '#3572A5', share: 0.11 },
        { name: 'CSS', color: '#663399', share: 0.07 },
        { name: 'Shell', color: '#89e051', share: 0.04 }
      ],
      lastPush: { name: 'cozy-readme', at: new Date(Date.now() - 2 * 86400000).toISOString() }
    },
    snake: null,
    repo: {
      name: 'you/cozy-project',
      shortName: 'cozy-project',
      description: 'a tiny tool that does one thing and does it cozy. built on weekends, powered by tea.',
      homepage: 'https://example.dev',
      url: 'https://github.com/you/cozy-project',
      stars: 128,
      forks: 12,
      watchers: 6,
      issues: 3,
      license: 'MIT',
      topics: ['cli', 'retro', 'svg', 'github-action'],
      pushedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      createdAt: '2025-04-01T12:00:00Z',
      defaultBranch: 'main',
      commitCount: 342,
      weeks,
      languages: [{ name: 'TypeScript', share: 0.62 }, { name: 'CSS', share: 0.21 }, { name: 'HTML', share: 0.12 }, { name: 'Shell', share: 0.05 }],
      commits: [
        ['a1b2c3d', 'add a snow effect for winter', 'you', 2],
        ['9f8e7d6', 'fix the typewriter skipping wide characters', 'friend', 20],
        ['4c5d6e7', 'make the marquee speed configurable', 'you', 46],
        ['0a1b2c3', 'docs: explain readme markers', 'you', 70],
        ['7e8f9a0', 'release v1.2.0', 'you', 120],
        ['3d4e5f6', 'first commit (｡･ω･｡)', 'you', 900]
      ].map(([sha, message, author, hours]) => ({ sha, message, author, date: new Date(Date.now() - hours * 3600000).toISOString() })),
      contributors: ['you', 'friend', 'tea-enjoyer', 'pixelcat', 'night-owl'].map((login, i) => ({
        login, contributions: [241, 58, 21, 9, 3][i], avatar: null
      })),
      releases: [
        { tag: 'v1.2.0', name: 'winter update', date: new Date(Date.now() - 5 * 86400000).toISOString(), prerelease: false },
        { tag: 'v1.1.0', name: 'more themes', date: new Date(Date.now() - 40 * 86400000).toISOString(), prerelease: false },
        { tag: 'v1.0.0', name: 'hello world', date: new Date(Date.now() - 90 * 86400000).toISOString(), prerelease: false }
      ]
    }
  };
}
