import { W, esc, truncate, wrap, Glyphs, windowFrame, svgDoc } from '../svg.js';

// Text fields can use {years}, {since}, {anime.latest}, {github.lastPush} ...
export const defaults = {
  title: 'about.txt',
  right: 'lowercase only',
  heading: 'welcome to my github _(:з)∠)_',
  paragraphs: ['hi, i\'m a developer.'],
  signoff: 'love, me.',
  signoffKaomoji: '(｡･ω･｡)',
  status: {
    title: 'status',
    right: 'live-ish',
    rows: [
      { label: 'watching', value: '{anime.latest}' },
      { label: 'last push', value: '{github.lastPush}' },
      { label: 'mood', moods: ['(￣▽￣)ノ', 'ヽ(>∀<☆)ノ', '(￣o￣) zzZ'] }
    ],
    yearProgress: true
  }
};

const LEFT_FULL = 834;
const RIGHT_W = 286;
const GAP = 12;

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const now = data.now;
  const status = o.status && (o.status.rows || []).length ? o.status : null;
  const leftW = status ? LEFT_FULL - RIGHT_W - GAP : LEFT_FULL;

  // left: about.txt
  const textSize = 12.5;
  const lineH = 20;
  let y = 30;
  let left = '';
  if (o.heading) {
    left += `<text class="px acc" x="16" y="${y}" font-size="18">${esc(g.add('pixel', truncate(o.heading, leftW - 32, 18, 'pixel')))}</text>`;
    y += 26;
  } else {
    y = 24;
  }
  for (const para of o.paragraphs.filter(Boolean)) {
    for (const line of wrap(para, leftW - 34, textSize)) {
      left += `<text class="mo ink" x="16" y="${y}" font-size="${textSize}">${esc(g.add('mono', line))}</text>`;
      y += lineH;
    }
    y += 6;
  }
  if (o.signoff || o.signoffKaomoji) {
    left += `<text class="px" x="16" y="${y + 4}" font-size="13"><tspan fill="${t.inkSoft}">${esc(g.add('pixel', o.signoff ? `${o.signoff} ` : ''))}</tspan>`
      + `<tspan fill="${t.accent2}">${esc(g.add('pixel', o.signoffKaomoji || ''))}</tspan></text>`;
    y += 22;
  }
  const leftH = y + 26;

  // right: status rows, a mood row cycles through kaomoji
  let right = '';
  let rightH = 0;
  let moodCount = 0;
  if (status) {
    let ry = 30;
    const valueX = 96;
    for (const row of status.rows) {
      right += `<text class="px soft" x="14" y="${ry}" font-size="12">${esc(g.add('pixel', truncate(row.label || '', valueX - 22, 12, 'pixel')))}</text>`;
      if (row.moods && row.moods.length) {
        moodCount = row.moods.length;
        const step = 2.2;
        const dur = moodCount * step;
        row.moods.forEach((mood, i) => {
          right += `<text class="px acc2 mood m${i}" x="${valueX}" y="${ry}" font-size="13" style="animation-delay:${(i * step - dur).toFixed(1)}s;animation-duration:${dur.toFixed(1)}s">${esc(g.add('pixel', mood))}</text>`;
        });
      } else {
        const shown = truncate(row.value || '', RIGHT_W - valueX - 14, 12);
        right += `<text class="mo ink" x="${valueX}" y="${ry}" font-size="12">${esc(g.add('mono', shown))}</text>`;
      }
      ry += 26;
    }
    if (status.yearProgress) {
      right += `<line x1="14" y1="${ry - 10}" x2="${RIGHT_W - 14}" y2="${ry - 10}" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      const share = (now - start) / (end - start);
      const barW = RIGHT_W - 28;
      ry += 10;
      right += `<text class="px soft" x="14" y="${ry}" font-size="12">${esc(g.add('pixel', `${now.getFullYear()} progress`))}</text>`
        + `<text class="px acc" x="${RIGHT_W - 14}" y="${ry}" font-size="12" text-anchor="end">${esc(g.add('pixel', `${Math.floor(share * 100)}%`))}</text>`;
      ry += 9;
      right += `<rect x="14.5" y="${ry + 0.5}" width="${barW - 1}" height="7" fill="${t.paper2}" stroke="${t.line}"/>`
        + `<rect class="grow" x="15" y="${ry + 1}" width="${Math.max(1, (barW - 2) * share).toFixed(1)}" height="6" fill="${t.accent}"/>`;
      ry += 26;
    } else {
      ry -= 8;
    }
    rightH = ry + 26;
  }

  const H = Math.max(leftH, rightH) + 6;
  const body = windowFrame(g, t, { w: leftW, h: H - 6, title: o.title, right: o.right, body: left })
    + (status ? windowFrame(g, t, { x: leftW + GAP, w: RIGHT_W, h: H - 6, title: status.title, right: status.right, body: right }) : '');

  const css = `.mood{opacity:0;animation:mood 6s steps(1,end) infinite}`
    + `@keyframes mood{0%{opacity:1}${(100 / Math.max(1, moodCount)).toFixed(2)}%{opacity:0}}`
    + '.grow{transform-box:fill-box;transform-origin:left;animation:grow 1.6s cubic-bezier(.2,.8,.2,1) both .3s}'
    + '@keyframes grow{from{transform:scaleX(0)}}'
    + '@media (prefers-reduced-motion:reduce){.mood{opacity:0}.m0{opacity:1}}';

  return svgDoc(g, t, { w: W, h: H, css, body, label: [o.heading, ...o.paragraphs].filter(Boolean).join(' ') });
}
