// Anime providers. Each returns [{ title, season, episode, cover, url }],
// most recent first. Everything uses fetch, so it runs in Node 18+; aniworld
// and MyAnimeList only work server side (no CORS).

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

async function anilist({ user, count }) {
  const query = `query($user: String, $count: Int) {
    Page(perPage: $count) {
      mediaList(userName: $user, type: ANIME, sort: UPDATED_TIME_DESC, status_in: [CURRENT, REPEATING, COMPLETED]) {
        progress
        media { title { english romaji } coverImage { large } siteUrl }
      }
    }
  }`;
  // anilist answers 500 for unknown users and private lists
  const data = await json('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { user, count } })
  }).catch(() => { throw new Error(`anilist user "${user}" not found or the list is private`); });
  if (data.errors) throw new Error(data.errors.map(e => e.message).join('; '));
  return data.data.Page.mediaList.map(entry => ({
    title: entry.media.title.english || entry.media.title.romaji,
    season: null,
    episode: entry.progress || null,
    cover: entry.media.coverImage.large,
    url: entry.media.siteUrl
  }));
}

async function myanimelist({ user, count, malClientId }) {
  if (!malClientId) throw new Error('myanimelist needs a client id (mal_client_id input / MAL_CLIENT_ID)');
  const url = `https://api.myanimelist.net/v2/users/${encodeURIComponent(user)}/animelist`
    + `?sort=list_updated_at&limit=${count}&fields=list_status,main_picture&nsfw=true`;
  const data = await json(url, { headers: { 'X-MAL-CLIENT-ID': malClientId } });
  return data.data
    .filter(entry => ['watching', 'completed'].includes(entry.list_status.status))
    .map(entry => ({
      title: entry.node.title,
      season: null,
      episode: entry.list_status.num_episodes_watched || null,
      cover: entry.node.main_picture && (entry.node.main_picture.large || entry.node.main_picture.medium),
      url: `https://myanimelist.net/anime/${entry.node.id}`
    }));
}

const KITSU = 'https://kitsu.io/api/edge';
const KITSU_HEADERS = { Accept: 'application/vnd.api+json' };

async function kitsu({ user, count }) {
  const users = await json(`${KITSU}/users?filter[slug]=${encodeURIComponent(user)}`, { headers: KITSU_HEADERS });
  const id = users.data[0] && users.data[0].id;
  if (!id) throw new Error(`kitsu user "${user}" not found`);
  const data = await json(`${KITSU}/library-entries?filter[userId]=${id}&filter[kind]=anime&sort=-progressed_at`
    + `&include=anime&fields[anime]=canonicalTitle,slug,posterImage&page[limit]=${Math.min(count, 20)}`, { headers: KITSU_HEADERS });
  const anime = new Map((data.included || []).map(a => [a.id, a.attributes]));
  return data.data.map(entry => {
    const a = anime.get(entry.relationships.anime.data && entry.relationships.anime.data.id) || {};
    return {
      title: a.canonicalTitle,
      season: null,
      episode: entry.attributes.progress || null,
      cover: a.posterImage && (a.posterImage.small || a.posterImage.medium),
      url: a.slug ? `https://kitsu.app/anime/${a.slug}` : null
    };
  }).filter(entry => entry.title);
}

// --- aniworld: scrapes the public "watched" page, covers come from kitsu ---

function decode(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, '\'')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function namesSeason(title, season) {
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][season];
  const alternatives = [`season\\s*${season}`, `${season}(?:st|nd|rd|th)\\s*season`, `part\\s*${season}`, `${season}`];
  if (roman) alternatives.push(roman);
  return new RegExp(`(^|[^a-z0-9])(${alternatives.join('|')})([^a-z0-9]|$)`, 'i').test(title);
}

async function kitsuCover(text) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await json(`${KITSU}/anime?filter[text]=${encodeURIComponent(text)}&page[limit]=1&fields[anime]=canonicalTitle,slug,posterImage`, { headers: KITSU_HEADERS });
      const hit = data.data[0];
      const poster = hit && hit.attributes.posterImage;
      const cover = poster && (poster.small || poster.medium || poster.original);
      return cover ? { title: hit.attributes.canonicalTitle, cover } : null;
    } catch (error) {
      if (attempt === 3) return null;
      await sleep(500 * attempt);
    }
  }
  return null;
}

async function aniworld({ user, count, cache = {} }) {
  const base = 'https://aniworld.to';
  const response = await fetch(`${base}/user/profil/${encodeURIComponent(user)}/watched`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) throw new Error(`aniworld answered ${response.status}`);
  const html = await response.text();

  const items = [];
  for (const block of html.split(/class="[^"]*coverListItem[^"]*"/).slice(1)) {
    const link = (block.match(/href="([^"]+)"/) || [])[1];
    if (!link) continue;
    items.push({
      title: decode((block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || ''),
      slug: (link.match(/\/anime\/stream\/([^/]+)/) || [])[1] || null,
      season: Number((link.match(/staffel-(\d+)/) || [])[1]) || null,
      episode: Number((link.match(/episode-(\d+)/) || [])[1]) || null,
      aniworldCover: ((block.match(/data-src="([^"]+)"/) || [])[1] || null),
      url: new URL(link, base).href
    });
  }

  // keep the furthest episode per series + season
  const groups = new Map();
  for (const item of items) {
    const key = `${item.slug || item.title}|${item.season ?? ''}`;
    const existing = groups.get(key);
    if (!existing || (item.episode ?? 0) > (existing.episode ?? 0)) groups.set(key, item);
  }

  const out = [];
  for (const item of [...groups.values()].slice(0, count)) {
    const key = `${item.slug || item.title}|${item.season ?? ''}`;
    if (!cache[key]) {
      const queries = [];
      if (item.season > 1) queries.push({ text: `${item.title} Season ${item.season}`, requireSeason: true });
      queries.push({ text: item.title });
      if (item.slug) queries.push({ text: item.slug.replace(/-/g, ' ') });
      for (const query of queries) {
        await sleep(300);
        const hit = await kitsuCover(query.text);
        if (hit && (!query.requireSeason || namesSeason(hit.title, item.season))) {
          cache[key] = { cover: hit.cover, fetchedAt: new Date().toISOString() };
          break;
        }
      }
    }
    const cover = (cache[key] && cache[key].cover) || (item.aniworldCover ? new URL(item.aniworldCover, base).href : null);
    out.push({ title: item.title, season: item.season, episode: item.episode, cover, url: item.url });
  }
  return out;
}

export const providers = { anilist, myanimelist, kitsu, aniworld };

export async function loadAnime(config, extra = {}) {
  const provider = providers[config.source];
  if (!provider) throw new Error(`unknown anime source "${config.source}" (use ${Object.keys(providers).join(', ')})`);
  if (!config.user) throw new Error('anime.user is missing');
  const entries = await provider({ user: config.user, count: config.count || 10, ...extra });
  return entries.slice(0, config.count || 10);
}
