import Boom from '@hapi/boom'

import { config } from '#config/config.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { fetchPackagingRecyclingNote } from './helpers/fetch-packaging-recycling-note.js'
import { updatePrnStatus } from './helpers/update-prn-status.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelGetController = {
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

    if (prn.status !== 'awaiting_cancellation') {
      return h.redirect(basePath)
    }

    const { noteType } = getNoteTypeDisplayNames(registration)

    return h.view('lprns/cancel', {
      pageTitle: localise('lprns:cancel:pageTitle', { noteType }),
      heading: localise('lprns:cancel:heading', { noteType }),
      bodyText: localise('lprns:cancel:bodyText', { noteType }),
      warningText: localise('lprns:cancel:warningText'),
      confirmButton: localise('lprns:cancel:confirmButton'),
      backUrl: `${basePath}/${prnId}`
    })
  }
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const cancelPostController = {
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

    if (prn.status !== 'awaiting_cancellation') {
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

      request.yar.set('prnCancelled', {
        id: prnId,
        prnNumber: prn.prnNumber
      })

      return h.redirect(`${basePath}/${prnId}/cancelled`)
    } catch (error) {
      request.logger.error({ error }, 'Failed to cancel PRN')

      if (error.isBoom) {
        throw error
      }

      throw Boom.badImplementation('Failed to cancel PRN')
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
