import { W, esc, truncate, textWidth, Glyphs, windowFrame, svgDoc, glowFilter, placeholder, TITLE_H } from '../svg.js';
import { counter } from '../theme.js';
import { ago } from '../util.js';
import { hitCounter, counterCss } from './stats.js';

// A terminal-ish "git log" of the latest commits, with the weekly commit
// activity of the last year above it.
export const defaults = {
  title: 'git log',
  right: '{repo.branch} · {repo.commits} commits',
  prompt: '$ git log --oneline',
  chart: true,
  chartTitle: 'commits · last 52 weeks',
  counter: true,
  count: 6,
  empty: 'no commits to show (￣o￣) zzZ'
};

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const repo = data.repo;
  const innerW = W - 6;
  const pad = 16;
  let body = '';
  let H;

  if (!repo || !repo.commits.length) {
    H = 110;
    body = placeholder(g, innerW, 50, o.empty);
  } else {
    let y = pad;
    const weeks = repo.weeks || [];
    if (o.chart && weeks.length) {
      body += `<text class="px ink" x="${pad}" y="${y + 16}" font-size="13">${esc(g.add('pixel', o.chartTitle))}</text>`;
      if (o.counter && repo.commitCount != null) {
        const hc = hitCounter(g, t, repo.commitCount, Math.max(6, String(repo.commitCount).length));
        body += `<g transform="translate(${innerW - pad - hc.w} ${y})">${hc.svg}</g>`;
      }
      const top = y + 34;
      const chartW = innerW - pad * 2;
      const chartH = 50;
      const max = Math.max(1, ...weeks);
      const step = chartW / weeks.length;
      const barW = Math.max(2, step - 3);
      weeks.forEach((count, i) => {
        const x = pad + i * step;
        if (count === 0) {
          body += `<rect x="${x.toFixed(1)}" y="${top + chartH - 2}" width="${barW.toFixed(1)}" height="2" fill="${t.line}"/>`;
          return;
        }
        const h = Math.max(3, Math.round(Math.sqrt(count / max) * chartH));
        body += `<rect class="bar" style="animation-delay:${(0.3 + i * 0.015).toFixed(3)}s" x="${x.toFixed(1)}" y="${top + chartH - h}" width="${barW.toFixed(1)}" height="${h}" fill="${i === weeks.length - 1 ? t.accent : t.accent2}"/>`;
      });
      body += `<line x1="${pad}" y1="${top + chartH + 1}" x2="${pad + chartW}" y2="${top + chartH + 1}" stroke="${t.line}" stroke-dasharray="3 3"/>`;
      y = top + chartH + 22;
    }

    // the log itself, on a darker "terminal" panel
    const rows = repo.commits.slice(0, o.count);
    const rowH = 22;
    const panelH = 30 + rows.length * rowH + 8;
    body += `<rect x="${pad + 0.5}" y="${y + 0.5}" width="${innerW - pad * 2 - 1}" height="${panelH}" fill="${t.paper2}" stroke="${t.line}"/>`
      + `<text class="px soft" x="${pad + 12}" y="${y + 21}" font-size="12">${esc(g.add('pixel', o.prompt))}</text>`;
    let ry = y + 21 + rowH + 2;
    const rightW = 190;
    rows.forEach((c, i) => {
      const meta = truncate(`${c.author} · ${ago(c.date, data.now)}`, rightW, 11);
      const msgW = innerW - pad * 2 - 24 - 74 - rightW - 16;
      body += `<g class="row" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s">`
        + `<text class="px acc" x="${pad + 12}" y="${ry}" font-size="12">${esc(g.add('pixel', i === 0 ? '●' : '○'))}</text>`
        + `<text class="px acc2" x="${pad + 28}" y="${ry}" font-size="12">${esc(g.add('pixel', c.sha))}</text>`
        + `<text class="mo ink" x="${pad + 28 + 74}" y="${ry}" font-size="12">${esc(g.add('mono', truncate(c.message, msgW, 12)))}</text>`
        + `<text class="mo soft" x="${innerW - pad - 12}" y="${ry}" font-size="11" text-anchor="end">${esc(g.add('mono', meta))}</text>`
        + `</g>`;
      ry += rowH;
    });
    const cursorX = pad + 12 + textWidth(o.prompt, 12, 'pixel') + 4;
    body += `<text class="px acc blink" x="${cursorX}" y="${y + 21}" font-size="12">${g.add('pixel', '▌')}</text>`;
    H = TITLE_H + y + panelH + pad + 6;
  }

  const right = String(o.right || '').replace(/(^|\D)1 commits\b/, '$11 commit');
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right, body });
  const css = '.bar{transform-box:fill-box;transform-origin:bottom;animation:rise .7s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{transform:scaleY(0)}}'
    + '.row{animation:row .4s ease-out both}@keyframes row{from{opacity:0;transform:translateX(-8px)}}'
    + counterCss;
  const label = repo ? `latest commits of ${repo.name}: ${repo.commits.slice(0, o.count).map(c => c.message).join('; ')}` : o.title;
  return svgDoc(g, t, { w: W, h: H, css, defs: glowFilter(counter.glow), body: frame, label });
}

export const alt = (o, { data }) => (data.repo ? `latest commits of ${data.repo.name}` : o.title);
