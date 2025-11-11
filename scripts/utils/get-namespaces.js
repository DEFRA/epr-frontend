import fs from 'node:fs'
import path from 'node:path'

export function getNamespaces(baseDir = 'src/server') {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      namespace: d.name,
      path: path.join(baseDir, d.name)
    }))
}
