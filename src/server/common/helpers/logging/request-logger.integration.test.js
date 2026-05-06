import pino from 'pino'
import { afterEach, describe, expect, it } from 'vitest'

import { config } from '#config/config.js'
import { loggerOptions } from './logger-options.js'
import { createLogger } from './logger.js'
import { createLogCaptureServer } from '#server/common/test-helpers/log-capture-server.js'

describe('request-logger integration (hapi-pino + pino + ecs format)', () => {
  afterEach(() => {
    config.reset('cdpEnvironment')
  })

  it('should emit a canonical IndexedLogProperties payload through hapi-pino unchanged', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, findLine } = await createLogCaptureServer()
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
    const out = findLine((l) => l.message === 'test event')

    expect(out).toMatchObject({
      message: 'test event',
      event: { action: 'test_event' },
      'log.level': 'info'
    })
  })

  it('should set ECS service.name to the technical service identifier', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, findLine } = await createLogCaptureServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.info({ message: 'svc-name-check' })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine((l) => l.message === 'svc-name-check')

    expect(out['service.name']).toBe('epr-frontend')
  })

  it('should bind ECS http.* and url.* on the per-request child logger (no flat req)', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, findLine } = await createLogCaptureServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.info({ message: 'handler entered' })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine((l) => l.message === 'handler entered')

    expect(out).toMatchObject({
      http: { request: { method: 'GET' } },
      url: { path: '/test' }
    })
    expect(out.http.request.id).toStrictEqual(expect.any(String))
    expect(out).not.toHaveProperty('req')
  })

  it('should emit ECS http.response.* and url.path on the hapi-pino response auto-log', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, findLine } = await createLogCaptureServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: () => 'ok'
    })

    await server.inject('/test')
    const out = findLine((l) => l.url?.path === '/test' && l.http?.response)

    expect(out).toMatchObject({
      http: { response: { status_code: 200 } },
      url: { path: '/test' }
    })
    expect(out).not.toHaveProperty('req')
    expect(out).not.toHaveProperty('res')
  })

  it('should map a logged err to ECS error.* when cdpEnvironment is non-prod', async () => {
    config.set('cdpEnvironment', 'dev')
    const { server, findLine } = await createLogCaptureServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.error({ message: 'boom path', err: new Error('boom') })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine((l) => l.message === 'boom path')

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
    const { server, findLine } = await createLogCaptureServer()
    server.route({
      method: 'GET',
      path: '/test',
      handler: (request) => {
        request.logger.error({ message: 'boom path', err: new Error('boom') })
        return 'ok'
      }
    })

    await server.inject('/test')
    const out = findLine((l) => l.message === 'boom path')

    expect(out?.error).toBeDefined()
    expect(out?.error).not.toHaveProperty('stack_trace')
  })

  it('should land trace.id on the wire when bound via logger.child (mixin / hapi-tracing pattern)', () => {
    // Documents the wire shape produced by the trace.id binding emitted by
    // loggerOptions.mixin() when @defra/hapi-tracing has a trace id. CDP's
    // indexed-fields allowlist does not include a top-level `trace.id` (only
    // `amazon/trace.id` which is CDP-reserved), so the trace context emitted
    // here is dropped at ingest. This test pins the current wire shape so any
    // future change is visible.
    const lines = []
    const stream = { write: (s) => lines.push(s) }
    const { transport: _transport, ...rest } = loggerOptions
    const captureLogger = pino(
      { ...rest, enabled: true, level: 'trace' },
      stream
    )

    const child = captureLogger.child({ trace: { id: 'trace-abc' } })
    child.info({ message: 'queued' })

    const out = JSON.parse(lines[0])
    expect(out).toMatchObject({
      message: 'queued',
      trace: { id: 'trace-abc' }
    })
  })

  it.each(['info', 'error', 'warn', 'debug', 'trace', 'fatal'])(
    'exposes %s on the createLogger surface',
    (method) => {
      const log = createLogger()

      expect(log[method]).toBeTypeOf('function')
    }
  )
})
