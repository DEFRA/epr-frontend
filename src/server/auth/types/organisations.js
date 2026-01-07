/**
 * @typedef {{
 *   id: string
 *   name: string
 * }} DefraOrgSummary
 */

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   orgId: string
 * }} EprOrganisationSummary
 */

/**
 * @typedef { EprOrganisationSummary & {
 *   linkedBy: {
 *     email: string
 *     id: string
 *   }
 *   linkedAt: string
 * }} LinkedDefraOrganisation
 */

/**
 * @typedef {{
 *   current: DefraOrgSummary
 *   linked: LinkedDefraOrganisation | null
 *   unlinked: EprOrganisationSummary[]
 * }} UserOrganisations
 */

export {} // NOSONAR: javascript:S7787 - Required to make this file a module for JSDoc @import
