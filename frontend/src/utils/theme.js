// The 7 colors a person actually picks. Everything else in the app's CSS variable
// set (hover tints, secondary/muted text, borders-on-borders, the sidebar's deeper
// black) is mathematically derived from these — so a person gets full visual
// control without needing 15 separate pickers, and without risking mismatched
// combinations (e.g. a new accent color whose hover-tint didn't update to match).
export const DEFAULT_THEME = {
  background: '#0A0A0A',
  card: '#161616',
  border: '#2A2A2A',
  text: '#E9E3D2',
  accent: '#CBA24D',
  income: '#5FA08D',
  expense: '#B85141'
};

export const THEME_FIELDS = [
  { key: 'background', label: 'Background', hint: 'The main page background' },
  { key: 'card', label: 'Card', hint: 'Card and panel surfaces' },
  { key: 'border', label: 'Border', hint: 'Card borders and dividers' },
  { key: 'text', label: 'Text', hint: 'Primary text color' },
  { key: 'accent', label: 'Accent', hint: 'Buttons, links, active states' },
  { key: 'income', label: 'Income', hint: 'Positive amounts, income' },
  { key: 'expense', label: 'Expense', hint: 'Negative amounts, over-budget' }
];

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Blends hexA toward hexB by `weight` (0 = pure hexA, 1 = pure hexB).
function mix(hexA, hexB, weight) {
  try {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return rgbToHex({
      r: a.r + (b.r - a.r) * weight,
      g: a.g + (b.g - a.g) * weight,
      b: a.b + (b.b - a.b) * weight
    });
  } catch {
    return hexA;
  }
}

function hexToRgba(hex, alpha) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

export function isValidHex(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

// Rough perceived brightness (0-255) — used only for a soft low-contrast warning,
// not a strict WCAG check.
function brightness(hex) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000;
  } catch {
    return 128;
  }
}

export function isLowContrast(theme) {
  return Math.abs(brightness(theme.text) - brightness(theme.background)) < 60;
}

// Builds the full set of CSS custom properties from the 7 base picks, mirroring
// every color variable defined in styles/index.css's :root block.
export function buildThemeVars(theme) {
  const t = { ...DEFAULT_THEME, ...theme };
  return {
    '--ink': t.background,
    '--ink-soft': mix(t.background, '#000000', 0.3),
    '--paper': t.background,
    '--paper-raised': t.card,
    '--paper-line': t.border,
    '--text-primary': t.text,
    '--text-secondary': mix(t.text, t.background, 0.35),
    '--text-muted': mix(t.text, t.background, 0.62),
    '--green': t.income,
    '--green-light': hexToRgba(t.income, 0.16),
    '--green-deep': mix(t.background, '#000000', 0.65),
    '--coral': t.expense,
    '--coral-light': hexToRgba(t.expense, 0.16),
    '--amber': t.accent,
    '--amber-light': hexToRgba(t.accent, 0.16)
  };
}

export function applyThemeVars(theme) {
  const vars = buildThemeVars(theme);
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}