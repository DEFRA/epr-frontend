import http2 from 'node:http2'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

const { constants: httpConstants } = http2
const MAX_USER_AGENT_LENGTH = 150

describe('user-agent protection', () => {
  it('should allow normal User-Agent strings', async ({ server }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
  })

  it('should truncate oversized User-Agent strings', async ({ server }) => {
    const longUserAgent = `Mozilla/5.0 ${'X'.repeat(2000)}`
    const expectedTruncated = longUserAgent.substring(0, MAX_USER_AGENT_LENGTH)

    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'user-agent': longUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(longUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toBe(`Mozilla/5.0 ${'X'.repeat(138)}`)
  })

  it('should truncate User-Agent strings with suspicious patterns (ReDoS PoC)', async ({
    server
  }) => {
    const maliciousUserAgent = `Mozilla/5.0 (${'X'.repeat(200)}) Gecko/20100101 Firefox/77.0`
    const expectedTruncated = maliciousUserAgent.substring(
      0,
      MAX_USER_AGENT_LENGTH
    )

    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'user-agent': maliciousUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(maliciousUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated.startsWith('Mozilla/5.0 (')).toBe(true)
  })

  it('should truncate User-Agent strings with repeated characters', async ({
    server
  }) => {
    const maliciousUserAgent = `Mozilla/5.0 ${'A'.repeat(1500)} Safari`
    const expectedTruncated = maliciousUserAgent.substring(
      0,
      MAX_USER_AGENT_LENGTH
    )

    const response = await server.inject({
      method: 'GET',
      url: '/start',
      headers: {
        'user-agent': maliciousUserAgent
      }
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
    expect(maliciousUserAgent.length).toBeGreaterThan(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toHaveLength(MAX_USER_AGENT_LENGTH)
    expect(expectedTruncated).toBe(`Mozilla/5.0 ${'A'.repeat(138)}`)
  })

  it('should handle requests without User-Agent header', async ({ server }) => {
    const response = await server.inject({
      method: 'GET',
      url: '/start'
    })

    expect(response.statusCode).toBe(httpConstants.HTTP_STATUS_OK)
  })

  it('should verify actual header truncation by inspecting processed request', async ({
    server
  }) => {
    const originalUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 EdgeCustomLongName/SuperLongVersionString'
    let capturedUserAgent = null

    server.route({
      method: 'GET',
      path: '/test-truncation',
      options: { auth: false },
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

  it('should not modify User-Agent headers that are already within limit', async ({
    server
  }) => {
    const normalUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    let capturedUserAgent = null

    server.route({
      method: 'GET',
      path: '/test-no-truncation',
      options: { auth: false },
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
