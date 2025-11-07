import { config } from '#config/config.js'
import { fetchWithAuthInterception } from '#server/common/helpers/auth/fetch.js'

/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  async handler(request, h) {
    if (request.auth.isAuthenticated) {
      const { currentRelationship } = request.server.app.defraId
      const baseUrl = config.get('eprBackendUrl')
      const url = `${baseUrl}/v1/organisations/${currentRelationship.orgId}/defra-id-org-id`
      const { data, view } = await fetchWithAuthInterception(url, request, h)

      if (view) {
        return view
      }

      if (data.length === 1) {
        return h.redirect(`/organisations/${data[0].id}`)
      }

      // @todo: handle multiple matches by DefraIdOrgId
    }

    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'Home',
      defraId: request.server.app.defraId
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
