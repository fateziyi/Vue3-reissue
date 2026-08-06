import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const targets = [
  'shared',
  'reactivity',
  'runtime-core',
  'runtime-dom',
  'compiler-core',
]

const alias = Object.fromEntries(
  targets.map((target) => [
    `@vue/${target}`,
    resolve(root, `packages/${target}/src/index.ts`),
  ])
)

await Promise.all(
  targets.map((target) =>
    build({
      entryPoints: [resolve(root, `packages/${target}/src/index.ts`)],
      outfile: resolve(root, `packages/${target}/dist/${target}.js`),
      bundle: true,
      platform: 'browser',
      format: 'esm',
      sourcemap: true,
      alias,
    })
  )
)

console.log(`built ${targets.length} workspace packages`)
