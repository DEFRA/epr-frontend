import Boom from '@hapi/boom'
import fetch from 'node-fetch'
import { getUserSession } from '#server/common/helpers/auth/get-user-session.js'

export async function fetchWithAuthHeader(url, request) {
  const accessToken = (await getUserSession(request)).token
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const data = await response.json()

  return { response, data }
}

function getOrganisationLinkHref(id, redirectUrl) {
  return `/organisations/${id}/link?redirectUrl=${redirectUrl}`
}

export async function fetchWithAuthInterception(url, request, h) {
  request.logger.info({ url }, 'auth: fetchWithAuthInterception')

  try {
    const { data, response } = await fetchWithAuthHeader(url, request)

    if (!response.ok) {
      throw Boom.unauthorized()
    }

    if (data.action === 'link-organisations') {
      const { path: redirectUrl } = request
      const { defraId, isCurrentOrganisationLinked, organisations } = data
      const hasManyOrganisations = organisations.length > 1
      const entityName = hasManyOrganisations ? 'organisations' : 'organisation'
      const shouldShowTableOfUnlinkedOrganisations =
        hasManyOrganisations && !isCurrentOrganisationLinked
      const otherRelationships = defraId.otherRelationships.map(
        ({ defraIdOrgName, defraIdRelationshipId }) => [
          { text: defraIdOrgName },
          {
            html: `<a href="http://localhost:3200/cdp-defra-id-stub/register/${defraId.userId}/relationship/${defraIdRelationshipId}/current">Switch</a>`
          }
        ]
      )

      const commonTemplateData = {
        defraIdOrgName: defraId.orgName,
        entityName,
        isCurrentOrganisationLinked,
        otherRelationships,
        shouldShowTableOfUnlinkedOrganisations
      }

      const templateData = shouldShowTableOfUnlinkedOrganisations
        ? {
            ...commonTemplateData,
            organisations: organisations.map(({ name, orgId, id }) => [
              { text: name ?? 'data missing' },
              { text: orgId ?? 'data missing' },
              { text: id ?? 'data missing' },
              {
                html: `<a href="${getOrganisationLinkHref(id, redirectUrl)}">Link</a>`
              }
            ])
          }
        : {
            ...commonTemplateData,
            organisation: {
              name: organisations[0].name,
              orgId: organisations[0].orgId,
              id: organisations[0].id,
              linkHref: getOrganisationLinkHref(
                organisations[0].id,
                redirectUrl
              ),
              addHref: `http://localhost:3200/cdp-defra-id-stub/register/${defraId.userId}/relationship`
            }
          }

      return {
        data,
        response,
        view: h.view('organisation/link', {
          pageTitle: 'Link Organisation',
          heading: 'Link Organisation',
          defraId: request.server.app.defraId,
          ...templateData
        })
      }
    }

    return { data, response }
  } catch (error) {
    request.logger.error(error, 'auth: fetchWithAuthInterception')

    throw error
  }
}
