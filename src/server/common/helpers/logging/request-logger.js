import hapiPino from 'hapi-pino'

import { loggerOptions } from '#server/common/helpers/logging/logger-options.js'

export const requestLogger = {
  plugin: hapiPino,
  options: loggerOptions
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { Options } from 'hapi-pino'
 */
