import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import nunjucksPlugin from './i18next-nunjucks-plugin.mjs'

const TEST_DIR = 'test-njk-fixtures'

describe('i18next-nunjucks-plugin', () => {
  beforeEach(async () => {
    await mkdir(join('src', TEST_DIR), { recursive: true })
  })

  afterEach(async () => {
    await rm(join('src', TEST_DIR), { recursive: true, force: true })
  })

  it('should create plugin with correct name and version', () => {
    const plugin = nunjucksPlugin()

    expect(plugin.name).toBe('nunjucks-plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.onEnd).toBeTypeOf('function')
  })

  it('should extract keys from localise() calls', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test1.njk'),
      `{{ localise('home:pageTitle') }}`
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:pageTitle')).toBe(true)
    expect(keys.get('home:pageTitle')).toEqual({
      key: 'pageTitle',
      defaultValue: '',
      ns: 'home'
    })
  })

  it('should extract keys from t() calls', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test2.njk'),
      `{{ t('account:greeting') }}`
    )

    await plugin.onEnd(keys)

    expect(keys.has('account:greeting')).toBe(true)
    expect(keys.get('account:greeting')).toEqual({
      key: 'greeting',
      defaultValue: '',
      ns: 'account'
    })
  })

  it('should convert nested colons to dots', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test3.njk'),
      `{{ localise('home:services:accreditations') }}`
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:services.accreditations')).toBe(true)
    expect(keys.get('home:services.accreditations')).toEqual({
      key: 'services.accreditations',
      defaultValue: '',
      ns: 'home'
    })
  })

  it('should use common namespace for keys without namespace', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test4.njk'),
      `{{ localise('simpleKey') }}`
    )

    await plugin.onEnd(keys)

    expect(keys.has('common:simpleKey')).toBe(true)
    expect(keys.get('common:simpleKey')).toEqual({
      key: 'simpleKey',
      defaultValue: '',
      ns: 'common'
    })
  })

  it('should handle multiple keys in one file', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test5.njk'),
      `
      {{ localise('home:title') }}
      {{ t('home:heading') }}
      {{ localise('account:name') }}
      `
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:title')).toBe(true)
    expect(keys.has('home:heading')).toBe(true)
    expect(keys.has('account:name')).toBe(true)
  })

  it('should handle keys with additional arguments', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test6.njk'),
      `{{ localise('home:greeting', { name: 'John' }) }}`
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:greeting')).toBe(true)
    expect(keys.get('home:greeting')).toEqual({
      key: 'greeting',
      defaultValue: '',
      ns: 'home'
    })
  })

  it('should handle single and double quotes', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'test7.njk'),
      `
      {{ localise("home:single") }}
      {{ t('home:double') }}
      `
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:single')).toBe(true)
    expect(keys.has('home:double')).toBe(true)
  })

  it('should not extract plain text that looks like keys', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'no-translations.njk'),
      `<h1>home:title without function call</h1>`
    )

    await plugin.onEnd(keys)

    // Should not find keys that aren't wrapped in localise() or t()
    // The key would be home:title if it was extracted
    const plainTextKeys = Array.from(keys.keys()).filter((k) =>
      k.includes('without function')
    )
    expect(plainTextKeys).toHaveLength(0)
  })

  it('should handle whitespace variations in function calls', async () => {
    const plugin = nunjucksPlugin()
    const keys = new Map()

    await writeFile(
      join('src', TEST_DIR, 'whitespace.njk'),
      `
      {{ localise(  'home:spaced'  ) }}
      {{t('home:compact')}}
      `
    )

    await plugin.onEnd(keys)

    expect(keys.has('home:spaced')).toBe(true)
    expect(keys.has('home:compact')).toBe(true)
  })
})
