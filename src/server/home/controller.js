import { config } from '#config/config.js'
import { fetchWithAuthInterception } from '#server/common/helpers/auth/fetch.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { auth, server, t: localise } = request
    if (auth.isAuthenticated) {
      const { currentRelationship } = server.app.defraId
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
      pageTitle: localise('home:pageTitle'),
      heading: 'Home',
      defraId: server.app.defraId
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
