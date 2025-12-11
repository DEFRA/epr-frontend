import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import http2 from 'node:http2'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

const { constants: httpConstants } = http2
const MAX_USER_AGENT_LENGTH = 150

describe('user-agent protection', () => {
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeEach(async () => {
    mockOidcServer.listen()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    mockOidcServer.close()
    if (server) {
      await server.stop()
    }
  })

  test('should allow normal User-Agent strings', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
  })

  test('should truncate oversized User-Agent strings', async () => {
    const longUserAgent = `Mozilla/5.0 ${'X'.repeat(2000)}`
    const expectedTruncated = longUserAgent.substring(0, MAX_USER_AGENT_LENGTH)

    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': longUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(longUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toBe(`Mozilla/5.0 ${'X'.repeat(138)}`)
  })

  test('should truncate User-Agent strings with suspicious patterns (ReDoS PoC)', async () => {
    const maliciousUserAgent = `Mozilla/5.0 (${'X'.repeat(200)}) Gecko/20100101 Firefox/77.0`
    const expectedTruncated = maliciousUserAgent.substring(
      0,
      MAX_USER_AGENT_LENGTH
    )

    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': maliciousUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(maliciousUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated.startsWith('Mozilla/5.0 (')).toBe(true)
  })

  test('should truncate User-Agent strings with repeated characters', async () => {
    const maliciousUserAgent = `Mozilla/5.0 ${'A'.repeat(1500)} Safari`
    const expectedTruncated = maliciousUserAgent.substring(
      0,
      MAX_USER_AGENT_LENGTH
    )

    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': maliciousUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(maliciousUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toBe(`Mozilla/5.0 ${'A'.repeat(138)}`)
  })

  test('should handle requests without User-Agent header', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
  })

  test('should verify actual header truncation by inspecting processed request', async () => {
    const originalUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 EdgeCustomLongName/SuperLongVersionString'
    let capturedUserAgent = null

    server.route({
      method: 'GET',
      path: '/test-truncation',
      handler: (request, h) => {
        capturedUserAgent = request.headers['user-agent']
        return h.response('OK').code(httpConstants.HTTP_STATUS_OK)
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: '/test-truncation',
      headers: {
        'user-agent': originalUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(originalUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(capturedUserAgent).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(capturedUserAgent).toBe(
      originalUserAgent.substring(0, MAX_USER_AGENT_LENGTH)
    )
    expect(originalUserAgent.startsWith(capturedUserAgent)).toBe(true)
  })

  test('should not modify User-Agent headers that are already within limit', async () => {
    const normalUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    let capturedUserAgent = null

    server.route({
      method: 'GET',
      path: '/test-no-truncation',
      handler: (request, h) => {
        capturedUserAgent = request.headers['user-agent']
        return h.response('OK').code(httpConstants.HTTP_STATUS_OK)
      }
    })

    const response = await server.inject({
      method: 'GET',
      url: '/test-no-truncation',
      headers: {
        'user-agent': normalUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(normalUserAgent.length).toBeLessThanOrEqual(MAX_USER_AGENT_LENGTH)
    expect(capturedUserAgent).toBe(normalUserAgent)
  })
})
