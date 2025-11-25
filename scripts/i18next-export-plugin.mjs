import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

/**
 * i18next-cli plugin for exporting afterSync results to JSON
 * @param {object} options - Plugin options
 * @param {string} options.output - Output file path
 * @returns {import('i18next-cli').Plugin} i18next-cli plugin instance
 */
export default function exportPlugin(options = {}) {
  const { output = 'aftersync-results.json' } = options

  return {
    name: 'export-plugin',
    version: '1.0.0',

    async afterSync(results) {
      const outputPath = join(currentDir, '..', output)
      await writeFile(outputPath, JSON.stringify(results, null, 2))

      console.log(`\n✓ Exported afterSync results to ${output}`)
    }
  }
}
