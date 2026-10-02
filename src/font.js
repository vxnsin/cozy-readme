// SVGs shown through <img> cannot load external files, so fonts are embedded
// as base64. Google Fonts subsets on the fly via the text parameter, which
// keeps every card at a few KB of font data. Works in Node 18+ and browsers.
export const FAMILIES = {
  pixel: { family: 'DotGothic16', weight: 400, css: "'DotGothic16','MS Gothic',monospace" },
  mono: { family: 'IBM Plex Mono', weight: 400, css: "'IBM Plex Mono',ui-monospace,Consolas,monospace" },
  monoBold: { family: 'IBM Plex Mono', weight: 600, css: "'IBM Plex Mono',ui-monospace,Consolas,monospace" }
};

// Browsers send their own user agent; Node needs one that gets woff2 back.
const HEADERS = typeof window === 'undefined'
  ? { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
  : {};

const cache = new Map();

function toBase64(buffer) {
  if (typeof Buffer !== 'undefined') return Buffer.from(buffer).toString('base64');
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function fetchFace(key, text) {
  const { family, weight } = FAMILIES[key];
  const chars = [...new Set([...text])].sort().join('');
  const cacheKey = `${key}|${chars}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const promise = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(chars)}`;
    const css = await (await fetch(cssUrl, { headers: HEADERS })).text();
    const fileUrl = (css.match(/url\((https:[^)]+)\)/) || [])[1];
    if (!fileUrl) throw new Error(`no font file in Google Fonts response for ${family}`);
    const file = await (await fetch(fileUrl)).arrayBuffer();
    return `@font-face{font-family:'${family}';font-weight:${weight};`
      + `src:url(data:font/woff2;base64,${toBase64(file)}) format('woff2')}`;
  })();
  cache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
}

// usage: { pixel: 'all text set in the pixel font', mono: '...', monoBold: '...' }
export async function fontCss(usage) {
  const faces = await Promise.all(Object.entries(usage).map(async ([key, text]) => {
    if (!text) return '';
    try {
      return await fetchFace(key, text);
    } catch (error) {
      console.warn(`font ${key} could not be embedded, falling back to system fonts:`, error.message);
      return '';
    }
  }));
  return faces.join('');
}
