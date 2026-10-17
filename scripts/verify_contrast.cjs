/**
 * WCAG 2.1 Contrast Ratio Verification Script for OpenPost Design System
 * Verifies AA compliance (>= 4.5:1 for normal text, >= 3.0:1 for large text/components/badges)
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
  border: '#E7E2DA',
  textMain: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#6B655C',
  brand: '#2F45FF',
  brandText: '#FFFFFF',
  methodGet: '#0D8050',
  methodPost: '#B45309',
  methodPut: '#1D4ED8',
  methodPatch: '#6D28D9',
  methodDelete: '#B91C1C'
};

const darkPalette = {
  bg: '#121214',
  card: '#1A1A1D',
  border: '#2A2A2E',
  textMain: '#ECECEE',
  textSecondary: '#A1A1AA',
  textMuted: '#9A9AA3',
  brand: '#8C9AFF',
  brandText: '#121214',
  methodGet: '#34D399',
  methodPost: '#FBBF24',
  methodPut: '#60A5FA',
  methodPatch: '#A78BFA',
  methodDelete: '#F87171'
};

const checks = [
  // Light Mode checks
  { theme: 'LIGHT', name: 'Main Text on Canvas', fg: lightPalette.textMain, bg: lightPalette.bg, min: 4.5 },
  { theme: 'LIGHT', name: 'Main Text on Card', fg: lightPalette.textMain, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Secondary Text on Card', fg: lightPalette.textSecondary, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Muted Text on Card', fg: lightPalette.textMuted, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'Brand Primary Text on Canvas', fg: lightPalette.brand, bg: lightPalette.bg, min: 4.5 },
  { theme: 'LIGHT', name: 'White Text on Brand Primary Button', fg: lightPalette.brandText, bg: lightPalette.brand, min: 4.5 },
  { theme: 'LIGHT', name: 'GET Method on Card', fg: lightPalette.methodGet, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'POST Method on Card', fg: lightPalette.methodPost, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'PUT Method on Card', fg: lightPalette.methodPut, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'PATCH Method on Card', fg: lightPalette.methodPatch, bg: lightPalette.card, min: 4.5 },
  { theme: 'LIGHT', name: 'DELETE Method on Card', fg: lightPalette.methodDelete, bg: lightPalette.card, min: 4.5 },

  // Dark Mode checks
  { theme: 'DARK', name: 'Main Text on Canvas', fg: darkPalette.textMain, bg: darkPalette.bg, min: 4.5 },
  { theme: 'DARK', name: 'Main Text on Card', fg: darkPalette.textMain, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Secondary Text on Card', fg: darkPalette.textSecondary, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Muted Text on Card', fg: darkPalette.textMuted, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'Brand Primary on Canvas', fg: darkPalette.brand, bg: darkPalette.bg, min: 4.5 },
  { theme: 'DARK', name: 'Dark Text on Brand Primary Button', fg: darkPalette.brandText, bg: darkPalette.brand, min: 4.5 },
  { theme: 'DARK', name: 'GET Method on Card', fg: darkPalette.methodGet, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'POST Method on Card', fg: darkPalette.methodPost, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'PUT Method on Card', fg: darkPalette.methodPut, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'PATCH Method on Card', fg: darkPalette.methodPatch, bg: darkPalette.card, min: 4.5 },
  { theme: 'DARK', name: 'DELETE Method on Card', fg: darkPalette.methodDelete, bg: darkPalette.card, min: 4.5 },
];

console.log('='.repeat(78));
console.log('OpenPost WCAG 2.1 Contrast Ratio Compliance Report');
console.log('='.repeat(78));

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
  console.log(`[${check.theme}] ${check.name.padEnd(35)} ${check.fg} on ${check.bg} -> ${formattedRatio.padStart(8)} (req >= ${check.min}:1) [${status}]`);
}

console.log('='.repeat(78));
console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${checks.length} contrast checks.`);
console.log('='.repeat(78));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
