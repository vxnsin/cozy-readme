import { W, esc, truncate, Glyphs, windowFrame, chip, svgDoc, placeholder, TITLE_H } from '../svg.js';
import { ago, shortDate } from '../util.js';

export const defaults = {
  title: 'releases',
  right: 'latest {repo.release}',
  count: 4,
  latestBadge: '● latest',
  empty: 'no releases yet, soon™'
};

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const releases = data.repo ? data.repo.releases.slice(0, o.count) : [];
  const innerW = W - 6;
  const pad = 16;
  let body = '';
  let H;

  if (!releases.length) {
    H = 110;
    body = placeholder(g, innerW, 50, o.empty);
  } else {
    const rowH = 32;
    releases.forEach((r, i) => {
      const y = pad + i * rowH;
      const tag = chip(g, t, { x: pad, y, text: r.tag, size: 12, h: 22, font: 'pixel', color: i === 0 ? t.accent : t.accent2 });
      let x = pad + tag.w + 10;
      let extra = '';
      if (i === 0 && o.latestBadge) {
        const b = chip(g, t, { x, y: y + 3, text: o.latestBadge, size: 10, h: 16, font: 'pixel', color: t.accent, fill: t.accentSoft });
        extra += `<g class="blink">${b.svg}</g>`;
        x += b.w + 10;
      }
      if (r.prerelease) {
        const b = chip(g, t, { x, y: y + 3, text: 'pre', size: 10, h: 16, font: 'pixel' });
        extra += b.svg;
        x += b.w + 10;
      }
      const when = `${shortDate(r.date)} · ${ago(r.date, data.now)}`;
      const name = r.name && r.name !== r.tag ? r.name : '';
      body += `<g class="row" style="animation-delay:${(0.15 * i).toFixed(2)}s">${tag.svg}${extra}`
        + (name ? `<text class="mo ink" x="${x}" y="${y + 15}" font-size="12">${esc(g.add('mono', truncate(name, innerW - x - 200, 12)))}</text>` : '')
        + `<text class="px soft" x="${innerW - pad}" y="${y + 15}" font-size="11" text-anchor="end">${esc(g.add('pixel', when))}</text>`
        + (i < releases.length - 1 ? `<line x1="${pad}" y1="${y + rowH - 5}" x2="${innerW - pad}" y2="${y + rowH - 5}" stroke="${t.line}" stroke-dasharray="2 4"/>` : '')
        + `</g>`;
    });
    H = TITLE_H + pad + releases.length * rowH + 8 + 6;
  }

  const right = releases.length ? o.right : '';
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right, body });
  const css = '.row{animation:row .4s ease-out both}@keyframes row{from{opacity:0;transform:translateX(-8px)}}';
  return svgDoc(g, t, { w: W, h: H, css, body: frame, label: `${o.title}: ${releases.map(r => r.tag).join(', ')}` });
}

export const alt = (o, { data }) => `${o.title}: ${(data.repo ? data.repo.releases.slice(0, o.count) : []).map(r => r.tag).join(', ') || 'none yet'}`;
