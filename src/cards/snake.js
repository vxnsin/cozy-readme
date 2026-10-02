import { W, Glyphs, windowFrame, svgDoc, placeholder, rng, TITLE_H } from '../svg.js';

// The action generates the snake with Platane/snk right before rendering and
// hands it over as data.snake. This card re-themes it and puts it in a window.
export const defaults = {
  title: 'snake.exe',
  right: 'eating my contributions'
};

function levels(t) {
  return t.name === 'dark'
    ? [t.paper2, `${t.accent2}55`, `${t.accent2}99`, t.accent2, t.accent]
    : [t.paper2, `${t.accent2}44`, `${t.accent2}88`, t.accent2, t.accent];
}

// snk drives all its colours through CSS variables on :root, so swapping that
// block re-themes the snake.
function recolour(svg, t) {
  const l = levels(t);
  const vars = `:root{--cb:${t.line}55;--cs:${t.accent};--ce:${t.paper2};--c0:${l[0]};`
    + l.slice(1).map((c, i) => `--c${i + 1}:${c}`).join(';') + '}';
  return svg.replace(/:root\{[^}]*\}/, vars);
}

// Used by the configurator preview, where there is no generated snake.
function sampleGrid(t) {
  const rand = rng(3);
  const l = levels(t);
  let cells = '';
  for (let x = 0; x < 53; x++) {
    for (let y = 0; y < 7; y++) {
      const r = rand();
      const level = r > 0.86 ? Math.ceil(rand() * 4) : 0;
      cells += `<rect x="${x * 16}" y="${y * 16}" width="12" height="12" rx="2" fill="${l[level]}" stroke="${t.line}55"/>`;
    }
  }
  const snake = [0, 1, 2, 3].map(i => `<rect x="${-16 * i}" y="-16" width="${12 - i}" height="${12 - i}" rx="3" fill="${t.accent}"/>`).join('');
  return `<svg viewBox="-16 -32 880 192">${cells}<g class="crawl">${snake}</g></svg>`;
}

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const innerW = W - 6;
  const source = data.snake || (data.preview ? sampleGrid(t) : null);
  let body;
  let H;
  let css = '';

  if (source) {
    // snk leaves a lot of room under the grid, trim it
    const viewBox = (source.match(/viewBox="([^"]+)"/) || [])[1] || '-16 -32 880 192';
    const [vx, vy, vw, fullH] = viewBox.split(/\s+/).map(Number);
    const vh = fullH - 44;
    const w = innerW - 20;
    const h = Math.round(w * vh / vw);
    body = recolour(source, t)
      .replace(/<svg[^>]*>/, `<svg x="10" y="6" width="${w}" height="${h}" viewBox="${vx} ${vy} ${vw} ${vh}">`)
      .replace(/<desc>[\s\S]*?<\/desc>/, '');
    H = TITLE_H + h + 10 + 6;
    css = '.crawl{animation:crawl 12s linear infinite}@keyframes crawl{to{transform:translateX(880px)}}';
  } else {
    H = 110;
    body = placeholder(g, innerW, 50, 'the snake is sleeping (￣o￣) zzZ');
  }

  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: o.right, body });
  return svgDoc(g, t, { w: W, h: H, css, body: frame, label: 'a snake eating the github contribution graph' });
}

export const alt = () => 'a snake eating my github contribution graph';
