import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'

import { createPageGuards } from '../helpers/create-page-guards.js'

const { fetchGuardedData, buildViewData } = createPageGuards({
  isMatchingRegistration: isExporterRegistration,
  reportType: 'exporter'
})

export const fetchGuardedExporterData = fetchGuardedData
export const buildExporterViewData = buildViewData
