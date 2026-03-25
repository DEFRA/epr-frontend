import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { config } from '#config/config.js'
const logger = createLogger()

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for undici (which backs native fetch).
 */
export function setupProxy() {
  const proxyUrl = config.get('httpProxy')

  if (proxyUrl) {
    logger.info('setting up global proxy')

    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  }
}
