import { createRequire } from 'node:module'
import { describe, it, expect } from 'vitest'

const require = createRequire(import.meta.url)

/**
 * TypeScript 7.0 ships no programmatic API (Microsoft expect one in 7.1), so
 * typescript-eslint cannot run against it and npm will not resolve the two
 * together. This repo therefore keeps `typescript` on 6.x for eslint and runs
 * the TS 7 compiler from the `typescript-7` alias in the lint:types scripts.
 *
 * This test is the tripwire for undoing that. When it fails, typescript-eslint
 * has moved its peer range: re-check
 * https://github.com/typescript-eslint/typescript-eslint/issues/10940 and, if
 * TS 7 is now supported, drop the `typescript-7` alias, bump `typescript` to
 * 7.x, restore the lint:types scripts to plain `tsc`, remove the dependabot
 * ignore entry, and delete this file.
 */
const rangeRejectingTypescript7 = '>=4.8.4 <6.1.0'

describe('typescript-7 alias workaround', () => {
  it('should still be needed because typescript-eslint rejects typescript 7', () => {
    const { peerDependencies } = require('typescript-eslint/package.json')

    expect(peerDependencies.typescript).toBe(rangeRejectingTypescript7)
  })
})
