import { execSync } from 'node:child_process'

/**
 * @param {string[]} args
 * @returns {string}
 */
function parseArgs(args) {
  const outIndex = args.indexOf('--out')
  const hasOutputArg = outIndex >= 0 && args[outIndex + 1]
  return hasOutputArg ? args[outIndex + 1] : 'translations.xlsx'
}

/* eslint-disable no-console, n/no-process-exit */
/* v8 ignore next 12 */
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const outputFile = parseArgs(process.argv.slice(2))

    console.log(`🔍 Extracting and exporting translations to ${outputFile}...`)
    execSync('npx i18next-cli extract', {
      stdio: 'inherit',
      env: { ...process.env, I18NEXT_EXPORT_OUTPUT: outputFile }
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}
/* eslint-enable no-console, n/no-process-exit */

export { parseArgs }
