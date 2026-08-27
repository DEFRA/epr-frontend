/** @import { HapiRequest } from '#server/common/hapi-types.js'; */
import { formatTonnage } from '#config/nunjucks/filters/format-tonnage.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'

import {
  buildDetailRows,
  buildEventView,
  buildOverviewRows
} from './helpers/build-preview-views.js'
import { eventName } from './helpers/ledger-view.js'
import { fetchLedgerEvents } from './helpers/fetch-ledger-events.js'

/**
 * Everything the three ledger views share: the ledger's own events, the names
 * the page calls things by, and the address the ledger sits at.
 * @param {HapiRequest & {params: object}} request
 */
const loadLedger = async (request) => {
  const session = request.auth.credentials
  const { organisationId, registrationId, accreditationId } = request.params

  const { registration, rawAccreditation } =
    await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.backendToken
    )

  const events = await fetchLedgerEvents({
    organisationId,
    registrationId,
    accreditationId,
    backendToken: session.backendToken
  })

  const { t: localise } = request
  const { noteType } = getNoteTypeDisplayNames(registration)

  const ledgerPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`

  return {
    accreditation: rawAccreditation,
    caption: localise('waste-balance-ledger:accreditationCaption', {
      accreditationNumber: rawAccreditation?.accreditationNumber ?? ''
    }),
    events,
    ledgerPath,
    localise,
    noteType,
    registration
  }
}

/**
 * The ledger as it reads on the accreditation entry page: what moved the
 * available balance, and where that balance now stands.
 */
export const overviewController = {
  async handler(request, h) {
    const {
      accreditation,
      events,
      ledgerPath,
      localise,
      noteType,
      registration
    } = await loadLedger(request)

    const latest = events[events.length - 1]

    return h.view('waste-balance-ledger/overview', {
      allEventsUrl: `${ledgerPath}/waste-balance-ledger/all`,
      backUrl: request.localiseUrl(ledgerPath),
      caption: localise('waste-balance-ledger:entryCaption', {
        registrationNumber: registration.registrationNumber ?? ''
      }),
      entryHeading: localise('waste-balance-ledger:entryHeading', {
        accreditationNumber: accreditation?.accreditationNumber ?? ''
      }),
      heading: localise('waste-balance-ledger:heading'),
      pageTitle: localise('waste-balance-ledger:pageTitle'),
      rows: buildOverviewRows({ events, ledgerPath, localise, noteType }),
      summaryRows: [
        {
          key: { text: 'Material' },
          value: { text: registration.material ?? 'Plastic' }
        },
        {
          key: { text: localise('waste-balance-ledger:availableBalance') },
          value: {
            text: `${formatTonnage(latest?.balance.closing.available ?? 0)} tonnes`
          }
        }
      ]
    })
  }
}

/** Every event the ledger holds. */
export const allEventsController = {
  async handler(request, h) {
    const { caption, events, ledgerPath, localise, noteType } =
      await loadLedger(request)

    return h.view('waste-balance-ledger/all-events', {
      backUrl: request.localiseUrl(ledgerPath),
      caption,
      heading: localise('waste-balance-ledger:allEventsHeading'),
      pageTitle: localise('waste-balance-ledger:allEventsHeading'),
      rows: buildDetailRows({ events, ledgerPath, localise, noteType })
    })
  }
}

/** One event, stated in full. */
export const eventController = {
  async handler(request, h) {
    const { events, ledgerPath, localise, noteType } = await loadLedger(request)

    const number = Number(request.params.number)
    const event = events.find((candidate) => candidate.number === number)

    if (!event) {
      throw notFound('No such ledger event', 'LEDGER_EVENT_NOT_FOUND')
    }

    const view = buildEventView({ event, ledgerPath, localise, noteType })
    const eventUrl = (/** @type {number} */ n) =>
      `${ledgerPath}/waste-balance-ledger/events/${n}`
    const neighbour = (/** @type {number} */ n) => {
      const found = events.find((candidate) => candidate.number === n)

      return found
        ? {
            href: eventUrl(n),
            labelText: `${n}. ${eventName({ kind: found.kind, localise, noteType })}`
          }
        : undefined
    }

    return h.view('waste-balance-ledger/event', {
      backUrl: request.localiseUrl(`${ledgerPath}/waste-balance-ledger/all`),
      caption: localise('waste-balance-ledger:eventCaption', { number }),
      heading: view.title,
      next: neighbour(number + 1),
      pageTitle: view.title,
      previous: neighbour(number - 1),
      rows: view.rows
    })
  }
}
