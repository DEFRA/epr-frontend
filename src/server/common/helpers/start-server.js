import { enableAuditing } from '@defra/cdp-auditing'
import { config } from '#config/config.js'

import { createServer } from '#server/index.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'

async function startServer() {
  let server

  try {
    enableAuditing(config.get('audit.isEnabled'))
    server = await createServer()
    await server.start()

    server.logger.info({ message: 'Server started successfully' })
    server.logger.info({
      message: `Access your frontend on http://localhost:${config.get('port')}`
    })
  } catch (error) {
    const logger = createLogger()
    logger.error({ message: 'Server failed to start :(', err: error })
  }

  return server
}

export { startServer }
