import { prnsPath } from './prn-resource.js'

/**
 * Where a note's back and return links go, and what they read.
 *
 * Only an operator is offered either link, and an operator reads a note from
 * their own list, so there is one destination. A regulator gets the breadcrumb
 * trail instead (`build-note-breadcrumbs.js`), which is why the `from`
 * parameter that used to pick a regulator's destination is gone.
 * @param {AccreditationKeys} keys
 * @returns {{ path: string, textKey: string }}
 */
export const noteReturn = (keys) => ({
  path: prnsPath(keys),
  textKey: 'prns:view:returnLink'
})

/**
 * @import { AccreditationKeys } from '#server/reports/helpers/report-paths.js'
 */
