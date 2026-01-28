import { getValidatedRegistration } from './helpers/get-validated-registration.js'
import { buildCreatePrnViewData } from './view-data.js'

// Stub recipients until real API is available
const STUB_RECIPIENTS = [
  { value: 'producer-1', text: 'Acme Packaging Ltd' },
  { value: 'producer-2', text: 'BigCo Waste Solutions' },
  { value: 'producer-3', text: 'EcoRecycle Industries' },
  { value: 'scheme-1', text: 'Green Compliance Scheme' },
  { value: 'scheme-2', text: 'National Packaging Scheme' }
]

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const controller = {
  async handler(request, h) {
    const { registration } = await getValidatedRegistration(request)

    const viewData = buildCreatePrnViewData(request, {
      registration,
      recipients: STUB_RECIPIENTS
    })

    return h.view('prns/create', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
