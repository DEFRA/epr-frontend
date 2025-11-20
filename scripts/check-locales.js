import fs from 'fs'
import path from 'path'

const baseDir = 'src/server'

const namespaces = fs
  .readdirSync(baseDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(baseDir, d.name))

const missing = []

for (const ns of namespaces) {
  const enPath = path.join(ns, 'en.json')
  const cyPath = path.join(ns, 'cy.json')

  const hasEn = fs.existsSync(enPath)
  const hasCy = fs.existsSync(cyPath)

  if (!hasEn && !hasCy) {
    continue
  }
  if (!hasEn || !hasCy) {
    missing.push({ namespace: path.basename(ns), en: hasEn, cy: hasCy })
  }
}

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error('🚨 Missing locale files:', missing)
  process.exitCode = 1
} else {
  // eslint-disable-next-line no-console
  console.log('✅ All namespaces have both en.json and cy.json')
}
