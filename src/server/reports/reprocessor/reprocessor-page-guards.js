import { isReprocessorRegistration } from '#server/common/helpers/prns/registration-helpers.js'

import { createPageGuards } from '../helpers/create-page-guards.js'

const { fetchGuardedData, buildViewData } = createPageGuards({
  isMatchingRegistration: isReprocessorRegistration
})

export const fetchGuardedReprocessorData = fetchGuardedData
export const buildReprocessorViewData = buildViewData
