import process from 'node:process'

import { createLogger } from '#server/common/helpers/logging/logger.js'
import { startServer } from '#server/common/helpers/start-server.js'

await startServer()

process.on('unhandledRejection', (reason) => {
  const logger = createLogger()
  const err = reason instanceof Error ? reason : new Error(String(reason))
  logger.error({ message: 'Unhandled rejection', err })
  process.exitCode = 1
})
