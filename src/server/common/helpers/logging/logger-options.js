import { ecsFormat } from '@elastic/ecs-pino-format'
import { config } from '#config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

/**
 * @typedef {Error & {isBoom: true, output: {statusCode: number, payload: object}, data?: object}} BoomError
 */

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')
const cdpEnvironment = config.get('cdpEnvironment')
const isProductionEnvironment = cdpEnvironment === 'prod'

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  serializers: {
    /** @param {unknown} err */
    err: (err) => {
      if (!(err instanceof Error)) {
        return err
      }

      const errorObj = {
        message: err.message,
        stack_trace: err.stack,
        type: err.name
      }

      // Include Boom error details for better debugging (non-prod only)
      // @ts-expect-error - check for Boom error before casting
      if (!isProductionEnvironment && err.isBoom && err.output) {
        /** @type {BoomError} */
        const boomErr = /** @type {BoomError} */ (err)
        errorObj.statusCode = boomErr.output.statusCode
        errorObj.payload = boomErr.output.payload

        if (boomErr.data) {
          try {
            errorObj.message = `${err.message} | data: ${JSON.stringify(boomErr.data)}`
          } catch {
            errorObj.message = `${err.message} | data: [unserializable]`
          }
        }
      }

      return errorObj
    }
  },
  // @fixme: code coverage
  /* v8 ignore next 8 */
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */
