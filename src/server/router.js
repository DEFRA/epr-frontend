import { config } from '#config/config.js'
import { account } from '#server/account/index.js'
import { auth } from '#server/auth/index.js'
import { serveStaticFiles } from '#server/common/helpers/serve-static-files.js'
import { contact } from '#server/contact/index.js'
import { cookies } from '#server/cookies/index.js'
import { health } from '#server/health/index.js'
import { home } from '#server/home/index.js'
import { loggedOut } from '#server/logged-out/index.js'
import { login } from '#server/login/index.js'
import { logout } from '#server/logout/index.js'
import { notFound } from '#server/not-found/index.js'
import { organisations } from '#server/organisations/index.js'
import { prns } from '#server/prns/index.js'
import { registrations } from '#server/registrations/index.js'
import { regulators } from '#server/regulators/index.js'
import { reports } from '#server/reports/index.js'
import { summaryLogUpload } from '#server/summary-log-upload/index.js'
import { summaryLog } from '#server/summary-log/index.js'
import inert from '@hapi/inert'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        account,
        auth,
        contact,
        cookies,
        home,
        loggedOut,
        login,
        logout,
        organisations,
        prns,
        registrations,
        ...(config.get('featureFlags.regulatorAccess') ? [regulators] : []),
        reports,
        summaryLog,
        summaryLogUpload
      ])

      // Static assets
      await server.register([serveStaticFiles])

      // Reads last because it is the fallback. Its position here decides
      // nothing: hapi files each route into the match trie by segment kind,
      // and consults the wildcard slot after the literal and parameter ones,
      // so a real route wins against `/{any*}` whenever it registers.
      await server.register([notFound])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
