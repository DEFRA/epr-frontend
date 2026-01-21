import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchOrganisationById } from '#server/common/helpers/organisations/fetch-organisation-by-id.js'

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const prns = {
  plugin: {
    name: 'prns',
    register(server) {
      server.route([
        {
          handler: async (request, h) => {
            const { organisationId, registrationId } = request.params

            const session = request.auth.credentials

            const { organisation, registration, accreditation, producers } =
              await fetchData(session, organisationId, registrationId)

            return h.view('prns/index', createViewModel({ registration, producers }))
          },
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
        },
        {
          handler: async (request, h) => {
            console.log('PRN create form submitted', request.payload)
            const { organisationId, registrationId } = request.params

            const session = request.auth.credentials

            const { organisation, registration, accreditation, producers } =
              await fetchData(session, organisationId, registrationId)

            const validIssuee = producers.some(( { id } ) => id === request.payload.issuee)
            const validTonnage = request.payload.tonnage > 0 // validate whole number

            const issuerNotesMaxLength = 200
            const validIssuerNotes = !request.payload.issuerNotes || request.payload.issuerNotes.length <= issuerNotesMaxLength

            // must match order inputs appear on page for errors in error summary to be correctly ordered
            const errors = {
              tonnage: validTonnage ? null : 'Enter the tonnage for this PRN', // TODO localise
              issuee: validIssuee ? null : 'Select who this PRN will be issued to', // TODO localise
              issuerNotes: validIssuerNotes ? null : `Issuer notes must be ${issuerNotesMaxLength} characters or fewer` 
            }
            const answers = request.payload || {}

            const hasErrors = Object.values(errors).some((value) => !!value)

            // TODO if !hasErrors then POST(?) to backend and redirect to confirmation page
            // how might the user change answers?

            // rendering from the POST gives the "do you want to resubmit" browser prompt
            // suggest storing in session data and redirecting to the GET route instead
            // then updating the GET route to read errors/answers from session data (if present)
            // also need to clear session data after POSTING a valid form to avoid showing stale data
            // and to avoid session growth
            return h.view('prns/index', createViewModel({ registration, producers, errors, answers }))
          },
          method: 'POST',
          path: '/organisations/{organisationId}/registrations/{registrationId}/create-prn'
        }
      ])
    }
  }
}

async function fetchData(session, organisationId, registrationId) {
  const organisation = await fetchOrganisationById(
    organisationId,
    session.idToken
  )

  const registration = organisation.registrations?.find(
    ({ id }) => id === registrationId
  )

  if (!registration) {
    const message = 'Registration not found'
    request.logger.warn({ registrationId }, message)
    throw Boom.notFound(message)
  }

  const { accreditationId } = registration

  if (!accreditationId) {
    const message = 'Not accredited for this registration'
    request.logger.warn({ registrationId }, message)
    throw Boom.notFound(message)
  }

  const accreditation = organisation.accreditations?.find(
    ({ id }) => id === accreditationId
  )

  if (!accreditation) {
    const message = 'Accreditation not found'
    request.logger.warn({ accreditationId }, message)
    throw Boom.notFound(message)
  }

  const producers = [
    { id: 'producer-1', name: 'Producer One Ltd' },
    { id: 'producer-2', name: 'Producer Two Ltd' },
    { id: 'compliance-scheme-1', name: 'Compliance Scheme One' }
  ] // TODO fetch real producers

  return { organisation, registration, accreditation, producers }
}

function siteName(registration) {
  const isExporter = registration.wasteProcessingType === 'exporter'
  return isExporter
    ? null
    : (registration.site?.address?.line1 ??
        localise('registrations:unknownSite'))
}

function createViewModel({ registration, producers, errors = {}, answers = {} }) {
  return {
    pageTitle: 'Create PRN', // TODO localise
    siteName: siteName(registration),
    material: getDisplayMaterial(registration),
    producers: producers.map(({ id, name }) => ({ text: name, value: id })),
    wasteBalance: '53.40', // TODO fetch real balance
    answers,
    errors
  }
}