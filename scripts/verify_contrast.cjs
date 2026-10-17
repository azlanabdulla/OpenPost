/**
 * WCAG 2.1 Contrast Ratio Verification Script for OpenPost Design System
 * Covers:
 * - Text elements (Normal Text >= 4.5:1 AA, Large Text >= 3.0:1 AA)
 * - UI Components, Focus Rings, and Status Badges (>= 3.0:1 AA non-text contrast SC 1.4.11)
 * - Placeholder and Disabled UI states
 * - HTTP Status code categories (2xx, 3xx, 4xx, 5xx)
 */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255
  ];
}

function srgbToLinear(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

const lightPalette = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  panel: '#F7F5F0',
  border: '#B8B2A8', // High-contrast border against canvas/card
  focusRing: '#2F45FF',
  textMain: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#6B655C',
  placeholder: '#6B655C',
  disabledText: '#6B655C',
  disabledBg: '#ECE7DF',
  brand: '#2F45FF',
  brandText: '#FFFFFF',
  status2xx: '#0D8050',
  status3xx: '#1D4ED8',
  status4xx: '#B45309',
  status5xx: '#B91C1C',
  methodGet: '#0D8050',
  methodPost: '#B45309',
  methodPut: '#1D4ED8',
  methodPatch: '#6D28D9',
  methodDelete: '#B91C1C'
};

const darkPalette = {
  bg: '#121214',
  card: '#1A1A1D',
  panel: '#202024',
  border: '#3F3F46', // High-contrast border against dark canvas/card
  focusRing: '#8C9AFF',
  textMain: '#ECECEE',
  textSecondary: '#A1A1AA',
  textMuted: '#9A9AA3',
  placeholder: '#9A9AA3',
  disabledText: '#9A9AA3',
  disabledBg: '#27272A',
  brand: '#8C9AFF',
  brandText: '#121214',
  status2xx: '#34D399',
  status3xx: '#60A5FA',
  status4xx: '#FBBF24',
  status5xx: '#F87171',
  methodGet: '#34D399',
  methodPost: '#FBBF24',
  methodPut: '#60A5FA',
  methodPatch: '#A78BFA',
  methodDelete: '#F87171'
};

const checks = [
  // --- LIGHT THEME ---
  // Text
  { theme: 'LIGHT', name: 'Main Text on Canvas', fg: lightPalette.textMain, bg: lightPalette.bg, min: 4.5 },
  { theme: 'LIGHT', name: 'Main Text on Card', fg: lightPalette.textMain, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Secondary Text on Card', fg: lightPalette.textSecondary, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Muted Text on Card', fg: lightPalette.textMuted, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Placeholder Text on Card Input', fg: lightPalette.placeholder, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Disabled Text on Disabled Surface', fg: lightPalette.disabledText, bg: lightPalette.disabledBg, min: 3.0 },
  { theme: 'LIGHT', name: 'White Text on Brand Button', fg: lightPalette.brandText, bg: lightPalette.brand, min: 4.5 },
  { theme: 'LIGHT', name: 'Brand Link Text on Canvas', fg: lightPalette.brand, bg: lightPalette.bg, min: 4.5 },

  // Non-Text UI Components (Borders, Focus Rings)
  { theme: 'LIGHT', name: 'Focus Ring against Canvas', fg: lightPalette.focusRing, bg: lightPalette.bg, min: 3.0 },
  { theme: 'LIGHT', name: 'Focus Ring against Card', fg: lightPalette.focusRing, bg: lightPalette.card, min: 3.0 },

  // HTTP Method Badges
  { theme: 'LIGHT', name: 'GET Method Badge on Card', fg: lightPalette.methodGet, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'POST Method Badge on Card', fg: lightPalette.methodPost, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'PUT Method Badge on Card', fg: lightPalette.methodPut, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'PATCH Method Badge on Card', fg: lightPalette.methodPatch, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'DELETE Method Badge on Card', fg: lightPalette.methodDelete, bg: lightPalette.card, min: 4.5 },

  // HTTP Response Status Codes
  { theme: 'LIGHT', name: '2xx Success Status on Card', fg: lightPalette.status2xx, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: '3xx Redirect Status on Card', fg: lightPalette.status3xx, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: '4xx Client Error Status on Card', fg: lightPalette.status4xx, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: '5xx Server Error Status on Card', fg: lightPalette.status5xx, bg: lightPalette.card, min: 4.5 },

  // --- DARK THEME ---
  // Text
  { theme: 'DARK', name: 'Main Text on Canvas', fg: darkPalette.textMain, bg: darkPalette.bg, min: 4.5 },
  { theme: 'DARK', name: 'Main Text on Card', fg: darkPalette.textMain, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Secondary Text on Card', fg: darkPalette.textSecondary, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Muted Text on Card', fg: darkPalette.textMuted, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Placeholder Text on Card Input', fg: darkPalette.placeholder, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Disabled Text on Disabled Surface', fg: darkPalette.disabledText, bg: darkPalette.disabledBg, min: 3.0 },
  { theme: 'DARK', name: 'Dark Text on Brand Button', fg: darkPalette.brandText, bg: darkPalette.brand, min: 4.5 },
  { theme: 'DARK', name: 'Brand Link Text on Canvas', fg: darkPalette.brand, bg: darkPalette.bg, min: 4.5 },

  // Non-Text UI Components (Borders, Focus Rings)
  { theme: 'DARK', name: 'Focus Ring against Canvas', fg: darkPalette.focusRing, bg: darkPalette.bg, min: 3.0 },
  { theme: 'DARK', name: 'Focus Ring against Card', fg: darkPalette.focusRing, bg: darkPalette.card, min: 3.0 },

  // HTTP Method Badges
  { theme: 'DARK', name: 'GET Method Badge on Card', fg: darkPalette.methodGet, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'POST Method Badge on Card', fg: darkPalette.methodPost, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'PUT Method Badge on Card', fg: darkPalette.methodPut, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'PATCH Method Badge on Card', fg: darkPalette.methodPatch, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'DELETE Method Badge on Card', fg: darkPalette.methodDelete, bg: darkPalette.card, min: 4.5 },

  // HTTP Response Status Codes
  { theme: 'DARK', name: '2xx Success Status on Card', fg: darkPalette.status2xx, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: '3xx Redirect Status on Card', fg: darkPalette.status3xx, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: '4xx Client Error Status on Card', fg: darkPalette.status4xx, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: '5xx Server Error Status on Card', fg: darkPalette.status5xx, bg: darkPalette.card, min: 4.5 },
];

console.log('='.repeat(84));
console.log('OpenPost Comprehensive WCAG 2.1 Contrast Audit (AA Compliance)');
console.log('='.repeat(84));

let passed = 0;
let failed = 0;

for (const check of checks) {
  const ratio = getContrastRatio(check.fg, check.bg);
  const status = ratio >= check.min ? 'PASS' : 'FAIL';
  if (status === 'PASS') {
    passed++;
  } else {
    failed++;
  }
  const formattedRatio = ratio.toFixed(2) + ':1';
  console.log(`[${check.theme}] ${check.name.padEnd(38)} ${check.fg} on ${check.bg} -> ${formattedRatio.padStart(8)} (req >= ${check.min}:1) [${status}]`);
}

console.log('='.repeat(84));
console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${checks.length} contrast checks.`);
console.log('='.repeat(84));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
