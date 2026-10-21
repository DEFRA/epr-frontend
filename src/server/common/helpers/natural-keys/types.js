/**
 * @typedef {{
 *   organisationId: string
 *   registrationId?: string
 *   accreditationId?: string
 * }} RecordIds
 */

/**
 * @typedef {{
 *   organisationNumber: string
 *   registrationNumber?: string
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
 *     registrationNumber?: string
 *     accreditationId?: string
 *     material: AppliedForMaterial
 *   }[]
 *   accreditations: {
 *     id: string
 *     accreditationNumber?: string
 *     validFrom?: string
 *   }[]
 * }} OrganisationById
 */

/** @import { AppliedForMaterial } from '#domain/organisations/model.js' */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
