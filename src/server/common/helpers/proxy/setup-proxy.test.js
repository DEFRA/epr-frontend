import { getGlobalDispatcher, ProxyAgent } from 'undici'
import { afterEach, describe, expect, test } from 'vitest'
import { config } from '~/src/config/config.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'

describe(setupProxy, () => {
  afterEach(() => {
    config.set('httpProxy', null)
  })

  test('should not setup proxy if the environment variable is not set', () => {
    config.set('httpProxy', null)
    setupProxy()

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBeUndefined()

    const undiciDispatcher = getGlobalDispatcher()

    expect(undiciDispatcher).not.toBeInstanceOf(ProxyAgent)
  })

  test('should setup proxy if the environment variable is set', () => {
    config.set('httpProxy', 'http://localhost:8080')
    setupProxy()

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBe('http://localhost:8080')

    const undiciDispatcher = getGlobalDispatcher()

    expect(undiciDispatcher).toBeInstanceOf(ProxyAgent)
  })
})
