// The configurator: edits a cozy.config.json, previews it with the real
// renderer (sample data) and prints the files to drop into a profile repo.
// On GitHub Pages src/ and examples/ sit next to this file; locally they are
// one level up.
const lib = await import('./src/index.js').catch(() => import('../src/index.js'));
const animeLib = await import('./src/providers/anime.js').catch(() => import('../src/providers/anime.js'));
const repoLib = await import('./src/providers/repo.js').catch(() => import('../src/providers/repo.js'));
const { cardTypes, presetNames, renderCards, normalizeCards, sampleData, repoTypes } = lib;

const STORAGE_KEY = 'cozy-readme:config';
const ACTION_REF = 'vxnsin/cozy-readme@v1';

const STARTER = {
  theme: 'spring',
  since: '2020-01-01',
  github: { user: '' },
  anime: { source: 'anilist', user: '', count: 10 },
  cards: [
    { type: 'header', wordmark: 'my.site', subtitle: 'ようこそ', typewriter: ['a developer', 'an anime enthusiast', 'probably asleep'], chips: ['hi, i\'m ...', 'coding since {since}'] },
    { type: 'about', paragraphs: ['hi! i write code, watch anime and break things on purpose sometimes.', 'this profile rebuilds itself every night.'] },
    { type: 'stack' },
    { type: 'anime' },
    { type: 'stats' },
    { type: 'snake' },
    { type: 'marquee' },
    { type: 'footer', wordmark: 'my.site', counterSince: '2020-01-01' }
  ]
};

// For a project README: cards are placed with markers so the rest stays.
const REPO_STARTER = {
  theme: 'spring',
  repo: '',
  cards: [
    { type: 'repo' },
    { type: 'commits' },
    { type: 'releases' },
    { type: 'contributors' }
  ]
};

// --- field definitions per card type --------------------------------------

const lines = { parse: v => v.split('\n').map(s => s.trim()).filter(Boolean), format: v => (v || []).join('\n') };
const csv = { parse: v => v.split(',').map(s => s.trim()).filter(Boolean), format: v => (v || []).join(', ') };
const groups = {
  parse: v => v.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [label, ...rest] = line.split(':');
    return { label: label.trim(), items: rest.join(':').split(',').map(s => s.trim()).filter(Boolean) };
  }),
  format: v => (v || []).map(g => `${g.label}: ${g.items.map(i => (typeof i === 'string' ? i : i.name)).join(', ')}`).join('\n')
};
const statusRows = {
  parse: v => v.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [label, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    return value.includes(' | ') ? { label: label.trim(), moods: value.split(' | ').map(s => s.trim()) } : { label: label.trim(), value };
  }),
  format: v => (v || []).map(r => `${r.label}: ${r.moods ? r.moods.join(' | ') : r.value}`).join('\n')
};

const F = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });
const common = [F('title', 'window title'), F('right', 'title bar, right')];

const FIELDS = {
  header: [...common, F('wordmark', 'wordmark (last dot gets the accent)'), F('subtitle', 'subtitle'),
    F('typewriter', 'typewriter lines', 'area', lines), F('chips', 'chips', 'area', lines), F('hint', 'bottom hint'),
    F('effect', 'falling particles', 'select', { options: ['sakura', 'snow', 'leaves', 'none'] }), F('link', 'link')],
  about: [...common, F('heading', 'heading'), F('paragraphs', 'paragraphs (one per line)', 'area', lines),
    F('signoff', 'sign-off'), F('signoffKaomoji', 'sign-off kaomoji'), F('status.title', 'status window title'),
    F('status.rows', 'status rows: "label: value", moods as "mood: a | b | c"', 'area', statusRows),
    F('status.yearProgress', 'year progress bar', 'check'), F('link', 'link')],
  stack: [...common, F('groups', 'groups: "label: item, item" (icons from simple-icons)', 'area', groups), F('link', 'link')],
  anime: [...common, F('newBadge', 'badge on the newest'), F('empty', 'text when empty'), F('link', 'link')],
  stats: [...common, F('boxes', 'boxes (contributions, commits, repos, stars, followers)', 'text', csv),
    F('chartTitle', 'chart title'), F('languagesTitle', 'languages title'), F('counter', 'hit counter', 'check'), F('link', 'link')],
  snake: [...common, F('link', 'link')],
  marquee: [F('lines', 'lines', 'area', lines), F('separator', 'separator'), F('link', 'link')],
  footer: [...common, F('wordmark', 'wordmark'), F('text', 'text'), F('note', 'small note'),
    F('counterLabel', 'counter label'), F('counterSince', 'count days since (empty hides it)', 'date'), F('link', 'link')],
  button: [F('label', 'label'), F('link', 'link')],
  badge: [F('top', 'top line'), F('bottom', 'bottom line'), F('mark', 'mark (1 char)'), F('color', 'colour', 'color'), F('link', 'link')],
  repo: [...common, F('name', 'name (empty = repo name)'), F('description', 'description (empty = repo description)'),
    F('boxes', 'boxes (stars, forks, issues, commits, watchers, contributors)', 'text', csv),
    F('topics', 'topics', 'check'), F('languages', 'language bar', 'check'), F('link', 'link')],
  commits: [...common, F('prompt', 'prompt line'), F('count', 'commits shown', 'number'), F('chart', 'weekly chart', 'check'),
    F('chartTitle', 'chart title'), F('counter', 'hit counter', 'check'), F('link', 'link')],
  contributors: [...common, F('count', 'people shown', 'number'), F('empty', 'text when empty'), F('link', 'link')],
  releases: [...common, F('count', 'releases shown', 'number'), F('latestBadge', 'badge on the latest'), F('empty', 'text when empty'), F('link', 'link')]
};

const VARS_NOTE = 'text can use {year} {date} {years} {since} {anime.latest} {github.lastPush} {repo.name} {repo.stars} {repo.release} {repo.commits}';

// --- state -----------------------------------------------------------------

let config = load();
let mode = 'light';
let openIndex = -1;

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* storage unavailable */ }
  return structuredClone(STARTER);
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* storage unavailable */ }
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || o[k] == null) o[k] = {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
}

// --- basics ----------------------------------------------------------------

const $ = id => document.getElementById(id);

function bindBasics() {
  $('theme').innerHTML = presetNames.map(n => `<option value="${n}">${n}</option>`).join('');
  $('add-type').innerHTML = Object.keys(cardTypes).map(n => `<option value="${n}">${n}</option>`).join('');
  const fields = [
    ['github-user', 'github.user'], ['theme', 'theme'], ['since', 'since'], ['align', 'readme.align'],
    ['anime-source', 'anime.source'], ['anime-user', 'anime.user'], ['repo', 'repo']
  ];
  for (const [id, path] of fields) {
    $(id).addEventListener('input', () => { set(config, path, $(id).value); changed(); });
  }
}

function fillBasics() {
  $('github-user').value = get(config, 'github.user') || '';
  $('theme').value = typeof config.theme === 'string' ? config.theme : (config.theme && config.theme.preset) || 'spring';
  $('since').value = config.since || '';
  $('align').value = get(config, 'readme.align') || 'center';
  $('anime-source').value = get(config, 'anime.source') || '';
  $('anime-user').value = get(config, 'anime.user') || '';
  $('repo').value = config.repo || '';
}

// --- card list -------------------------------------------------------------

function renderList() {
  const list = $('cards');
  list.innerHTML = '';
  const normalized = normalizeCards(config);
  config.cards.forEach((card, index) => {
    const node = $('card-tpl').content.firstElementChild.cloneNode(true);
    node.querySelector('.card-type').textContent = card.type;
    node.querySelector('.card-id').textContent = normalized[index].id;
    const fields = node.querySelector('.card-fields');
    const open = index === openIndex;
    node.classList.toggle('open', open);
    node.querySelector('.handle').textContent = open ? '▾' : '▸';
    fields.hidden = !open;
    node.querySelector('.card-head').addEventListener('click', event => {
      if (event.target.closest('.card-tools')) return;
      openIndex = open ? -1 : index;
      renderList();
    });
    node.querySelector('.up').addEventListener('click', () => move(index, -1));
    node.querySelector('.down').addEventListener('click', () => move(index, 1));
    node.querySelector('.remove').addEventListener('click', () => {
      config.cards.splice(index, 1);
      openIndex = -1;
      renderList();
      changed();
    });
    if (open) buildFields(fields, card, normalized[index]);
    list.appendChild(node);
  });
  $('card-count').textContent = `${config.cards.length} cards`;
}

function move(index, delta) {
  const to = index + delta;
  if (to < 0 || to >= config.cards.length) return;
  const [card] = config.cards.splice(index, 1);
  config.cards.splice(to, 0, card);
  if (openIndex === index) openIndex = to;
  renderList();
  changed();
}

function buildFields(container, card, resolved) {
  const idLabel = document.createElement('label');
  idLabel.innerHTML = 'id (file name)<input class="input">';
  const idInput = idLabel.querySelector('input');
  idInput.value = card.id || '';
  idInput.placeholder = resolved.id;
  idInput.addEventListener('input', () => { card.id = idInput.value || undefined; changed(); });
  container.appendChild(idLabel);

  for (const field of FIELDS[card.type] || []) {
    const label = document.createElement('label');
    const current = get(card, field.key) ?? get(resolved, field.key);
    let input;
    if (field.kind === 'area') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.kind === 'select') {
      input = document.createElement('select');
      input.innerHTML = field.options.map(o => `<option>${o}</option>`).join('');
    } else {
      input = document.createElement('input');
      input.type = { check: 'checkbox', color: 'color', date: 'date', number: 'number' }[field.kind] || 'text';
    }
    if (field.kind !== 'check') input.className = 'input';
    if (field.kind === 'check') input.checked = Boolean(current);
    else input.value = field.format ? field.format(current) : (current ?? '');

    input.addEventListener(field.kind === 'check' ? 'change' : 'input', () => {
      const raw = field.kind === 'check' ? input.checked : field.kind === 'number' ? Number(input.value) : input.value;
      set(card, field.key, field.parse ? field.parse(raw) : raw);
      changed();
    });
    label.append(field.label, input);
    container.appendChild(label);
  }
  const note = document.createElement('p');
  note.className = 'field-note';
  note.textContent = VARS_NOTE;
  container.appendChild(note);
}

$('add').addEventListener('click', () => {
  const type = $('add-type').value;
  const card = { type };
  if (type === 'button') card.label = 'link';
  config.cards.push(card);
  openIndex = config.cards.length - 1;
  renderList();
  changed();
});

// --- preview ---------------------------------------------------------------

let renderToken = 0;
let liveAnime = { key: '', entries: null };
let liveRepo = { key: '', data: null, error: '' };

async function previewData() {
  const data = sampleData();
  const anime = config.anime || {};
  // anilist and kitsu allow browser requests, so those previews can be live
  if (['anilist', 'kitsu'].includes(anime.source) && anime.user) {
    const key = `${anime.source}:${anime.user}`;
    if (liveAnime.key !== key) {
      liveAnime = { key, entries: null };
      try {
        liveAnime.entries = await animeLib.loadAnime({ ...anime, count: anime.count || 10 });
      } catch { liveAnime.entries = null; }
    }
    if (liveAnime.entries && liveAnime.entries.length) data.anime = liveAnime.entries;
  }
  // public repos can be read without a token (60 requests an hour), cached per repo
  const needsRepo = config.cards.some(card => repoTypes.includes(card.type));
  if (needsRepo && /^[\w.-]+\/[\w.-]+$/.test(config.repo || '')) {
    if (liveRepo.key !== config.repo) {
      liveRepo = { key: config.repo, data: null, error: '' };
      try {
        liveRepo.data = await repoLib.loadRepo({ repo: config.repo });
      } catch (error) { liveRepo.error = error.message; }
    }
    if (liveRepo.data) data.repo = liveRepo.data;
  }
  return data;
}

async function renderPreview() {
  const token = ++renderToken;
  $('status').textContent = 'rendering…';
  let rendered;
  try {
    rendered = await renderCards(config, await previewData());
  } catch (error) {
    $('status').textContent = error.message;
    return;
  }
  if (token !== renderToken) return;

  const preview = $('preview');
  preview.innerHTML = '';
  if (!rendered.length) preview.innerHTML = '<p class="empty">add a card to get started (￣▽￣)ノ</p>';
  let line = null;
  for (const card of rendered) {
    // each card lives in its own shadow root so their ids never clash
    const slot = document.createElement('div');
    slot.className = card.inline ? 'slot' : 'slot full';
    slot.style.width = card.inline ? `${card.width}px` : '';
    slot.attachShadow({ mode: 'open' }).innerHTML = `<style>:host{display:block}svg{display:block;width:100%;height:auto}</style>${card.svgs[mode]}`;
    if (card.inline) {
      if (!line || line.dataset.type !== card.type) {
        line = document.createElement('div');
        line.className = `line ${card.type === 'badge' ? 'badges' : ''}`;
        line.dataset.type = card.type;
        preview.appendChild(line);
      }
      line.appendChild(slot);
    } else {
      line = null;
      preview.appendChild(slot);
    }
  }
  $('status').textContent = liveRepo.data && liveRepo.key === config.repo ? `ready · live data for ${config.repo}`
    : liveRepo.error && liveRepo.key === config.repo ? `repo: ${liveRepo.error}` : 'ready';
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    $('preview').dataset.mode = mode;
    renderPreview();
  });
}

// --- outputs ---------------------------------------------------------------

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, clean(v)]));
  }
  return value;
}

function isRepoSetup() {
  return config.cards.length > 0 && config.cards.every(card => repoTypes.includes(card.type) || ['button', 'badge', 'marquee', 'stack'].includes(card.type));
}

function workflow() {
  const mal = get(config, 'anime.source') === 'myanimelist';
  return `name: cozy-readme

on:
  schedule:
    - cron: '0 0 * * *'  # every night
  workflow_dispatch:
  push:
    paths: ['cozy.config.json', 'README.template.md']

permissions:
  contents: write

jobs:
  cozy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${ACTION_REF}${mal ? `
        with:
          mal_client_id: \${{ secrets.MAL_CLIENT_ID }}` : ''}
`;
}

function renderOutputs() {
  $('out-config').textContent = `${JSON.stringify(clean(config), null, 2)}\n`;
  $('out-workflow').textContent = workflow();
  $('mal-step').hidden = get(config, 'anime.source') !== 'myanimelist';
  const ids = normalizeCards(config).map(card => card.id);
  $('out-markers').textContent = `${ids.map(id => `<!-- cozy:${id} -->`).join('\n')}\n\n<!-- or all of them at once: -->\n<!-- cozy:cards -->\n`;
  $('repo-step').hidden = !isRepoSetup();
  document.querySelectorAll('.u').forEach(el => { el.textContent = get(config, 'github.user') || 'you'; });
}

for (const button of document.querySelectorAll('.copy')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($(button.dataset.copy).textContent);
      button.textContent = 'copied ✓';
    } catch {
      button.textContent = 'select + copy';
    }
    setTimeout(() => { button.textContent = 'copy'; }, 1400);
  });
}

// --- import / reset ----------------------------------------------------------

function replaceConfig(next) {
  config = next;
  if (!Array.isArray(config.cards)) config.cards = [];
  openIndex = -1;
  fillBasics();
  renderList();
  changed();
}

$('import').addEventListener('click', () => {
  try {
    replaceConfig(JSON.parse($('import-text').value));
    $('import-error').hidden = true;
  } catch (error) {
    $('import-error').textContent = `that is not valid json: ${error.message}`;
    $('import-error').hidden = false;
  }
});
$('repo-start').addEventListener('click', () => replaceConfig(structuredClone(REPO_STARTER)));
$('reset').addEventListener('click', () => replaceConfig({ theme: 'spring', github: { user: '' }, cards: [] }));
$('example').addEventListener('click', async () => {
  for (const url of ['./examples/vxnsin.config.json', '../examples/vxnsin.config.json']) {
    try {
      const response = await fetch(url);
      if (response.ok) { replaceConfig(await response.json()); return; }
    } catch { /* try the next location */ }
  }
  replaceConfig(structuredClone(STARTER));
});

// --- wiring ------------------------------------------------------------------

let timer;
function changed() {
  save();
  renderOutputs();
  clearTimeout(timer);
  timer = setTimeout(renderPreview, 350);
}

bindBasics();
fillBasics();
renderList();
renderOutputs();
renderPreview();
