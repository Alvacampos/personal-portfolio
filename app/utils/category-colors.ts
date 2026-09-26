// This repo's design tokens (app/styles/constants.js, app/styles/style.css)
// have exactly one accent hue — every existing component (TenureHeatmap,
// ThemeToggle, etc.) only ever needed one color at varying intensity, never
// several simultaneous distinct categories. The month/year charts are the
// first thing that needs a real categorical palette, so it lives here
// rather than being bolted onto the single-accent token set.
//
// Okabe–Ito: a widely-used colorblind-safe qualitative palette (Okabe &
// Ito, 2008). Black is dropped — it disappears against this app's dark
// theme — leaving 7 colors. Assigned by index, cycling if there are ever
// more than 7 categories.
const CATEGORY_COLORS = [
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#F0E442', // yellow
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
] as const;

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
