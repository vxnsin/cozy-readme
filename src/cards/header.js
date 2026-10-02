import { W, esc, textWidth, rng, Glyphs, windowFrame, starPattern, sparkle, svgDoc, chip, TITLE_H } from '../svg.js';

export const defaults = {
  title: 'welcome',
  right: '(￣▽￣)ノ',
  wordmark: 'my.site',
  subtitle: '',
  typewriter: ['a developer', 'an anime enthusiast'],
  chips: [],
  hint: 'scroll down, there is more ↓',
  effect: 'sakura' // sakura | snow | leaves | none
};

// SMIL keyframes for a typewriter: one clip rect per line plus the cursor x,
// all on a shared timeline.
function typewriter(lines, charW) {
  const TYPE = 0.08;
  const HOLD = 1.8;
  const ERASE = 0.035;
  const PAUSE = 0.35;
  const frames = [];
  let t = 0;
  lines.forEach((line, index) => {
    const length = [...line].length;
    for (let c = 0; c <= length; c++) {
      frames.push({ t, line: index, chars: c });
      t += c === length ? HOLD : TYPE;
    }
    for (let c = length - 1; c >= 0; c--) {
      frames.push({ t, line: index, chars: c });
      t += c === 0 ? PAUSE : ERASE;
    }
  });
  const dur = t.toFixed(2);
  const keyTimes = frames.map(f => (f.t / t).toFixed(5)).join(';');
  const widths = lines.map((_, index) => frames.map(f => (f.line === index ? f.chars * charW : 0)).join(';'));
  const cursor = frames.map(f => f.chars * charW);
  return { dur, keyTimes, widths, cursor };
}

function particle(effect, t, rand) {
  if (effect === 'snow') {
    const s = Math.round(2 + rand() * 2);
    return `<rect width="${s}" height="${s}" fill="${t.name === 'dark' ? '#ffffff' : t.accent2}" fill-opacity="${(0.5 + rand() * 0.4).toFixed(2)}"/>`;
  }
  const scale = (0.6 + rand() * 0.7).toFixed(2);
  const color = effect === 'leaves' ? [t.accent, t.accent2][Math.floor(rand() * 2)] : t.accent;
  const d = effect === 'leaves' ? 'M0 4C2 0 7 0 9 4C7 8 2 8 0 4Z' : 'M0 0C5 0 8 3 8 8C3 8 0 5 0 0Z';
  return `<path d="${d}" fill="${color}" fill-opacity="${(0.45 + rand() * 0.35).toFixed(2)}" transform="scale(${scale})"/>`;
}

export async function render(t, o) {
  const g = new Glyphs();
  const rand = rng(7);
  const H = o.chips.length ? 262 : 230;
  const innerW = W - 6;
  const bodyH = H - 6 - TITLE_H;
  const bgW = innerW - 3;
  const bgH = bodyH - 1.5;
  const lines = o.typewriter.filter(Boolean);

  const defs = starPattern(t)
    + `<radialGradient id="glow1" cx="8%" cy="-5%" r="70%"><stop offset="0" stop-color="${t.glow1}"/><stop offset="0.65" stop-color="${t.glow1}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="glow2" cx="100%" cy="12%" r="55%"><stop offset="0" stop-color="${t.glow2}"/><stop offset="0.65" stop-color="${t.glow2}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="glow3" cx="55%" cy="108%" r="45%"><stop offset="0" stop-color="${t.glow1}"/><stop offset="0.65" stop-color="${t.glow1}" stop-opacity="0"/></radialGradient>`
    + `<clipPath id="bodyClip"><rect x="1.5" y="0" width="${bgW}" height="${bgH}"/></clipPath>`;

  const bg = ['bg', 'url(#glow1)', 'url(#glow2)', 'url(#glow3)', 'url(#stars)']
    .map(fill => `<rect x="1.5" y="0" width="${bgW}" height="${bgH}" fill="${fill === 'bg' ? t.bg : fill}"/>`).join('');

  // twinkling sparkles, kept away from the text in the middle
  let twinkles = '';
  for (let i = 0; i < 16; i++) {
    let x;
    do { x = Math.round(20 + rand() * (W - 40)); } while (x > 230 && x < 610);
    const y = Math.round(18 + rand() * (bodyH - 36));
    const color = [t.accent, t.accent2, t.star][i % 3];
    twinkles += sparkle(x, y, color, 'tw', `animation-duration:${(2 + rand() * 2.5).toFixed(2)}s;animation-delay:-${(rand() * 3).toFixed(2)}s`);
  }

  let particles = '';
  if (o.effect !== 'none') {
    for (let i = 0; i < (o.effect === 'snow' ? 26 : 12); i++) {
      const x = Math.round(rand() * W);
      particles += `<g transform="translate(${x} -14)"><g class="fall" style="animation-duration:${(7 + rand() * 7).toFixed(2)}s;animation-delay:-${(rand() * 14).toFixed(2)}s">`
        + `<g class="sway" style="animation-duration:${(2 + rand() * 2).toFixed(2)}s">${particle(o.effect, t, rand)}</g></g></g>`;
    }
  }

  // wordmark: the last dot is pulled in tight and coloured, like vensin.dev
  const size = 50;
  const half = size / 2;
  const word = String(o.wordmark);
  const dot = word.lastIndexOf('.');
  const before = dot > 0 ? word.slice(0, dot) : word;
  const after = dot > 0 ? word.slice(dot + 1) : '';
  const beforeW = textWidth(before, size, 'pixel');
  const afterW = textWidth(after, size, 'pixel');
  const wordW = dot > 0 ? beforeW + half - 0.31 * size + afterW : beforeW;
  const wx = (W - wordW) / 2;
  const wy = 98;
  g.add('pixel', word);
  let wordmark = `<g class="px" font-size="${size}"><text x="${wx}" y="${wy}" fill="${t.ink}">${esc(before)}</text>`;
  if (dot > 0) {
    wordmark += `<text x="${wx + beforeW - 0.03 * size}" y="${wy}" fill="${t.accent}">.</text>`
      + `<text x="${wx + beforeW + half - 0.31 * size}" y="${wy}" fill="${t.ink}">${esc(after)}</text>`;
  }
  wordmark += '</g>';

  // "subtitle · " + typewriter
  const lineSize = 15;
  const charW = lineSize / 2;
  const prefix = o.subtitle ? `${o.subtitle} · ` : '';
  const prefixW = textWidth(prefix, lineSize, 'pixel');
  const average = lines.length ? lines.reduce((sum, l) => sum + textWidth(l, lineSize, 'pixel'), 0) / lines.length : 0;
  const lx = Math.round((W - prefixW - average) / 2);
  const ly = 134;
  const tx = lx + prefixW;
  let typed = '';
  if (lines.length) {
    const tw = typewriter(lines, charW);
    g.add('pixel', lines.join('') + '▌');
    lines.forEach((line, index) => {
      typed += `<clipPath id="tw${index}"><rect x="${tx}" y="${ly - 16}" width="0" height="22">`
        + `<animate attributeName="width" values="${tw.widths[index]}" keyTimes="${tw.keyTimes}" dur="${tw.dur}s" calcMode="discrete" repeatCount="indefinite"/>`
        + `</rect></clipPath>`
        + `<text class="px ink" x="${tx}" y="${ly}" font-size="${lineSize}" clip-path="url(#tw${index})">${esc(line)}</text>`;
    });
    typed += `<g class="blink"><text class="px acc" x="${tx}" y="${ly}" font-size="${lineSize}">▌`
      + `<animate attributeName="x" values="${tw.cursor.map(v => (tx + v).toFixed(1)).join(';')}" keyTimes="${tw.keyTimes}" dur="${tw.dur}s" calcMode="discrete" repeatCount="indefinite"/>`
      + `</text></g>`;
  }
  const prefixSvg = prefix
    ? `<text class="px" x="${lx}" y="${ly}" font-size="${lineSize}"><tspan fill="${t.accent2}">${esc(g.add('pixel', o.subtitle))}</tspan><tspan fill="${t.inkSoft}">${g.add('pixel', ' · ')}</tspan></text>`
    : '';

  let chips = '';
  if (o.chips.length) {
    const fontOf = text => (/[^\x00-ɏ]/.test(text) ? 'pixel' : 'mono');
    const widths = o.chips.map(text => chip(g, t, { x: 0, y: 0, text, size: 11, font: fontOf(text) }).w);
    let cx = (W - (widths.reduce((a, b) => a + b, 0) + 10 * (widths.length - 1))) / 2;
    o.chips.forEach((text, i) => {
      const c = chip(g, t, { x: cx, y: 160, text, size: 11, font: fontOf(text), color: i === 0 ? t.accent : t.ink });
      chips += `<g class="pop" style="animation-delay:${0.6 + i * 0.15}s">${c.svg}</g>`;
      cx += c.w + 10;
    });
  }

  const hint = o.hint ? `<g class="bob"><text class="px soft" x="${W / 2}" y="${bodyH - 10}" font-size="11" text-anchor="middle">${esc(g.add('pixel', o.hint))}</text></g>` : '';
  const body = `<g clip-path="url(#bodyClip)">${bg}${twinkles}${particles}</g>${wordmark}${prefixSvg}${typed}${chips}${hint}`;
  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: o.right, body });

  const css = '.tw{animation:twinkle 3s ease-in-out infinite}@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:1}}'
    + `.fall{animation:fall 10s linear infinite}@keyframes fall{from{transform:translateY(0) rotate(0deg)}to{transform:translateY(${H + 20}px) rotate(320deg)}}`
    + '.sway{animation:sway 3s ease-in-out infinite alternate}@keyframes sway{from{transform:translateX(-14px)}to{transform:translateX(14px)}}'
    + '.pop{animation:pop .5s ease-out both}@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
    + '.bob{animation:bob 2.4s ease-in-out infinite}@keyframes bob{50%{transform:translateY(3px)}}';

  const label = [o.wordmark, o.subtitle, ...lines].filter(Boolean).join(', ');
  return svgDoc(g, t, { w: W, h: H, css, defs, body: frame, label });
}

export const alt = o => [o.wordmark, o.subtitle, ...o.typewriter].filter(Boolean).join(' · ');
