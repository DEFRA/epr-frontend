import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

export const regulators = {
  plugin: {
    name: 'regulators',
    register(server) {
      server.route([
        {
          async handler(request, h) {
            const session = request.auth.credentials

            const organisations = await fetchJsonFromBackend(
              `/v1/organisations`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${session.idToken}`
                }
              }
            )

            const viewData = {
              organisations: organisations.map(toSlimOrganisation)
            }

            return h.view('regulators/home', viewData)
          },
          method: 'GET',
          path: '/regulators/home'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

const toSlimOrganisation = ({
  id,
  orgId,
  companyDetails: { name, registrationNumber },
  status,
  submittedToRegulator
}) => ({
  id,
  orgId,
  name,
  registrationNumber,
  status,
  regulator: submittedToRegulator
})
