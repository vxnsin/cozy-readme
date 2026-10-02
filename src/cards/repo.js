import { W, esc, textWidth, truncate, wrap, Glyphs, windowFrame, chip, svgDoc, sparkle, placeholder, TITLE_H } from '../svg.js';
import { ago, langColor, shortDate } from '../util.js';

// Overview of one repository: name, description, topics, counters, languages.
export const defaults = {
  title: '{repo.name}',
  right: 'public repo',
  name: '',          // defaults to the repo name
  description: '',   // defaults to the repo description
  boxes: ['stars', 'forks', 'issues', 'commits', 'watchers'],
  topics: true,
  languages: true,
  empty: 'could not load the repo (￣o￣) zzZ'
};

const BOX_LABELS = { stars: 'stars', forks: 'forks', issues: 'open issues', commits: 'commits', watchers: 'watchers', contributors: 'contributors' };

function boxValue(repo, key) {
  if (key === 'commits') return repo.commitCount;
  if (key === 'contributors') return repo.contributors.length;
  return repo[key];
}

export async function render(t, o, { data }) {
  const g = new Glyphs();
  const repo = data.repo;
  const innerW = W - 6;
  const pad = 16;
  let body = '';
  let H;

  if (!repo) {
    H = 110;
    body = placeholder(g, innerW, 50, o.empty);
  } else {
    // name with a sparkle, release / license chips on the right
    const name = o.name || repo.shortName;
    let y = 40;
    body += `<text class="px ink" x="${pad}" y="${y}" font-size="26">${esc(g.add('pixel', truncate(name, 460, 26, 'pixel')))}</text>`
      + sparkle(Math.round(pad + Math.min(460, textWidth(name, 26, 'pixel')) + 8), y - 22, t.accent, 'tw');
    const chips = [];
    if (repo.releases[0]) chips.push({ text: repo.releases[0].tag, color: t.accent });
    if (repo.license) chips.push({ text: repo.license });
    chips.push({ text: `branch: ${repo.defaultBranch}` });
    let cx = innerW - pad;
    for (const c of chips.reverse()) {
      const w = chip(g, t, { x: 0, y: 0, text: c.text, size: 11 }).w;
      cx -= w;
      body += chip(g, t, { x: cx, y: y - 17, text: c.text, size: 11, color: c.color }).svg;
      cx -= 8;
    }

    // description
    y += 24;
    const description = o.description || repo.description;
    for (const line of wrap(description, innerW - pad * 2, 12.5).slice(0, 3)) {
      body += `<text class="mo soft" x="${pad}" y="${y}" font-size="12.5">${esc(g.add('mono', line))}</text>`;
      y += 19;
    }

    // topics
    if (o.topics && repo.topics.length) {
      y += 2;
      let tx = pad;
      for (const topic of repo.topics) {
        const text = `#${topic}`;
        const w = chip(g, t, { x: 0, y: 0, text, size: 10.5, h: 18, font: 'pixel' }).w;
        if (tx + w > innerW - pad) break;
        body += chip(g, t, { x: tx, y, text, size: 10.5, h: 18, font: 'pixel', color: t.accent2, fill: t.paper }).svg;
        tx += w + 6;
      }
      y += 30;
    } else {
      y += 6;
    }

    // counters
    const boxes = o.boxes.filter(key => BOX_LABELS[key] && boxValue(repo, key) != null);
    if (boxes.length) {
      const gap = 10;
      const boxW = (innerW - pad * 2 - gap * (boxes.length - 1)) / boxes.length;
      boxes.forEach((key, i) => {
        const x = pad + i * (boxW + gap);
        body += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${boxW - 1}" height="52" fill="${t.paper2}" stroke="${t.line}" stroke-dasharray="4 3"/>`
          + `<g class="odo" style="animation-delay:${(i * 0.1).toFixed(1)}s"><text class="px acc2" x="${x + 12}" y="${y + 28}" font-size="22">${esc(g.add('pixel', Number(boxValue(repo, key)).toLocaleString('en-US')))}</text></g>`
          + `<text class="px soft" x="${x + 12}" y="${y + 43}" font-size="11">${esc(g.add('pixel', BOX_LABELS[key]))}</text>`;
      });
      y += 52 + 20;
    }

    // language bar with an inline legend
    if (o.languages && repo.languages.length) {
      const barW = innerW - pad * 2;
      let bx = pad;
      repo.languages.forEach((lang, i) => {
        const w = i === repo.languages.length - 1 ? pad + barW - bx : Math.round(barW * lang.share);
        body += `<rect class="seg" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s" x="${bx}" y="${y}" width="${Math.max(1, w)}" height="8" fill="${langColor(lang.name)}"/>`;
        bx += w;
      });
      body += `<rect x="${pad + 0.5}" y="${y + 0.5}" width="${barW - 1}" height="7" stroke="${t.line}"/>`;
      y += 26;
      let lx = pad;
      for (const lang of repo.languages) {
        const label = `${lang.name.toLowerCase()} ${(lang.share * 100).toFixed(1)}%`;
        const w = 15 + textWidth(label, 11) + 18;
        if (lx + w > innerW - pad) break;
        body += `<rect x="${lx}" y="${y - 8}" width="9" height="9" fill="${langColor(lang.name)}" stroke="${t.line}"/>`
          + `<text class="mo ink" x="${lx + 15}" y="${y}" font-size="11">${esc(g.add('mono', label))}</text>`;
        lx += w;
      }
      y += 14;
    }

    const meta = [`created ${shortDate(repo.createdAt)}`, `last push ${ago(repo.pushedAt, data.now)}`, repo.homepage].filter(Boolean).join(' · ');
    y += 14;
    body += `<line x1="${pad}" y1="${y - 14}" x2="${innerW - pad}" y2="${y - 14}" stroke="${t.line}" stroke-dasharray="2 4"/>`
      + `<text class="px soft" x="${pad}" y="${y + 4}" font-size="11">${esc(g.add('pixel', truncate(meta, innerW - pad * 2, 11, 'pixel')))}</text>`;
    H = TITLE_H + y + 20 + 6;
  }

  const frame = windowFrame(g, t, { w: innerW, h: H - 6, title: o.title, right: o.right, body });
  const css = '.odo{animation:odo .5s cubic-bezier(.2,.8,.2,1) both}@keyframes odo{from{transform:translateY(10px);opacity:0}}'
    + '.seg{transform-box:fill-box;transform-origin:left;animation:grow .6s ease-out both}@keyframes grow{from{transform:scaleX(0)}}'
    + '.tw{animation:tw 2.4s ease-in-out infinite}@keyframes tw{50%{opacity:.15}}';
  const label = repo ? `${repo.name}: ${repo.description} ${repo.stars} stars, ${repo.forks} forks` : o.title;
  return svgDoc(g, t, { w: W, h: H, css, body: frame, label });
}

export const alt = (o, { data }) => (data.repo ? `${data.repo.name}: ${data.repo.description}` : o.title);
