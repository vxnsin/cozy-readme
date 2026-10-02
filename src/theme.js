// Palettes from vensin.dev (vensin-portfolio-v2/app/globals.css). The seasonal
// ones only swap paper, lines and accents; ink stays the spring ink.
const ink = {
  light: { ink: '#3b2c3a', inkSoft: '#7a6478' },
  dark: { ink: '#f1e7f0', inkSoft: '#b39fb0' }
};

const presets = {
  spring: {
    label: 'spring',
    light: { bg: '#f4ecf2', paper: '#fffaf9', paper2: '#f9eef4', line: '#c9a9bf', accent: '#e2789b', accent2: '#8b7fd6', accentSoft: '#fbe3ec', glow1: 'rgba(226,120,155,.30)', glow2: 'rgba(139,127,214,.26)' },
    dark: { bg: '#17121c', paper: '#1f1826', paper2: '#291f32', line: '#5c4a62', accent: '#ff8fb4', accent2: '#b0a4ff', accentSoft: '#3a2a3f', glow1: 'rgba(255,143,180,.16)', glow2: 'rgba(176,164,255,.18)' }
  },
  summer: {
    label: 'summer',
    light: { bg: '#f5f0e4', paper: '#fffdf6', paper2: '#fbf3e3', line: '#d4b58c', accent: '#ec7f47', accent2: '#2f9fbf', accentSoft: '#ffe6d3', glow1: 'rgba(255,170,80,.32)', glow2: 'rgba(60,180,210,.26)' },
    dark: { bg: '#14171f', paper: '#1c2130', paper2: '#242b3b', line: '#4f5c78', accent: '#ffb066', accent2: '#6fd3ea', accentSoft: '#33302a', glow1: 'rgba(255,176,102,.16)', glow2: 'rgba(111,211,234,.16)' }
  },
  autumn: {
    label: 'autumn',
    light: { bg: '#f3e9dc', paper: '#fff9f1', paper2: '#f8ecdc', line: '#c9a385', accent: '#d9702e', accent2: '#8a6d1e', accentSoft: '#fbe3cf', glow1: 'rgba(217,112,46,.30)', glow2: 'rgba(184,70,47,.22)' },
    dark: { bg: '#1a1310', paper: '#241a15', paper2: '#2f2219', line: '#6b4d3a', accent: '#ff9a4a', accent2: '#e0b34a', accentSoft: '#3d2a1f', glow1: 'rgba(255,154,74,.16)', glow2: 'rgba(224,179,74,.14)' }
  },
  halloween: {
    label: 'halloween',
    light: { bg: '#ece6f2', paper: '#f8f5fb', paper2: '#efe9f5', line: '#b59ec9', accent: '#f2701a', accent2: '#7d4fd6', accentSoft: '#ffe3cc', glow1: 'rgba(242,112,26,.30)', glow2: 'rgba(125,79,214,.28)' },
    dark: { bg: '#0f0a14', paper: '#17111f', paper2: '#221a2c', line: '#533f66', accent: '#ff8c2e', accent2: '#a985ff', accentSoft: '#3a2440', glow1: 'rgba(255,140,46,.18)', glow2: 'rgba(169,133,255,.20)' }
  },
  winter: {
    label: 'winter',
    light: { bg: '#e9eff6', paper: '#fbfdff', paper2: '#eef4fa', line: '#a9bcd3', accent: '#4f93d6', accent2: '#8e86d9', accentSoft: '#ddebf8', glow1: 'rgba(79,147,214,.28)', glow2: 'rgba(142,134,217,.24)' },
    dark: { bg: '#0f1420', paper: '#171d2b', paper2: '#202838', line: '#4a5a76', accent: '#8cc8ff', accent2: '#b7b0ff', accentSoft: '#26304a', glow1: 'rgba(140,200,255,.16)', glow2: 'rgba(183,176,255,.16)' }
  }
};

// The hit-counter digits look the same in every theme, like on the site.
export const counter = { bg: '#14101a', digit: '#ffd54a', glow: 'rgba(255,213,74,.7)' };

export const presetNames = Object.keys(presets);

// theme config: "spring" or { preset: "spring", light: {...overrides}, dark: {...overrides} }
export function resolveThemes(themeConfig = 'spring') {
  const config = typeof themeConfig === 'string' ? { preset: themeConfig } : themeConfig;
  const preset = presets[config.preset] || presets.spring;
  return ['light', 'dark'].map(mode => {
    const t = { name: mode, ...ink[mode], ...preset[mode], ...(config[mode] || {}) };
    t.star = mode === 'dark' ? '#ffffff' : t.ink;
    t.starPink = mode === 'dark' ? '#ffd6e6' : t.accent;
    t.starLav = t.accent2;
    return t;
  });
}
