import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const deleteGetController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const { t: localise } = request
    const session = request.auth.credentials

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

    const [{ registration }, prn] = await Promise.all([
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      ),
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        session.idToken
      )
    ])

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(basePath)
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('lprns/delete', {
      pageTitle: localise('lprns:delete:pageTitle', { noteType }),
      heading: localise('lprns:delete:heading', { noteType }),
      warningText: localise('lprns:delete:warningText', { noteType }),
      confirmButton: localise('lprns:delete:confirmButton', { noteType }),
      backUrl: `${basePath}/${prnId}`
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const deletePostController = {
  async handler(request, h) {
    if (!config.get('featureFlags.lprns')) {
      throw Boom.notFound()
    }

    const { organisationId, registrationId, accreditationId, prnId } =
      request.params
    const session = request.auth.credentials

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

    const prn = await fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      session.idToken
    )

    if (prn.status !== 'awaiting_authorisation') {
      return h.redirect(basePath)
    }

    try {
      await updatePrnStatus(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        { status: 'cancelled' },
        session.idToken
      )

      return h.redirect(basePath)
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete PRN')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to delete PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
