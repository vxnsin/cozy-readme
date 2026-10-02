import { W, esc, textWidth, Glyphs, windowFrame, svgDoc, sparkle, glowFilter } from '../svg.js';
import { counter } from '../theme.js';
import { hitCounter, counterCss } from './stats.js';

export const defaults = {
  title: 'bye bye',
  right: '(￣▽￣)ノ',
  wordmark: 'my.site',
  text: '© {year} me. all the bugs are mine.',
  note: 'last rebuilt {date} · thanks for stopping by ☆',
  counterLabel: 'days spent coding',
  counterSince: '' // date; empty hides the counter
};

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const H = 112;
  const innerW = W - 6;
  const size = 22;
  const word = String(o.wordmark);
  const dot = word.lastIndexOf('.');
  g.add('pixel', word);

  let body;
  if (dot > 0) {
    const before = word.slice(0, dot);
    const bw = textWidth(before, size, 'pixel');
    body = `<g class="px" font-size="${size}"><text x="16" y="38" fill="${t.ink}">${esc(before)}</text>`
      + `<text x="${16 + bw - 0.03 * size}" y="38" fill="${t.accent}">.</text>`
      + `<text x="${16 + bw + size / 2 - 0.31 * size}" y="38" fill="${t.ink}">${esc(word.slice(dot + 1))}</text></g>`;
  } else {
    body = `<text class="px ink" x="16" y="38" font-size="${size}">${esc(word)}</text>`;
  }
  body += sparkle(Math.round(16 + textWidth(word, size, 'pixel') + 6), 22, t.accent2, 'tw')
    + `<text class="mo soft" x="16" y="60" font-size="11">${esc(g.add('mono', o.text))}</text>`
    + `<text class="px soft" x="16" y="76" font-size="10">${esc(g.add('pixel', o.note))}</text>`;

  const since = o.counterSince ? new Date(o.counterSince) : null;
  let days = null;
  if (since && !Number.isNaN(since.getTime())) {
    days = Math.max(0, Math.floor((data.now - since) / 86400000));
    const hc = hitCounter(g, t, days, Math.max(5, String(days).length));
    const cx = innerW - 16 - hc.w;
    body += `<text class="px soft" x="${cx - 10}" y="44" font-size="11" text-anchor="end">${esc(g.add('pixel', o.counterLabel))}</text>`
      + `<g transform="translate(${cx} 26)">${hc.svg}</g>`;
  }

  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: o.right, dashed: true, body });
  const css = '.tw{animation:tw 2.4s ease-in-out infinite}@keyframes tw{50%{opacity:.15}}' + counterCss;
  const label = [o.wordmark, o.text, days != null ? `${days} ${o.counterLabel}` : ''].filter(Boolean).join(', ');
  return svgDoc(g, t, { w: W, h: H, css, defs: glowFilter(counter.glow), body: frame, label });
}
