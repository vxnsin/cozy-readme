import { W, esc, truncate, Glyphs, windowFrame, chip, svgDoc, placeholder, TITLE_H } from '../svg.js';

export const defaults = {
  title: 'contributors',
  right: '{count} people ♡',
  count: 20,
  empty: 'just me so far (￣▽￣)ノ'
};

const TILE = 60;
const GAP = 22;

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const people = data.repo ? data.repo.contributors.slice(0, o.count) : [];
  const innerW = W - 6;
  const pad = 16;
  let body = '';
  let H;
  let defs = '';

  if (!people.length) {
    H = 110;
    body = placeholder(g, innerW, 50, o.empty);
  } else {
    const perRow = Math.floor((innerW - pad * 2 + GAP) / (TILE + GAP));
    const rows = Math.ceil(people.length / perRow);
    const rowH = TILE + 40;
    defs = `<clipPath id="tile"><rect width="${TILE}" height="${TILE}"/></clipPath>`;
    people.forEach((p, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, people.length - row * perRow);
      const rowW = inRow * TILE + (inRow - 1) * GAP;
      const x = Math.round((innerW - rowW) / 2 + col * (TILE + GAP));
      const y = pad + row * rowH;
      const avatar = p.avatarDataUri || p.avatar;
      const count = String(p.contributions);
      const c = chip(g, t, { x: 0, y: 0, text: count, size: 9.5, h: 15, font: 'pixel' });
      body += `<g class="pop" style="animation-delay:${(0.06 * i).toFixed(2)}s"><g transform="translate(${x} ${y})">`
        + `<rect x="3" y="3" width="${TILE}" height="${TILE}" fill="${t.line}"/>`
        + `<rect width="${TILE}" height="${TILE}" fill="${t.paper2}"/>`
        + (avatar
          ? `<image width="${TILE}" height="${TILE}" clip-path="url(#tile)" href="${esc(avatar)}" xlink:href="${esc(avatar)}"/>`
          : `<text class="px acc2" x="${TILE / 2}" y="${TILE / 2 + 11}" font-size="30" text-anchor="middle">${esc(g.add('pixel', p.login.slice(0, 1).toUpperCase()))}</text>`)
        + `<rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" stroke="${t.line}"/>`
        + chip(g, t, { x: TILE - c.w + 4, y: TILE - 11, text: count, size: 9.5, h: 15, font: 'pixel', color: t.accent }).svg
        + `<text class="mo ink" x="${TILE / 2}" y="${TILE + 22}" font-size="10.5" text-anchor="middle">${esc(g.add('mono', truncate(p.login, TILE + GAP - 4, 10.5)))}</text>`
        + `</g></g>`;
    });
    H = TITLE_H + pad + rows * rowH + 6;
  }

  const right = String(o.right || '').replace('{count}', people.length);
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right, dashed: true, body });
  const css = '.pop{animation:pop .45s cubic-bezier(.2,.9,.3,1.3) both}@keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
  return svgDoc(g, t, { w: W, h: H, css, defs, body: frame, label: `${o.title}: ${people.map(p => p.login).join(', ')}` });
}

export const alt = (o, { data }) => `${o.title}: ${(data.repo ? data.repo.contributors.slice(0, o.count) : []).map(p => p.login).join(', ')}`;
