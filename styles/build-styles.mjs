/**
 * Assembles the vendored system CSS into the two NgFlow theme bundles, mirroring
 * the upstream Svelte/React build:
 *   - style.css : init + style (full default theme) + node-resizer
 *   - base.css  : init + base  (minimal theme)        + node-resizer
 *
 * The vendored system CSS uses SCSS-style `&-suffix` selector concatenation
 * (e.g. `&-button`), which is NOT valid native CSS nesting. Upstream flattens it
 * with `postcss-nested`; we do the same here, otherwise Angular's esbuild-based
 * CSS pipeline drops those rules ("rules skipped due to selector errors").
 *
 * The upstream build also renames class selectors `xy` -> <lib> via
 * postcss-rename. The only class prefix in the system CSS is `.xy-flow`, so we
 * rename `.xy-flow` -> `.ng-flow` (CSS custom properties like `--xy-node-*` are
 * left untouched, exactly as postcss-rename would).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

// Strip the upstream comment headers so the concatenation stays clean.
const rename = (css) => css.replaceAll('.xy-flow', '.ng-flow');

// Flatten SCSS-style `&-suffix` nesting to plain selectors.
const processor = postcss([postcssNested]);
const flatten = (css, from) => processor.process(css, { from }).css;

const extra = `
.ng-flow__edge-label {
  text-align: center;
  position: absolute;
}

.ng-flow__container {
  user-select: none;
}
`;

const init = read('init.css');
const nodeResizer = read('node-resizer.css');

const style =
  flatten(rename([init, read('style.css'), nodeResizer].join('\n')), 'style.css') + extra;
const base =
  flatten(rename([init, read('base.css'), nodeResizer].join('\n')), 'base.css') + extra;

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'style.css'), style);
writeFileSync(join(here, 'dist', 'base.css'), base);

console.log('NgFlow styles built: styles/dist/{style,base}.css');
