import * as header from './cards/header.js';
import * as about from './cards/about.js';
import * as stack from './cards/stack.js';
import * as anime from './cards/anime.js';
import * as stats from './cards/stats.js';
import * as snake from './cards/snake.js';
import * as marquee from './cards/marquee.js';
import * as footer from './cards/footer.js';
import * as button from './cards/button.js';
import * as badge from './cards/badge.js';
import * as repo from './cards/repo.js';
import * as commits from './cards/commits.js';
import * as contributors from './cards/contributors.js';
import * as releases from './cards/releases.js';
import { resolveThemes, presetNames } from './theme.js';
import { fill, variables } from './util.js';
import { W } from './svg.js';

export const cardTypes = { header, about, stack, anime, stats, snake, marquee, footer, button, badge, repo, commits, contributors, releases };

// card types that need repository data (config.repo)
export const repoTypes = ['repo', 'commits', 'contributors', 'releases'];
export { presetNames, resolveThemes };
export { sampleData } from './sample.js';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

function fillDeep(value, vars) {
  if (typeof value === 'string') return fill(value, vars);
  if (Array.isArray(value)) return value.map(v => fillDeep(v, vars));
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(v, vars)]));
  return value;
}

// Gives every card an id (used as file name) and its type's defaults.
export function normalizeCards(config) {
  const used = new Set();
  return (config.cards || []).map((card, index) => {
    const type = cardTypes[card.type];
    if (!type) throw new Error(`unknown card type "${card.type}" (use ${Object.keys(cardTypes).join(', ')})`);
    let id = String(card.id || card.type).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (used.has(id)) id = `${id}-${index}`;
    used.add(id);
    return { ...merge(type.defaults, card), type: card.type, id, index };
  });
}

// Renders every card in light and dark.
// returns [{ id, type, link, inline, width, alt, svgs: { light, dark } }]
export async function renderCards(config, data) {
  const themes = resolveThemes(config.theme);
  const vars = variables(data, config);
  const cards = normalizeCards(config);
  return Promise.all(cards.map(async card => {
    const type = cardTypes[card.type];
    const options = fillDeep(card, vars);
    const ctx = { data, config, index: card.index };
    const svgs = {};
    for (const theme of themes) {
      svgs[theme.name] = await type.render(theme, options, ctx);
    }
    return {
      id: card.id,
      type: card.type,
      link: options.link || '',
      inline: Boolean(type.inline),
      width: type.width ? type.width(options) : W,
      alt: type.alt ? type.alt(options, ctx) : (options.title || card.type),
      svgs
    };
  }));
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function cardMarkup(card, src) {
  const picture = `<picture><source media="(prefers-color-scheme: dark)" srcset="${src(card, 'dark')}">`
    + `<img src="${src(card, 'light')}" width="${card.width}" alt="${escapeAttr(card.alt)}"></picture>`;
  return card.link ? `<a href="${escapeAttr(card.link)}">${picture}</a>` : picture;
}

// Code blocks and inline code are matched first so markers shown as examples
// in docs stay untouched.
const MARKER = /(```[\s\S]*?```|`[^`\n]*`)|<!--\s*cozy:([\w-]+)\s*-->(?:[\s\S]*?<!--\s*\/cozy:\2\s*-->)?/g;

export function hasMarkers(text) {
  for (const match of String(text || '').matchAll(MARKER)) if (!match[1]) return true;
  return false;
}

// Builds the README. src(card, theme) returns the image URL.
// - template: {{card:<id>}} and {{cards}} are replaced
// - existing README with <!-- cozy:<id> --> markers: only the marked spots are
//   (re)filled, everything else stays as written. "cards" means all cards.
// - otherwise the cards are stacked in order, buttons/badges share a line.
export function buildReadme(config, rendered, src, template, existing) {
  const blocks = [];
  for (const card of rendered) {
    const markup = cardMarkup(card, src);
    const last = blocks[blocks.length - 1];
    if (card.inline && last && last.inline && last.type === card.type) {
      last.parts.push(markup);
    } else {
      blocks.push({ inline: card.inline, type: card.type, parts: [markup] });
    }
  }
  const all = blocks.map(b => b.parts.join(b.type === 'badge' ? '&nbsp;' : '')).join('\n\n');
  const byId = Object.fromEntries(rendered.map(card => [card.id, cardMarkup(card, src)]));

  if (!template && hasMarkers(existing)) {
    const align = (config.readme || {}).align === 'left' ? '' : ' align="center"';
    return existing.replace(MARKER, (match, code, id) => {
      if (code) return match;
      const content = id === 'cards' ? all : byId[id];
      if (!content) return match;
      return `<!-- cozy:${id} -->\n<div${align}>\n\n${content}\n\n</div>\n<!-- /cozy:${id} -->`;
    });
  }

  const readme = config.readme || {};
  const marker = '<!-- generated by cozy-readme (https://github.com/vxnsin/cozy-readme), edit your config instead -->';
  if (template) {
    return template
      .replace(/\{\{cards\}\}/g, all)
      .replace(/\{\{card:([\w-]+)\}\}/g, (match, id) => byId[id] || match);
  }
  const align = readme.align === 'left' ? '' : ' align="center"';
  return [marker, readme.before || '', `<div${align}>\n\n${all}\n\n</div>`, readme.after || '']
    .filter(Boolean).join('\n\n') + '\n';
}
