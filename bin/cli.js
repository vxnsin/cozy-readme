#!/usr/bin/env node
// Renders all cards of a cozy-readme config to SVG files and writes the README.
//
//   node bin/cli.js --config cozy.config.json --out dist --readme README.md \
//     [--template README.template.md] [--base-url https://raw.../output] \
//     [--snake snk/snake.svg] [--cache dist/anime-covers.json]
//
// env: GITHUB_TOKEN (stats, repo), MAL_CLIENT_ID (myanimelist),
//      GITHUB_REPOSITORY (default for config.repo)
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderCards, buildReadme, repoTypes } from '../src/index.js';
import { loadAnime } from '../src/providers/anime.js';
import { loadGithub } from '../src/providers/github.js';
import { loadRepo } from '../src/providers/repo.js';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    throw new Error(`could not read ${file}: ${error.message}`);
  }
}

async function settle(label, promise) {
  try {
    return await promise;
  } catch (error) {
    console.warn(`::warning::${label}: ${error.message}`);
    return null;
  }
}

async function toDataUri(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const type = response.headers.get('content-type') || 'image/jpeg';
  return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
}

async function main() {
  const opts = args(process.argv.slice(2));
  const configFile = opts.config || 'cozy.config.json';
  const outDir = opts.out || 'dist';
  const config = await readJson(configFile);
  const types = new Set((config.cards || []).map(c => c.type));
  const now = new Date();

  const needsGithub = types.has('stats') || types.has('about');
  const needsAnime = config.anime && config.anime.source && (types.has('anime') || types.has('about'));
  const cacheFile = opts.cache || path.join(outDir, 'anime-covers.json');
  const cache = needsAnime ? await readJson(cacheFile, {}) : {};
  const cacheBefore = JSON.stringify(cache);

  const repoName = config.repo || process.env.GITHUB_REPOSITORY;
  const needsRepo = repoTypes.some(type => types.has(type));

  const [github, anime, snake, repo] = await Promise.all([
    needsGithub && config.github && config.github.user
      ? settle('github stats', loadGithub({ user: config.github.user, token: process.env.GITHUB_TOKEN, excludeLanguages: config.github.excludeLanguages }))
      : null,
    needsAnime
      ? settle(`anime (${config.anime.source})`, loadAnime(config.anime, { cache, malClientId: process.env.MAL_CLIENT_ID }))
      : null,
    types.has('snake') && opts.snake ? readFile(opts.snake, 'utf8').catch(() => null) : null,
    needsRepo && repoName ? settle(`repo ${repoName}`, loadRepo({ repo: repoName, token: process.env.GITHUB_TOKEN })) : null
  ]);

  // <img> SVGs cannot load external images, so covers are inlined
  for (const entry of anime || []) {
    if (!entry.cover) continue;
    entry.coverDataUri = await toDataUri(entry.cover).catch(error => {
      console.warn(`::warning::cover for "${entry.title}": ${error.message}`);
      return null;
    });
  }

  for (const person of (repo && types.has('contributors') ? repo.contributors : [])) {
    person.avatarDataUri = await toDataUri(person.avatar).catch(() => null);
  }

  const data = { now, github, anime: (anime || []).filter(e => e.coverDataUri), snake, repo };
  const rendered = await renderCards(config, data);

  await mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const card of rendered) {
    const hash = createHash('sha1');
    for (const [theme, svg] of Object.entries(card.svgs)) {
      hash.update(svg);
      await writeFile(path.join(outDir, `${card.id}-${theme}.svg`), svg, 'utf8');
    }
    hashes[card.id] = hash.digest('hex').slice(0, 10);
    console.log(`rendered ${card.id} (${card.type})`);
  }
  if (needsAnime && JSON.stringify(cache) !== cacheBefore) {
    await writeFile(cacheFile, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  }

  if (opts.readme) {
    const base = String(opts['base-url'] || '.').replace(/\/$/, '');
    const template = opts.template ? await readFile(opts.template, 'utf8') : null;
    const src = (card, theme) => `${base}/${card.id}-${theme}.svg?v=${hashes[card.id]}`;
    const previous = await readFile(opts.readme, 'utf8').catch(() => null);
    const readme = buildReadme(config, rendered, src, template, previous);
    if (readme !== previous) {
      await writeFile(opts.readme, readme, 'utf8');
      console.log(`wrote ${opts.readme}`);
    }
  }
}

main().catch(error => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
