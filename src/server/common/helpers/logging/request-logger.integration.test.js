import hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { afterEach, describe, expect, it } from 'vitest'

import { loggerOptions } from './logger-options.js'
import { config } from '#config/config.js'

const newServer = async () => {
  const lines = []
  const stream = { write: (s) => lines.push(s) }
  const { transport: _transport, ...rest } = loggerOptions

  const server = hapi.server({ port: 0 })
  await server.register({
    plugin: hapiPino,
    options: { ...rest, enabled: true, level: 'trace', stream }
  })

  return { server, lines }
}

const findLine = (lines, predicate) =>
  lines.map((s) => JSON.parse(s)).find(predicate)

describe('request-logger integration (hapi-pino + pino + ecs format)', () => {
  afterEach(() => {
    config.reset('cdpEnvironment')
  })

  it('should emit a canonical IndexedLogProperties payload through hapi-pino unchanged', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, lines } = await newServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.info({
          message: 'test event',
          event: { action: 'test_event' }
        })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine(lines, (l) => l.message === 'test event')

    expect(out).toMatchObject({
      message: 'test event',
      event: { action: 'test_event' },
      'log.level': 'info'
    })
  })

  it('should map a logged err to ECS error.* when cdpEnvironment is non-prod', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, lines } = await newServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.error({ message: 'boom path', err: new Error('boom') })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine(lines, (l) => l.message === 'boom path')

    expect(out?.error).toStrictEqual(
      expect.objectContaining({
        type: 'Error',
        message: 'boom',
        stack_trace: expect.stringContaining('Error: boom')
      })
    )
  })

  it('should strip error.stack_trace when cdpEnvironment is prod', async () => {
    config.set('cdpEnvironment', 'prod')
    const { server, lines } = await newServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.error({ message: 'boom path', err: new Error('boom') })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine(lines, (l) => l.message === 'boom path')

    expect(out?.error).toBeDefined()
    expect(out?.error).not.toHaveProperty('stack_trace')
  })
})
