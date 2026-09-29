import { bootstrap } from 'global-agent'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { config } from '#config/config.js'
const logger = createLogger()

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for http clients that create their own agents.
 * Node's built-in fetch is proxied by Node itself (NODE_USE_ENV_PROXY).
 */
export function setupProxy() {
  const proxyUrl = config.get('httpProxy')

  if (proxyUrl) {
    logger.info({ message: 'setting up global proxies' })

    // global-agent patches every new https.Agent() to inherit proxy config.
    // This is needed because @hapi/wreck (used internally by @hapi/bell for
    // OAuth token exchange) creates private Agent instances that bypass the
    // global agent. NODE_USE_ENV_PROXY only patches the global agent, so
    // without global-agent, Bell's requests skip the proxy and get blocked.
    // PINNED TO v3 — v4 has broken TLS handling that causes
    // ERR_TLS_CERT_ALTNAME_MISMATCH in production (issues #82, #83).
    bootstrap()
    global.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
  }
}
