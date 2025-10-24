import process from 'node:process'

import { createLogger } from '#server/common/helpers/logging/logger.js'
import { startServer } from '#server/common/helpers/start-server.js'

await startServer()

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
