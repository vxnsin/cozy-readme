import { esc, textWidth, Glyphs, svgDoc } from '../svg.js';

// .btn from vensin.dev: pixel label, 1.5px border, 2px hard shadow.
// Consecutive buttons sit on one line in the README, each with its own link.
export const defaults = { label: 'home', link: '' };
export const inline = true;

export function width(o) {
  return Math.round(textWidth(o.label, 13, 'pixel') + 28) + 2;
}

export async function render(t, o) {
  const g = new Glyphs();
  const w = width(o) - 2;
  const h = 30;
  g.add('pixel', o.label);
  const body = `<rect x="2" y="2" width="${w}" height="${h - 2}" fill="${t.line}"/>`
    + `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 3.5}" fill="${t.paper2}" stroke="${t.line}" stroke-width="1.5"/>`
    + `<text class="px ink" x="${w / 2}" y="${h / 2 + 3.5}" font-size="13" text-anchor="middle">${esc(o.label)}</text>`;
  return svgDoc(g, t, { w: w + 2, h, body, label: o.label });
}

export const alt = o => o.label;
