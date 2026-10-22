/**
 * @typedef {{
 *   organisationId: string
 *   registrationId?: string
 *   accreditationId?: string
 * }} RecordIds
 */

/**
 * @typedef {{
 *   organisationNumber: OrganisationNumber
 *   registrationNumber?: RegistrationNumber
 *   year?: string
 * }} NaturalKeys
 */

/**
 * The fields of `GET /v1/organisations/{id}` that old-URL redirects and the
 * accreditation renewal link read.
 * @typedef {{
 *   id: string
 *   orgId: number
 *   registrations: {
 *     id: string
 *     registrationNumber?: RegistrationNumber
 *     accreditationId?: string
 *     material: AppliedForMaterial
 *   }[]
 *   accreditations: {
 *     id: string
 *     accreditationNumber?: AccreditationNumber
 *     validFrom?: string
 *   }[]
 * }} OrganisationById
 */

/** @import { AppliedForMaterial } from '#domain/organisations/model.js' */
/** @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js' */
/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { RegistrationNumber } from '#server/common/helpers/registration-number.js' */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
