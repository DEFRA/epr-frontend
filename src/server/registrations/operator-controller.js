import { config } from '#config/config.js'
import { hasLedgerReadScope, hasWriteScope } from '#server/auth/scopes.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { findRecordIds } from '#server/common/helpers/natural-keys/find-record-ids.js'
import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { isAccreditationViewActive } from '#server/common/helpers/organisations/accreditation-helpers.js'
import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'
import {
  accreditationIn,
  latestAccreditationYear
} from '#server/common/helpers/organisations/registration-in-view.js'
import { getNoteTypeDisplayNames } from '#server/common/helpers/prns/registration-helpers.js'
import { buildReapplyAccreditation } from '#server/common/helpers/reapply-accreditation/build-reapply-accreditation.js'
import { redirectPreservingMethod } from '#server/common/helpers/redirect-preserving-method.js'
import {
  showsDecemberBalance,
  toDecemberBalanceBreakdown
} from '#server/common/helpers/waste-balance/december-balance.js'
import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { year as toYear } from '#server/common/helpers/year.js'
import { getStatusClass } from '#server/organisations/helpers/status-helpers.js'
import {
  accreditationPath,
  organisationPath,
  registrationPath,
  reportsListPath
} from '#server/reports/helpers/report-paths.js'
import { capitalize } from 'lodash-es'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { AccreditationView, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { ReapplyLink } from '#server/common/helpers/reapply-accreditation/build-reapply-accreditation.js'
 * @import { DecemberBalanceBreakdown } from '#server/common/helpers/waste-balance/december-balance.js'
 * @import { WasteBalance } from '#server/common/helpers/waste-balance/types.js'
 * @import { AccreditationKeys, RegistrationKeys } from '#server/reports/helpers/report-paths.js'
 */

/** @typedef {{ href: string; text: string }} Link */

/**
 * @typedef {{
 *   reference: string | undefined;
 *   status: string;
 *   class: string;
 * }} TaggedReference
 */

/**
 * @typedef {(
 *   { exists: true } & TaggedReference
 *   | { exists: false }
 * )} MaybeTaggedReference
 */

/**
 * @typedef {{
 *   accreditation: MaybeTaggedReference;
 *   backUrl: string;
 *   contactRegulatorUrl: string;
 *   hasSiteName: boolean;
 *   isExporter: boolean;
 *   material: string;
 *   pageTitle: string;
 *   prns: { description: string; link: Link; manageLink: Link; title: string } | null;
 *   reapplyAccreditation: ReapplyLink | null;
 *   registration: TaggedReference;
 *   reports: { link: Link };
 *   siteName: string | null;
 *   uploadSummaryLogUrl: string;
 *   wasteBalance: {
 *     availableAmount: number | null;
 *     noteTypePlural: 'PRNs' | 'PERNs';
 *     breakdown: DecemberBalanceBreakdown | null;
 *   };
 *   wasteBalanceLedgerUrl: string | null;
 * }} RegistrationViewModel
 */

/**
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   year: string
 * }} OperatorAccreditationParams
 */

/**
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string
 * }} OperatorRegistrationParams
 */

/**
 * @param {{ reference: string | undefined; status: string }} params
 * @returns {TaggedReference}
 */
const buildTaggedReference = ({ reference, status }) => ({
  reference,
  status: capitalize(status),
  class: getStatusClass(status)
})

/**
 * The accreditation's tag, or none once it is no longer live.
 * @param {AccreditationView} accreditation
 * @returns {MaybeTaggedReference}
 */
const toAccreditationTag = (accreditation) =>
  isAccreditationViewActive(accreditation)
    ? {
        ...buildTaggedReference({
          reference: accreditation.accreditationNumber,
          status: accreditation.status.current
        }),
        exists: true
      }
    : { exists: false }

/**
 * A string, or its read-only variant for a session holding no write scope.
 * @param {HapiRequest} request
 * @param {string} key
 * @returns {string}
 */
const keyForSession = (request, key) =>
  hasWriteScope(request.auth.credentials) ? key : `${key}ReadOnly`

/**
 * The site's first address line, for a reprocessor.
 * @param {RegistrationView} registration
 * @param {HapiRequest['t']} localise
 * @returns {string | null}
 */
const toSiteName = (registration, localise) => {
  if (registration.wasteProcessingType === 'exporter') {
    return null
  }

  const { address } = registration.site

  return 'line1' in address
    ? address.line1
    : localise('registrations:unknownSite')
}

/**
 * The ledger link under a record's path, for a session that may read it.
 * @param {HapiRequest} request
 * @param {string} path
 * @returns {string | null}
 */
const toLedgerUrl = (request, path) =>
  hasLedgerReadScope(request.auth.credentials)
    ? request.localiseUrl(`${path}/waste-balance-ledger`)
    : null

/**
 * @param {HapiRequest} request
 * @param {{ noteType: 'PRN' | 'PERN', noteTypePlural: 'PRNs' | 'PERNs' }} noteTypes
 * @param {string} notesPath
 * @returns {NonNullable<RegistrationViewModel['prns']>}
 */
const toPrns = (request, { noteType, noteTypePlural }, notesPath) => {
  const { t: localise } = request

  return {
    description: localise(
      keyForSession(request, 'registrations:notes.description'),
      { noteTypePlural }
    ),
    link: {
      href: request.localiseUrl(`${notesPath}/create`),
      text: localise('registrations:notes.createNew', { noteType })
    },
    manageLink: {
      href: request.localiseUrl(notesPath),
      text: localise(keyForSession(request, 'registrations:notes.manage'), {
        noteTypePlural
      })
    },
    title: localise('registrations:notes.title', { noteTypePlural })
  }
}

/**
 * The page's registration content, the same with or without an accreditation.
 * @param {{
 *   request: HapiRequest,
 *   keys: RegistrationKeys,
 *   registration: RegistrationView
 * }} params
 * @returns {Omit<RegistrationViewModel, 'accreditation' | 'prns' | 'reapplyAccreditation' | 'wasteBalanceLedgerUrl'>}
 */
const buildRegistrationViewModel = ({ request, keys, registration }) => {
  const { t: localise, localiseUrl } = request
  const { isExporter, noteTypePlural } = getNoteTypeDisplayNames(registration)
  const siteName = toSiteName(registration, localise)
  const material = getMaterialDisplayName(registration.material)
  const homePath = organisationPath(keys)

  return {
    backUrl: localiseUrl(isExporter ? `${homePath}/exporting` : homePath),
    contactRegulatorUrl: localiseUrl('/contact'),
    hasSiteName: !!siteName,
    isExporter,
    material,
    pageTitle: localise('registrations:pageTitle', { siteName, material }),
    registration: buildTaggedReference({
      reference: keys.registrationNumber,
      status: registration.status.current
    }),
    reports: {
      link: {
        href: localiseUrl(reportsListPath(keys)),
        text: localise(keyForSession(request, 'registrations:manageReports'))
      }
    },
    siteName,
    uploadSummaryLogUrl: localiseUrl(
      `${registrationPath(keys)}/summary-logs/upload`
    ),
    wasteBalance: { availableAmount: null, noteTypePlural, breakdown: null }
  }
}

/**
 * The operator's registration page for one year's accreditation.
 * @param {{
 *   request: HapiRequest,
 *   keys: AccreditationKeys,
 *   registration: RegistrationView,
 *   accreditation: AccreditationView,
 *   wasteBalance: WasteBalance | null,
 *   showsDecember: boolean,
 *   reapplyAccreditation: ReapplyLink | null
 * }} params
 * @returns {RegistrationViewModel}
 */
const buildViewModel = ({
  request,
  keys,
  registration,
  accreditation,
  wasteBalance,
  showsDecember,
  reapplyAccreditation
}) => {
  const { noteType, noteTypePlural } = getNoteTypeDisplayNames(registration)
  const path = accreditationPath(keys)

  return {
    ...buildRegistrationViewModel({ request, keys, registration }),
    accreditation: toAccreditationTag(accreditation),
    prns: toPrns(
      request,
      { noteType, noteTypePlural },
      `${path}/packaging-recycling-notes`
    ),
    reapplyAccreditation,
    wasteBalance: {
      availableAmount: wasteBalance?.availableAmount ?? null,
      noteTypePlural,
      breakdown: showsDecember ? toDecemberBalanceBreakdown(wasteBalance) : null
    },
    wasteBalanceLedgerUrl: toLedgerUrl(request, path)
  }
}

/**
 * The operator's registration page while it holds no accreditation.
 * @param {{
 *   request: HapiRequest,
 *   keys: RegistrationKeys,
 *   registration: RegistrationView
 * }} params
 * @returns {RegistrationViewModel}
 */
const buildRegisteredOnlyViewModel = ({ request, keys, registration }) => ({
  ...buildRegistrationViewModel({ request, keys, registration }),
  accreditation: { exists: false },
  prns: null,
  reapplyAccreditation: null,
  wasteBalanceLedgerUrl: toLedgerUrl(request, registrationPath(keys))
})

/**
 * The operator's registration page with no year: an accredited registration
 * redirects to its latest year.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const registrationController = {
  /**
   * @param {HapiRequest & { params: OperatorRegistrationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber: number, registrationNumber } = request.params
    const keys = { organisationNumber: number, registrationNumber }

    const { registration } = await fetchRegistration({
      ...keys,
      backendToken: request.auth.credentials.backendToken
    })
    const year = latestAccreditationYear(registration)

    if (year) {
      return redirectPreservingMethod(
        request,
        h,
        accreditationPath({ ...keys, year })
      )
    }

    return h.view(
      'registrations/index',
      buildRegisteredOnlyViewModel({ request, keys, registration })
    )
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const controller = {
  /**
   * @param {HapiRequest & { params: OperatorAccreditationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const {
      organisationNumber: number,
      registrationNumber,
      year
    } = request.params
    const keys = { organisationNumber: number, registrationNumber, year }
    const credentials = request.auth.credentials
    const { backendToken } = credentials
    const numberKey = organisationNumber(Number(number))

    const [{ registration }, ids] = await Promise.all([
      fetchRegistration({ ...keys, backendToken }),
      findRecordIds(keys, credentials)
    ])
    const accreditation = accreditationIn(registration, year)

    const [wasteBalance, showsDecember] = await Promise.all([
      fetchAccreditationBalance({
        organisationNumber: numberKey,
        year: toYear(Number(year)),
        accreditationNumber: accreditation.accreditationNumber,
        backendToken,
        logger: request.logger
      }),
      showsDecemberBalance({
        organisationId: ids.organisationId,
        registrationId: ids.registrationId,
        accreditationId: ids.accreditationId,
        backendToken,
        logger: request.logger
      })
    ])

    const { windowStart, windowEnd, baseUrl } = config.get(
      'reapplyAccreditation'
    )
    // The ids stay until the registration service accepts numbers.
    const reapplyAccreditation = buildReapplyAccreditation({
      now: new Date(),
      window: { windowStart, windowEnd },
      baseUrl,
      organisationId: ids.organisationId,
      registrationId: ids.registrationId,
      material: ids.registration.material,
      registrationStatus: registration.status.current,
      year: Number(year)
    })

    return h.view(
      'registrations/index',
      buildViewModel({
        request,
        keys,
        registration,
        accreditation,
        wasteBalance,
        showsDecember,
        reapplyAccreditation
      })
    )
  }
}
