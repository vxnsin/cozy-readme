import { W, esc, textWidth, Glyphs, svgDoc } from '../svg.js';

export const defaults = {
  lines: ['welcome to my github', 'ヽ(>∀<☆)ノ', 'go watch more anime'],
  separator: '★',
  speed: 38 // pixels per second
};

export async function render(t, o) {
  const g = new Glyphs();
  const H = 40;
  const size = 12;
  const sep = `   ${o.separator}   `;
  const text = o.lines.filter(Boolean).join(sep) + sep;
  g.add('pixel', text);
  const trackW = textWidth(text, size, 'pixel');
  const innerW = W - 6;
  const boxH = H - 6;

  const defs = `<clipPath id="clip"><rect x="2" y="2" width="${innerW - 4}" height="${boxH - 4}"/></clipPath>`
    + `<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".05" stop-color="#fff"/><stop offset=".95" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<mask id="m"><rect width="${innerW}" height="${boxH}" fill="url(#fade)"/></mask>`;

  const runs = Math.ceil(innerW / trackW) + 1;
  let track = '';
  for (let i = 0; i < runs; i++) {
    track += `<text class="px soft" x="${(i * trackW).toFixed(1)}" y="${boxH / 2 + 4.5}" font-size="${size}">${esc(text)}</text>`;
  }

  const body = `<rect x="4" y="4" width="${innerW}" height="${boxH}" fill="${t.line}"/>`
    + `<rect x="0.75" y="0.75" width="${innerW - 1.5}" height="${boxH - 1.5}" fill="${t.paper}" stroke="${t.line}" stroke-width="1.5"/>`
    + `<g clip-path="url(#clip)" mask="url(#m)"><g class="track">${track}</g></g>`;

  const css = `.track{animation:marquee ${(trackW / o.speed).toFixed(1)}s linear infinite}`
    + `@keyframes marquee{to{transform:translateX(-${trackW.toFixed(1)}px)}}`;

  return svgDoc(g, t, { w: W, h: H, css, defs, body, label: o.lines.join(' / ') });
}
