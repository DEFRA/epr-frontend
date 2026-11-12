import { existsSync, globSync, readFileSync } from 'node:fs'
import path from 'node:path'

const leaksState =
  /vi\.(mock|doMock)\(|config\.set\(|process\.env\.[A-Z_]+ *=|vi\.stubEnv|vi\.stubGlobal/

const leaksStateUndetected = new Set([
  'src/server/registrations/details/accreditations/helpers/fetch-accreditation-details.test.js',
  'src/server/reports/upload-links.integration.test.js'
])

const testSupport =
  /\.contract\.js$|test-helpers|^\.vite\/fixtures\/|^src\/server\/common\/test-helpers\//

const aliases = Object.entries(
  JSON.parse(readFileSync('package.json', 'utf8')).imports
).map(([from, to]) => [from.replace('*', ''), to.replace('*', '')])

const resolveImport = (fromFile, specifier) => {
  const alias = aliases.find(([prefix]) => specifier.startsWith(prefix))
  if (alias) {
    return path.normalize(specifier.replace(alias[0], alias[1]))
  }
  return specifier.startsWith('.')
    ? path.join(path.dirname(fromFile), specifier)
    : null
}

const testSupportImportsOf = (file) =>
  [
    ...readFileSync(file, 'utf8').matchAll(
      /from '([^']+)'|import\('([^']+)'\)/g
    )
  ]
    .map(([, from, dynamic]) => resolveImport(file, from ?? dynamic))
    .filter(
      (target) => target && testSupport.test(target) && existsSync(target)
    )

const reachesLeak = (file, seen = new Set()) => {
  if (seen.has(file)) {
    return false
  }
  seen.add(file)
  return (
    leaksState.test(readFileSync(file, 'utf8')) ||
    testSupportImportsOf(file).some((target) => reachesLeak(target, seen))
  )
}

const needsIsolation = (file) =>
  leaksStateUndetected.has(file) || reachesLeak(file)

export const testFilePatterns = ['{src,scripts,.vite}/**/*.test.{js,mjs}']

/**
 * Test files that neither mock modules nor change config, env or globals,
 * directly or through a shared contract, fixture or test helper, so they can
 * share one module graph per worker. Every other test file, including one
 * created after the config loaded (in watch mode), keeps a fresh module graph
 * per file.
 */
export const sharedTestFiles = globSync(testFilePatterns).filter(
  (file) => !needsIsolation(file)
)
