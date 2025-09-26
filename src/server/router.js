import inert from '@hapi/inert'

import { health } from '~/src/server/health/index.js'
import { home } from '~/src/server/home/index.js'
import { registration } from '~/src/server/registration/index.js'
import { summaryLogUpload } from '~/src/server/summary-log-upload/index.js'
import { summaryLogUploadProgress } from '~/src/server/summary-log-upload-progress/index.js'
import { serveStaticFiles } from '~/src/server/common/helpers/serve-static-files.js'

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
        home,
        registration,
        summaryLogUpload,
        summaryLogUploadProgress
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
