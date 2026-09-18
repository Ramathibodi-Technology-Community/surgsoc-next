/**
 * CSS Stub Loader for Node 25+ ESM
 *
 * Uses a sentinel file:// URL to stub CSS/SCSS imports.
 * The resolve hook maps any .css/.scss import to a sentinel path,
 * and the load hook intercepts that sentinel and returns an empty module.
 *
 * Used via: --import ./scripts/css-stub.mjs
 */

import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

// Use an absolute path to THIS file as the sentinel base, so it always exists on disk.
// We append a query to make it unique and recognizable.
const SENTINEL = pathToFileURL(path.resolve('scripts/css-stub.mjs')).href + '?css-stub=1'

const loaderCode = `
const SENTINEL = ${JSON.stringify(SENTINEL)};

export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css') || specifier.endsWith('.scss')) {
    return { url: SENTINEL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url === SENTINEL || url.startsWith(SENTINEL)) {
    return { format: 'module', source: "export default '';", shortCircuit: true };
  }
  return nextLoad(url, context);
}
`

register('data:text/javascript,' + encodeURIComponent(loaderCode))
