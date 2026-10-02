/**
 * Where a note's back and return links go, and what they read.
 *
 * Only an operator is offered either link, and an operator reads a note from
 * their own list, so there is one destination. A regulator gets the breadcrumb
 * trail instead (`build-note-breadcrumbs.js`), which is why the `from`
 * parameter that used to pick a regulator's destination is gone.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
 * }} params
 * @returns {{ path: string, textKey: string }}
 */
export const noteReturn = ({
  organisationId,
  registrationId,
  accreditationId
}) => ({
  path: `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`,
  textKey: 'prns:view:returnLink'
})
