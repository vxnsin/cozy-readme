import { W, esc, truncate, Glyphs, windowFrame, chip, svgDoc, placeholder, TITLE_H } from '../svg.js';
import { episodeLabel } from '../util.js';

export const defaults = {
  title: 'recently watched',
  right: '{count} series · synced from {source}',
  newBadge: '● new',
  empty: 'nothing on the list right now (￣o￣) zzZ',
  speed: 3.6 // seconds per poster
};

const COVER_W = 104;
const COVER_H = 156;
const GAP = 18;
const ITEM_W = COVER_W + GAP;

function renderItem(g, t, o, entry, index) {
  const x = index * ITEM_W;
  const meta = episodeLabel(entry);
  const cover = entry.coverDataUri || entry.cover;
  let out = `<g transform="translate(${x} 0)">`
    + `<rect x="2" y="2" width="${COVER_W}" height="${COVER_H}" fill="${t.line}"/>`
    + `<rect width="${COVER_W}" height="${COVER_H}" fill="${t.paper2}"/>`
    + (cover ? `<image width="${COVER_W}" height="${COVER_H}" preserveAspectRatio="xMidYMid slice" href="${esc(cover)}" xlink:href="${esc(cover)}"/>` : '')
    + `<rect x="0.5" y="0.5" width="${COVER_W - 1}" height="${COVER_H - 1}" stroke="${t.line}" stroke-width="1"/>`;

  if (meta) out += chip(g, t, { x: 5, y: COVER_H - 21, text: meta, size: 10, h: 16, font: 'pixel' }).svg;
  if (index === 0 && o.newBadge) {
    const w = chip(g, t, { x: 0, y: 0, text: o.newBadge, size: 10, h: 16, font: 'pixel' }).w;
    out += `<g class="blink">${chip(g, t, { x: COVER_W - w - 5, y: 5, text: o.newBadge, size: 10, h: 16, font: 'pixel', color: t.accent }).svg}</g>`;
  }
  out += `<text class="mb ink" x="0" y="${COVER_H + 18}" font-size="11">${esc(g.add('monoBold', truncate(entry.title, COVER_W + 4, 11)))}</text>`;
  return `${out}</g>`;
}

export async function render(t, o, { data, config }) {
  const g = new Glyphs();
  const entries = data.anime || [];
  const innerW = W - 6;
  const pad = 16;
  const stripH = COVER_H + 26;
  const H = TITLE_H + pad + stripH + 10 + 6;
  const source = (config.anime && config.anime.source) || 'anime';

  let body;
  let defs = '';
  let css = '';
  if (entries.length === 0) {
    body = placeholder(g, innerW, (H - TITLE_H) / 2, o.empty);
  } else {
    const trackWidth = entries.length * ITEM_W;
    const items = entries.map((entry, index) => renderItem(g, t, o, entry, index)).join('');
    const viewW = innerW - pad * 2 + 6;
    defs = `<clipPath id="view"><rect x="0" y="-2" width="${viewW}" height="${stripH + 4}"/></clipPath>`
      + `<linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`
      + `<linearGradient id="fadeR" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
      + `<mask id="edges"><rect x="0" y="-2" width="${viewW}" height="${stripH + 4}" fill="#fff"/><rect width="34" y="-2" height="${stripH + 4}" fill="url(#fadeL)"/><rect x="${viewW - 34}" y="-2" width="34" height="${stripH + 4}" fill="url(#fadeR)"/></mask>`
      + `<g id="strip">${items}</g>`;
    // only scroll when the posters do not fit anyway
    if (trackWidth > viewW) {
      css = `.track{animation:marquee ${(entries.length * o.speed).toFixed(1)}s linear infinite}`
        + `@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-${trackWidth}px)}}`;
      body = `<g transform="translate(${pad - 3} ${pad})"><g clip-path="url(#view)" mask="url(#edges)"><g class="track">`
        + `<use href="#strip" xlink:href="#strip"/><use href="#strip" xlink:href="#strip" x="${trackWidth}"/></g></g></g>`;
    } else {
      body = `<g transform="translate(${pad - 3} ${pad})"><use href="#strip" xlink:href="#strip"/></g>`;
    }
  }

  const right = String(o.right || '').replace('{count}', entries.length).replace('{source}', source);
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, dashed: true, right, body });
  const names = entries.map(e => [e.title, episodeLabel(e)].filter(Boolean).join(' ')).join(', ');
  return svgDoc(g, t, { w: W, h: H, css, defs, body: frame, label: `${o.title}: ${names || 'nothing right now'}` });
}

export function alt(o, { data }) {
  const names = (data.anime || []).map(e => [e.title, episodeLabel(e)].filter(Boolean).join(' ')).join(', ');
  return names ? `${o.title}: ${names}` : o.title;
}
