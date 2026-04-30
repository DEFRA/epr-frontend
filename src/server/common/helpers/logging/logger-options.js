import { ecsFormat } from '@elastic/ecs-pino-format'
import { config, isProductionEnvironment } from '#config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

const ecsOptions = ecsFormat({ serviceVersion, serviceName })
const ecsLog =
  /** @type {(obj: object) => { error?: { stack_trace?: string } }} */ (
    ecsOptions.formatters?.log
  )

const stripStackTraceInProd = (/** @type {object} */ obj) => {
  const out = ecsLog(obj)
  if (isProductionEnvironment() && out.error?.stack_trace) {
    delete out.error.stack_trace
  }
  return out
}

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsOptions,
    formatters: {
      ...ecsOptions.formatters,
      log: stripStackTraceInProd
    }
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  logRequestStart: true,
  ignorePaths: ['/health'],
  ignoreTags: ['static'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
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
