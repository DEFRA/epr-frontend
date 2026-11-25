import Joi from 'joi'

import { prnStatuses } from '#server/common/constants/statuses.js'
import { accreditationPath } from '#server/reports/helpers/report-paths.js'

/**
 * @import { PrnStatus } from '#server/common/constants/statuses.js'
 * @import { AccreditationNumber } from '#server/common/helpers/accreditation-number.js'
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */

/**
 * @typedef {object} IssuedToOrganisation
 * @property {string} id
 * @property {string} name
 * @property {string | null} [tradingName]
 * @property {string} [registrationType]
 */

/**
 * A PRN as the backend serves it under its accreditation.
 * @typedef {{
 *   id: string,
 *   prnNumber?: string,
 *   status: {
 *     current: PrnStatus,
 *     timeline: { status: string, at: string, by?: { name: string } }[]
 *   },
 *   issuedToOrganisation: IssuedToOrganisation,
 *   issuer: {
 *     registration: {
 *       accreditation: {
 *         accreditationNumber: AccreditationNumber,
 *         accreditationYear: number,
 *         wasteProcessingType: string,
 *         material: string
 *       }
 *     }
 *   },
 *   tonnage: number,
 *   processToBeUsed: string,
 *   isDecemberWaste: boolean,
 *   obligation: { allowedYears: number[], year: number },
 *   notes?: string,
 *   createdAt: string,
 *   issued?: { at: string, by?: { name: string } }
 * }} PrnResource
 */

/**
 * A PRN as the pages read it.
 * @typedef {{
 *   id: string,
 *   prnNumber: string | null,
 *   issuedToOrganisation: IssuedToOrganisation,
 *   tonnage: number,
 *   material: string,
 *   status: PrnStatus,
 *   createdAt: string,
 *   notes: string | null,
 *   isDecemberWaste: boolean,
 *   wasteProcessingType: string,
 *   processToBeUsed: string,
 *   accreditationYear: number,
 *   obligation: { allowedYears: number[], year: number },
 *   issuedAt: string | null,
 *   issuedBy: { name?: string, position?: string } | null
 * }} PackagingRecyclingNote
 */

/**
 * The fields of a backend PRN that the pages read. Anything else the backend
 * serves is allowed and ignored.
 * @type {Joi.ObjectSchema<PrnResource>}
 */
export const prnResourceSchema = Joi.object({
  id: Joi.string().required(),
  prnNumber: Joi.string(),
  status: Joi.object({
    current: Joi.valid(...Object.values(prnStatuses)).required()
  }).required(),
  issuedToOrganisation: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    tradingName: Joi.string().allow(null),
    registrationType: Joi.string()
  }).required(),
  issuer: Joi.object({
    registration: Joi.object({
      accreditation: Joi.object({
        accreditationYear: Joi.number().integer().required(),
        wasteProcessingType: Joi.string().required(),
        material: Joi.string().required()
      }).required()
    }).required()
  }).required(),
  tonnage: Joi.number().required(),
  processToBeUsed: Joi.string().allow('').required(),
  isDecemberWaste: Joi.boolean().required(),
  obligation: Joi.object({
    year: Joi.number().integer().required(),
    allowedYears: Joi.array()
      .items(Joi.number().integer())
      .unique()
      .sort()
      .min(1)
      .required()
  }).required(),
  notes: Joi.string(),
  createdAt: Joi.string().required(),
  issued: Joi.object({
    at: Joi.string().required(),
    by: Joi.object({ name: Joi.string().required(), position: Joi.string() })
  })
}).prefs({ allowUnknown: true })

/** @type {Joi.ObjectSchema<{ items: PrnResource[] }>} */
export const prnResourceListSchema = Joi.object({
  items: Joi.array().items(prnResourceSchema).required()
}).prefs({ allowUnknown: true })

/**
 * The accreditation's PRN collection, the same address for page and backend.
 * @param {AccreditationKeys} keys
 * @returns {string}
 */
export const prnsPath = (keys) =>
  `${accreditationPath(keys)}/packaging-recycling-notes`

/**
 * @param {PrnResource} prn
 * @returns {PackagingRecyclingNote}
 */
export const toPackagingRecyclingNote = (prn) => {
  const { accreditation } = prn.issuer.registration
  return {
    id: prn.id,
    prnNumber: prn.prnNumber ?? null,
    issuedToOrganisation: prn.issuedToOrganisation,
    tonnage: prn.tonnage,
    material: accreditation.material,
    status: prn.status.current,
    createdAt: prn.createdAt,
    notes: prn.notes ?? null,
    isDecemberWaste: prn.isDecemberWaste,
    wasteProcessingType: accreditation.wasteProcessingType,
    processToBeUsed: prn.processToBeUsed,
    accreditationYear: accreditation.accreditationYear,
    obligation: {
      allowedYears: prn.obligation.allowedYears,
      year: prn.obligation.year
    },
    issuedAt: prn.issued?.at ?? null,
    issuedBy: prn.issued?.by ?? null
  }
}
