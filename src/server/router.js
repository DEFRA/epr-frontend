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
import { organisations } from '#server/organisations/index.js'
import { registrations } from '#server/registrations/index.js'
import { summaryLogUpload } from '#server/summary-log-upload/index.js'
import { summaryLog } from '#server/summary-log/index.js'
import inert from '@hapi/inert'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
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
        registrations,
        summaryLog,
        summaryLogUpload
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
