import { W, esc, Glyphs, windowFrame, chip, svgDoc } from '../svg.js';
import { icons } from '../icons.js';

// items are names ("react") or { name, icon, color }. Known names get a
// bundled icon, others are looked up on simple-icons, else a colour square.
export const defaults = {
  title: 'tech stack',
  right: '{count} things i use',
  groups: [
    { label: 'languages', items: ['javascript', 'typescript', 'python'] },
    { label: 'frameworks', items: ['react', 'next.js', 'node.js'] }
  ]
};

const ALIASES = {
  'next.js': 'nextjs', next: 'nextjs', 'node.js': 'nodejs', node: 'nodejs', js: 'javascript', ts: 'typescript',
  'raspberry pi': 'raspberrypi', mariadb: 'mysql', html5: 'html', css3: 'css', 'tailwind css': 'tailwind', tailwindcss: 'tailwind'
};

const remote = new Map();

function slug(name) {
  return String(name).toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/[^a-z0-9]/g, '');
}

async function simpleIcon(name) {
  const key = slug(name);
  if (!remote.has(key)) {
    remote.set(key, fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${key}.svg`)
      .then(r => (r.ok ? r.text() : null))
      .catch(() => null));
  }
  return remote.get(key);
}

// Inlines an icon as a nested <svg>, recolouring black/white marks to the
// theme ink so they stay visible in both themes.
function nest(raw, size, ink) {
  const open = raw.match(/<svg[^>]*>/)[0];
  const viewBox = (open.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 24 24';
  let fill = (open.match(/\sfill="([^"]+)"/) || [])[1] || ink;
  if (/^#(fff|ffffff|000|000000)$/i.test(fill)) fill = ink;
  const inner = raw.slice(raw.indexOf(open) + open.length, raw.lastIndexOf('</svg>')).replace(/<title>[\s\S]*?<\/title>/g, '');
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}">${inner}</svg>`;
}

function hashColor(name, t) {
  const palette = [t.accent, t.accent2, '#3fbfb8', '#e0b34a', '#6fb3ff'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

async function iconFor(item, t) {
  const size = 13;
  const key = (item.icon || ALIASES[item.name.toLowerCase()] || item.name).toLowerCase();
  if (!item.color) {
    if (icons[key]) return nest(icons[key], size, t.ink);
    const fetched = await simpleIcon(item.icon || item.name);
    if (fetched) return nest(fetched, size, t.ink);
  }
  return `<rect x="2" y="2" width="9" height="9" fill="${item.color || hashColor(item.name, t)}" stroke="${t.line}"/>`;
}

export async function render(t, o) {
  const g = new Glyphs();
  const labelW = 128;
  const rowH = 32;
  const innerW = W - 6;
  const groups = o.groups.filter(group => group.items && group.items.length);
  let y = 16;
  let body = '';
  let index = 0;

  for (const [gi, group] of groups.entries()) {
    body += `<text class="px soft" x="16" y="${y + 15}" font-size="13">${esc(g.add('pixel', group.label || ''))}</text>`
      + `<text class="px acc" x="${labelW - 16}" y="${y + 15}" font-size="13">${esc(g.add('pixel', '›'))}</text>`;
    let x = labelW;
    for (const raw of group.items) {
      const item = typeof raw === 'string' ? { name: raw } : raw;
      const iconSvg = await iconFor(item, t);
      const c = chip(g, t, { x: 0, y: 0, text: item.name, size: 11.5, h: 22, iconSvg, iconSize: 13 });
      if (x + c.w > innerW - 14) { x = labelW; y += rowH - 4; }
      body += `<g class="pop" style="animation-delay:${(0.08 * index).toFixed(2)}s"><g transform="translate(${x} ${y})">${c.svg}</g></g>`;
      x += c.w + 7;
      index++;
    }
    y += rowH;
    if (gi < groups.length - 1) {
      body += `<line x1="16" y1="${y - 5}" x2="${innerW - 16}" y2="${y - 5}" stroke="${t.line}" stroke-width="1" stroke-dasharray="2 4"/>`;
      y += 6;
    }
  }

  const H = y + 26 + 10 + 6;
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: String(o.right || '').replace('{count}', index), dashed: true, body });
  const css = '.pop{animation:pop .45s cubic-bezier(.2,.9,.3,1.3) both}'
    + '@keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';

  const names = groups.map(group => `${group.label}: ${group.items.map(i => (typeof i === 'string' ? i : i.name)).join(', ')}`).join('; ');
  return svgDoc(g, t, { w: W, h: H, css, body: frame, label: `${o.title}. ${names}` });
}
