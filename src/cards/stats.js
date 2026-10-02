import { W, esc, truncate, Glyphs, windowFrame, svgDoc, glowFilter, placeholder, TITLE_H } from '../svg.js';
import { counter } from '../theme.js';

export const defaults = {
  title: 'github stats',
  right: '@{github.user} · updates daily',
  boxes: ['contributions', 'commits', 'repos', 'stars'],
  chartTitle: 'commit log · last 52 weeks',
  languagesTitle: 'top languages',
  counter: true,
  empty: 'the stats are napping right now (￣o￣) zzZ'
};

const BOX_LABELS = {
  contributions: 'contributions this year',
  commits: 'commits',
  repos: 'public repos',
  stars: 'stars collected',
  followers: 'followers'
};

// Glowing yellow digits in a dark bezel, the vensin.dev visitor counter look.
export function hitCounter(g, t, value, digits = 6) {
  const text = String(value).padStart(digits, '0').slice(-digits);
  const cellW = 14;
  const cellH = 20;
  const w = digits * (cellW + 2) + 4;
  let out = `<rect width="${w}" height="${cellH + 6}" rx="2" fill="${t.line}"/>`;
  [...text].forEach((digit, i) => {
    const cx = 3 + i * (cellW + 2);
    out += `<rect x="${cx}" y="3" width="${cellW}" height="${cellH}" fill="${counter.bg}"/>`
      + `<g class="odo" style="animation-delay:${(0.15 + i * 0.12).toFixed(2)}s">`
      + `<text class="px" x="${cx + cellW / 2}" y="${3 + cellH - 5}" font-size="15" text-anchor="middle" fill="${counter.digit}" filter="url(#glow)">${g.add('pixel', digit)}</text></g>`;
  });
  return { w, svg: out };
}

export const counterCss = '.odo{animation:odo .5s cubic-bezier(.2,.8,.2,1) both}@keyframes odo{from{transform:translateY(10px);opacity:0}}';

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const gh = data.github;
  const innerW = W - 6;
  const pad = 16;
  const defs = glowFilter(counter.glow);
  let body = '';
  let H;

  if (!gh) {
    H = 120;
    body = placeholder(g, innerW, 54, o.empty);
  } else {
    const boxes = o.boxes.filter(key => BOX_LABELS[key]);
    const boxGap = 10;
    const boxW = (innerW - pad * 2 - boxGap * (boxes.length - 1)) / Math.max(1, boxes.length);
    boxes.forEach((key, i) => {
      const x = pad + i * (boxW + boxGap);
      body += `<rect x="${x + 0.5}" y="${pad + 0.5}" width="${boxW - 1}" height="55" fill="${t.paper2}" stroke="${t.line}" stroke-dasharray="4 3"/>`
        + `<g class="odo" style="animation-delay:${(i * 0.1).toFixed(1)}s"><text class="px acc2" x="${x + 12}" y="${pad + 30}" font-size="24">${esc(g.add('pixel', Number(gh[key] || 0).toLocaleString('en-US')))}</text></g>`
        + `<text class="px soft" x="${x + 12}" y="${pad + 46}" font-size="11">${esc(g.add('pixel', truncate(BOX_LABELS[key], boxW - 20, 11, 'pixel')))}</text>`;
    });

    // weekly contribution bars with a counter
    const top = boxes.length ? pad + 55 + 18 : pad;
    const chartW = 500;
    const chartH = 74;
    const chartTop = top + 34;
    body += `<text class="px ink" x="${pad}" y="${top + 16}" font-size="13">${esc(g.add('pixel', o.chartTitle))}</text>`;
    if (o.counter) {
      const hc = hitCounter(g, t, gh.contributions);
      body += `<g transform="translate(${pad + chartW - hc.w} ${top})">${hc.svg}</g>`;
    }
    const weeks = gh.weeks || [];
    const max = Math.max(1, ...weeks);
    const barStep = chartW / Math.max(1, weeks.length);
    const barW = Math.max(2, barStep - 2);
    weeks.forEach((count, i) => {
      const x = pad + i * barStep;
      if (count === 0) {
        body += `<rect x="${x.toFixed(1)}" y="${chartTop + chartH - 2}" width="${barW.toFixed(1)}" height="2" fill="${t.line}"/>`;
        return;
      }
      // sqrt scale so one busy week does not flatten the rest
      const h = Math.max(3, Math.round(Math.sqrt(count / max) * chartH));
      body += `<rect class="bar" style="animation-delay:${(0.4 + i * 0.018).toFixed(3)}s" x="${x.toFixed(1)}" y="${chartTop + chartH - h}" width="${barW.toFixed(1)}" height="${h}" fill="${i === weeks.length - 1 ? t.accent : t.accent2}"/>`;
    });
    body += `<line x1="${pad}" y1="${chartTop + chartH + 1}" x2="${pad + chartW}" y2="${chartTop + chartH + 1}" stroke="${t.line}" stroke-dasharray="3 3"/>`
      + `<text class="px soft" x="${pad}" y="${chartTop + chartH + 16}" font-size="10">${esc(g.add('pixel', 'a year ago'))}</text>`
      + `<text class="px acc" x="${pad + chartW}" y="${chartTop + chartH + 16}" font-size="10" text-anchor="end">${esc(g.add('pixel', 'this week ▲'))}</text>`;

    // top languages
    const lx = pad + chartW + 28;
    const lw = innerW - lx - pad;
    body += `<text class="px ink" x="${lx}" y="${top + 16}" font-size="13">${esc(g.add('pixel', o.languagesTitle))}</text>`;
    const langs = gh.topLanguages || [];
    const totalShare = langs.reduce((s, l) => s + l.share, 0) || 1;
    const barY = top + 30;
    let bx = lx;
    langs.forEach((lang, i) => {
      const w = i === langs.length - 1 ? lx + lw - bx : Math.round(lw * lang.share / totalShare);
      body += `<rect class="seg" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s" x="${bx}" y="${barY}" width="${Math.max(1, w)}" height="8" fill="${lang.color}"/>`;
      bx += w;
    });
    body += `<rect x="${lx + 0.5}" y="${barY + 0.5}" width="${lw - 1}" height="7" stroke="${t.line}"/>`;
    langs.forEach((lang, i) => {
      const x = lx + (i % 2) * (lw / 2);
      const y = barY + 30 + Math.floor(i / 2) * 22;
      body += `<rect x="${x}" y="${y - 8}" width="9" height="9" fill="${lang.color}" stroke="${t.line}"/>`
        + `<text class="mo ink" x="${x + 15}" y="${y}" font-size="11">${esc(g.add('mono', truncate(lang.name.toLowerCase(), lw / 2 - 60, 11)))}</text>`
        + `<text class="px soft" x="${x + lw / 2 - 10}" y="${y}" font-size="11" text-anchor="end">${esc(g.add('pixel', `${(lang.share * 100).toFixed(1)}%`))}</text>`;
    });

    H = TITLE_H + chartTop + chartH + 30 + 6;
  }

  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: o.right, body });
  const css = '.bar{transform-box:fill-box;transform-origin:bottom;animation:rise .7s cubic-bezier(.2,.8,.2,1) both}'
    + '@keyframes rise{from{transform:scaleY(0)}}'
    + '.seg{transform-box:fill-box;transform-origin:left;animation:grow .6s ease-out both}'
    + '@keyframes grow{from{transform:scaleX(0)}}'
    + counterCss;

  const label = gh
    ? `${o.title}: ${gh.contributions} contributions this year, ${gh.commits} commits, ${gh.repos} public repos, ${gh.stars} stars. top languages: ${(gh.topLanguages || []).map(l => l.name).join(', ')}`
    : o.title;
  return svgDoc(g, t, { w: W, h: H, css, defs, body: frame, label });
}
