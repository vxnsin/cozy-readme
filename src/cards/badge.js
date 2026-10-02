import { esc, Glyphs, svgDoc } from '../svg.js';

// Classic 88x31 web buttons, drawn crisp with a dashed inner border and a
// shine that sweeps across every few seconds.
export const defaults = { top: 'my', bottom: 'site', mark: '☆', color: '#e2789b', link: '' };
export const inline = true;
export const width = () => 88;

export async function render(t, o, { index = 0 } = {}) {
  const g = new Glyphs();
  const c = { bg: t.paper, line: t.line, ink: t.ink };
  const delay = ((index % 7) * 0.6).toFixed(1);
  g.add('pixel', `${o.top}${o.bottom}${o.mark}`);
  const defs = `<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>`
    + `<stop offset=".5" stop-color="#fff" stop-opacity="${t.name === 'dark' ? 0.22 : 0.6}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<clipPath id="c"><rect width="88" height="31"/></clipPath>`;
  const body = `<g shape-rendering="crispEdges">`
    + `<rect width="88" height="31" fill="${c.bg}"/>`
    + `<rect x="0.5" y="0.5" width="87" height="30" stroke="${c.line}"/>`
    + `<rect x="2.5" y="2.5" width="83" height="26" stroke="${c.line}" stroke-dasharray="2 1"/>`
    + `<rect x="5" y="5" width="21" height="21" fill="${esc(o.color)}"/>`
    + `</g>`
    + `<text class="px" x="15.5" y="20" font-size="14" text-anchor="middle" fill="#fff">${esc(o.mark)}</text>`
    + `<text class="px" x="31" y="14" font-size="10" fill="${c.ink}">${esc(o.top)}</text>`
    + `<text class="px" x="31" y="25" font-size="9" fill="${esc(o.color)}">${esc(o.bottom)}</text>`
    + `<g clip-path="url(#c)"><rect class="shine" x="-30" y="-10" width="24" height="51" fill="url(#shine)" style="animation-delay:${delay}s"/></g>`;
  const css = '.shine{animation:shine 5s ease-in-out infinite}'
    + '@keyframes shine{0%,70%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(150px) skewX(-20deg)}}';
  return svgDoc(g, t, { w: 88, h: 31, css, defs, body, label: `${o.top} ${o.bottom}` });
}

export const alt = o => `${o.top} ${o.bottom}`;
