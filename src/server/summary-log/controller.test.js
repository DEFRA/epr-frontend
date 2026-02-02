import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { validationFailureCodes } from '#server/common/constants/validation-codes.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { load } from 'cheerio'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { summaryLogStatuses } from '../common/constants/statuses.js'
import {
  buildLoadsViewModel,
  getWasteRecordSectionNumber
} from './controller.js'

const mockUploadUrl = 'https://storage.example.com/upload?signature=abc123'

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'https://storage.example.com/upload?signature=abc123',
      uploadId: 'new-upload-id-123'
    })
  })
)

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn().mockResolvedValue({
      organisationData: undefined,
      registration: undefined,
      accreditation: undefined
    })
  })
)

vi.mock(
  import('#server/common/helpers/waste-balance/fetch-waste-balances.js'),
  () => ({
    fetchWasteBalances: vi.fn()
  })
)

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }
}

const enablesClientSidePolling = () =>
  expect.stringContaining('meta http-equiv="refresh"')

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = summaryLogBaseUrl

  beforeEach(() => {
    fetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })

    initiateSummaryLogUpload.mockReset().mockResolvedValue({
      uploadUrl: mockUploadUrl,
      uploadId: 'new-upload-id-123'
    })

    submitSummaryLog.mockReset()
  })

  it('should provide expected response', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(fetchSummaryLogStatus).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    it('status: preprocessing - should show processing message and poll', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.preprocessing
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const $ = load(result)
      const $body = $('[data-testid="app-page-body"]')

      /* eslint-disable vitest/max-expects */
      expect($body.find('h1').text()).toBe('Your file is being checked')
      expect($body.find('p').first().text()).toBe(
        'Your summary log is being checked for:'
      )
      expect($body.find('li').eq(0).text()).toBe('errors')
      expect($body.find('li').eq(1).text()).toBe('new data')
      expect($body.find('li').eq(2).text()).toBe(
        'changes to previously uploaded data'
      )
      expect($body.find('p').eq(1).text()).toBe('This may take a few minutes.')
      expect($body.find('p').eq(2).text()).toBe(
        'Keep this page open and do not refresh it.'
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
      /* eslint-enable vitest/max-expects */
    })

    it('status: validating - should show processing message and poll', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validating
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being checked')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submitting - should show submitting message and poll', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitting
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your waste records are being updated')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('This may take a few minutes.')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it.')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    const expectCheckPageContent = (result) => {
      expect(result).toStrictEqual(
        expect.stringContaining('Check before confirming upload')
      )
      expect(result).toStrictEqual(expect.stringContaining('Declaration'))
      expect(result).toStrictEqual(expect.stringContaining('Confirm upload'))
      expect(result).toStrictEqual(
        expect.stringContaining('upload an updated summary log')
      )
    }

    it('status: validated - should show check page and stop polling', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining(
          'action="/organisations/123/registrations/456/summary-logs/789/submit"'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('method="POST"'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: validated - should show return to home link to organisation home', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('return to home'))
      expect(result).toStrictEqual(
        expect.stringContaining(`href="/organisations/${organisationId}"`)
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated - should show warning inset text with both links', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('govuk-inset-text'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          'This data will not be saved until you confirm upload'
        )
      )

      expect(result).toStrictEqual(
        expect.stringContaining('upload an updated summary log')
      )
      expect(result).toStrictEqual(expect.stringContaining('return to home'))

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with REPROCESSOR_INPUT - should show section 1 in explanation text', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with REPROCESSOR_OUTPUT - should show section 3 in explanation text', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_OUTPUT',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 3 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with EXPORTER - should show section 1 in explanation text', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with new loads - should show new loads heading', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: {
              count: 7,
              rowIds: [1092, 1093, 1094, 1095, 1096, 1097, 1098]
            },
            excluded: { count: 2, rowIds: [1099, 1100] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('New loads'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '7 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '2 new loads will not be added to your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with no new loads - should show no new loads heading', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: [1096, 1099, 1100] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no new loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with adjusted loads - should show adjusted loads section', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: [1096, 1099, 1100] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Adjusted loads'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          'These loads have had data added, removed, or changed in section 1 of your summary log since it was last submitted.'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '3 adjusted loads will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with new included loads - should NOT display row IDs', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 3, rowIds: [1092, 1093, 1094] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).not.toStrictEqual(expect.stringContaining('<li>1092</li>'))
      expect(result).not.toStrictEqual(expect.stringContaining('<li>1093</li>'))
      expect(result).not.toStrictEqual(expect.stringContaining('<li>1094</li>'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '3 new loads will be added to your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with singular load - should use singular form', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 1, rowIds: [1092] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 1, rowIds: [1093] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('New loads'))
      expect(result).toStrictEqual(expect.stringContaining('Adjusted loads'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 new load will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 adjusted load will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ excluded loads - should show supplementary guidance instead of row IDs', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => 2000 + i)
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('supplementary guidance')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('Show 100 loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 99 excluded loads - should show Show loads link with row IDs', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: {
              count: 99,
              rowIds: Array.from({ length: 99 }, (_, i) => 2000 + i)
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ adjusted excluded loads - should show supplementary guidance', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 2, rowIds: [3001, 3002] },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => 4000 + i)
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 99 adjusted excluded loads - should show Show loads link', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: {
              count: 99,
              rowIds: Array.from({ length: 99 }, (_, i) => 4000 + i)
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with adjusted included loads - should show Show loads link', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: {
              count: 5,
              rowIds: [3001, 3002, 3003, 3004, 3005]
            },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 5 loads'))

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ adjusted included loads - should NOT show missing data message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => 3000 + i)
            },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).not.toStrictEqual(
        expect.stringContaining('loads are missing data')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'As there are 100 or more adjusted loads, we are not able to list them all here'
        )
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('Show 100 loads')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated without adjusted loads - should show no adjusted loads message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 5, rowIds: [1092, 1093, 1094, 1095, 1096] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no adjusted loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submitted - should show success page and stop polling', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-001'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'You can upload an updated summary log whenever you need to provide new data.'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('Return to home'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: submitted - should link to organisation root', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining(`href="/organisations/${organisationId}"`)
      )
    })

    describe('when waste balance feature flag is enabled', () => {
      beforeAll(() => {
        config.set('featureFlags.wasteBalance', true)
      })

      afterAll(() => {
        config.reset('featureFlags.wasteBalance')
      })

      it('status: validated - should not fetch waste balance data', async ({
        server
      }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.validated,
          loads: {
            added: {
              included: { count: 0, rowIds: [] },
              excluded: { count: 0, rowIds: [] }
            },
            adjusted: {
              included: { count: 0, rowIds: [] },
              excluded: { count: 0, rowIds: [] }
            }
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchRegistrationAndAccreditation).not.toHaveBeenCalled()
        expect(fetchWasteBalances).not.toHaveBeenCalled()
      })

      it('status: submitted - should fetch waste balance data', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        fetchWasteBalances.mockResolvedValueOnce({
          [accreditationId]: {
            amount: 1000,
            availableAmount: 1234.56
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          'test-id-token'
        )
        expect(fetchWasteBalances).toHaveBeenCalledWith(
          organisationId,
          [accreditationId],
          'test-id-token'
        )
      })

      it('status: submitted - should display waste balance in confirmation panel', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        fetchWasteBalances.mockResolvedValueOnce({
          [accreditationId]: {
            amount: 1000,
            availableAmount: 1234.56
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const $ = load(result)
        const panelBody = $('.govuk-panel--confirmation .govuk-panel__body')

        expect(panelBody).toHaveLength(1)
        expect(panelBody.text()).toContain('Your updated waste balance')
        expect(panelBody.text()).toContain('1,234.56')
        expect(panelBody.text()).toContain('tonnes')
      })

      it('status: submitted - should not display waste balance section when balance unavailable', async ({
        server
      }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId },
          accreditation: undefined
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const $ = load(result)
        const panel = $('.govuk-panel--confirmation')
        const panelBody = panel.find('.govuk-panel__body')

        expect(panel).toHaveLength(1)
        expect(panelBody).toHaveLength(0)
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should not display waste balance when balance not found', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        fetchWasteBalances.mockResolvedValueOnce({})

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should handle waste balance fetch failure gracefully', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        fetchWasteBalances.mockRejectedValueOnce(
          new Error('Waste balance service unavailable')
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('Summary log uploaded')
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should display zero waste balance correctly', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        fetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        fetchWasteBalances.mockResolvedValueOnce({
          [accreditationId]: {
            amount: 0,
            availableAmount: 0
          }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const $ = load(result)
        const panelBody = $('.govuk-panel--confirmation .govuk-panel__body')

        expect(panelBody).toHaveLength(1)
        expect(panelBody.text()).toContain('0.00')
        expect(panelBody.text()).toContain('tonnes')
      })
    })

    describe('when waste balance feature flag is disabled', () => {
      beforeAll(() => {
        config.set('featureFlags.wasteBalance', false)
      })

      afterAll(() => {
        config.reset('featureFlags.wasteBalance')
      })

      it('status: submitted - should not display waste balance section', async ({
        server
      }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toContain('Your updated waste balance')
        expect(fetchRegistrationAndAccreditation).not.toHaveBeenCalled()
        expect(fetchWasteBalances).not.toHaveBeenCalled()
      })
    })

    it('status: submitted with freshData from POST - should use freshData and not call backend', async ({
      server
    }) => {
      const submitUrl = `${url}/submit`

      submitSummaryLog.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-002'
      })

      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      const postResponse = await server.inject({
        method: 'POST',
        url: submitUrl,
        headers: { cookie },
        payload: { crumb },
        auth: mockAuth
      })

      expect(postResponse.statusCode).toBe(statusCodes.found)

      const setCookies = postResponse.headers['set-cookie']
      const cookies = Array.isArray(setCookies) ? setCookies : [setCookies]
      const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ')

      const initialCallCount = fetchSummaryLogStatus.mock.calls.length

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: cookieHeader
        },
        auth: mockAuth
      })

      expect(fetchSummaryLogStatus).toHaveBeenCalledTimes(initialCallCount)

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: rejected with validation failure code - should show validation failures page', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ code: validationFailureCodes.FILE_VIRUS_DETECTED }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('The selected file contains a virus')
    })

    it('status: rejected - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ code: validationFailureCodes.FILE_VIRUS_DETECTED }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: rejected without validation - should show validation failures page with technical error', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with validation failures - should show validation failures page with correct content', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'We&#39;ve found the following issue with the file you selected'
      )
      expect(result).toContain(
        'Summary log registration is missing or incorrect'
      )
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: invalid with validation failures - should show re-upload form and cancel button', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Upload updated XLSX file')
      expect(result).toContain('Continue')
      expect(result).toContain('Cancel and return to home')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    it('status: invalid - should render back link to registration dashboard', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('govuk-back-link')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    it('status: invalid - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: invalid with multiple validation failures - should show all failures', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.SEQUENTIAL_ROW_REMOVED },
            { code: validationFailureCodes.HEADER_REQUIRED }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Rows have been removed since your summary log was last submitted'
      )
      expect(result).toContain(
        'The columns in the file you selected have been changed'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid with unknown failure code - should show technical error message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: 'SOME_UNKNOWN_CODE' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid with data entry failures - should show single deduplicated message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE },
            { code: validationFailureCodes.INVALID_TYPE },
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )

      const matches = result.match(
        /The selected file contains data that&#39;s been entered incorrectly/g
      )

      expect(matches).toHaveLength(1)
    })

    it('status: invalid with mixed failures - should show data entry message and other failures', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE },
            { code: validationFailureCodes.REGISTRATION_MISMATCH },
            { code: validationFailureCodes.INVALID_TYPE }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
      expect(result).toContain(
        'Summary log registration is missing or incorrect'
      )
    })

    it('status: invalid with material failure - should show material invalid message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.MATERIAL_MISMATCH }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Summary log material is missing or incorrect')
    })

    it('status: invalid with accreditation failure - should show accreditation invalid message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.ACCREDITATION_MISMATCH }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Summary log accreditation is missing or incorrect'
      )
    })

    it('status: invalid with processing type failure - should show template incorrect message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.PROCESSING_TYPE_MISMATCH }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_MALFORMED_MARKERS failure - should show malformed template message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.SPREADSHEET_MALFORMED_MARKERS }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_INVALID_ERROR failure - should show malformed template message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.SPREADSHEET_INVALID_ERROR }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with multiple spreadsheet failures - should show single deduplicated message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.SPREADSHEET_MALFORMED_MARKERS },
            { code: validationFailureCodes.SPREADSHEET_INVALID_ERROR }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )

      // Should only appear once (deduplicated)
      const matches = result.match(
        /The summary log template you&#39;re uploading is incorrect/g
      )

      expect(matches).toHaveLength(1)
    })

    it.for([
      'FILE_UPLOAD_FAILED',
      'FILE_DOWNLOAD_FAILED',
      'FILE_REJECTED',
      'VALIDATION_SYSTEM_ERROR',
      'UNKNOWN'
    ])(
      '%s - should show technical error message',
      async (errorCode, { server }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: {
            failures: [{ code: validationFailureCodes[errorCode] }]
          }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain(
          'Sorry, there is a problem with the service - try again later'
        )
      }
    )

    it('status: invalid with multiple technical errors - should show single deduplicated message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.FILE_UPLOAD_FAILED },
            { code: validationFailureCodes.FILE_DOWNLOAD_FAILED },
            { code: validationFailureCodes.VALIDATION_SYSTEM_ERROR }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )

      const matches = result.match(
        /Sorry, there is a problem with the service - try again later/g
      )

      expect(matches).toHaveLength(1)
    })

    it('status: invalid with empty validation failures - should show technical error message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: []
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid without validation object - should show technical error message', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed,
        validation: {
          failures: [{ code: 'PROCESSING_FAILED' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: submission_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submission_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    describe('status: superseded', () => {
      it('should show superseded page with link to organisation', async ({
        server
      }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('This summary log has been replaced')
        expect(result).toContain(
          'A newer summary log has been uploaded. This upload is no longer being processed.'
        )
        expect(result).toContain(`href="/organisations/${organisationId}"`)
        expect(result).toContain('Return to home')
      })

      it('should not enable client-side polling', async ({ server }) => {
        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(result).not.toStrictEqual(enablesClientSidePolling())
      })

      it('should not initiate upload', async ({ server }) => {
        const initialCallCount = initiateSummaryLogUpload.mock.calls.length

        fetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(initiateSummaryLogUpload).toHaveBeenCalledTimes(initialCallCount)
      })
    })

    it('status: superseded - should not enable client-side polling', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.superseded
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })
  })

  describe('unexpected status handling', () => {
    it('unexpected status - should show error page', async ({ server }) => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: 'some_unknown_status'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Error checking status')
      expect(result).toContain('Unable to check upload status')
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    it('should show 404 error page when summary log not found', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockRejectedValueOnce(Boom.notFound())

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('Page not found'))
      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should show 500 error page when backend fetch fails', async ({
      server
    }) => {
      fetchSummaryLogStatus.mockRejectedValueOnce(
        Boom.internal('Failed to fetch')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Something went wrong')
      )
      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('session validation', () => {
    it('should redirect to logged-out when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })
})

describe('#buildLoadsViewModel', () => {
  const noRows = { count: 0, rowIds: [] }

  test('returns no rows when loads is undefined', () => {
    const result = buildLoadsViewModel(undefined)

    expect(result).toStrictEqual({
      added: {
        included: noRows,
        excluded: noRows,
        total: 0
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('returns no rows when loads is null', () => {
    const result = buildLoadsViewModel(null)

    expect(result).toStrictEqual({
      added: {
        included: noRows,
        excluded: noRows,
        total: 0
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('returns empty structure when loads has empty structure', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    expect(result).toStrictEqual({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] },
        total: 0
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] },
        total: 0
      }
    })
  })

  test('preserves count and rowIds from backend', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 150, rowIds: [1001, 1002, 1003] },
        excluded: { count: 50, rowIds: [1004, 1005] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    expect(result.added).toStrictEqual({
      included: { count: 150, rowIds: [1001, 1002, 1003] },
      excluded: { count: 50, rowIds: [1004, 1005] },
      total: 200
    })
  })

  test('preserves count and rowIds for adjusted loads', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      },
      adjusted: {
        included: { count: 120, rowIds: [2001, 2002] },
        excluded: { count: 30, rowIds: [2003] }
      }
    })

    expect(result.adjusted).toStrictEqual({
      included: { count: 120, rowIds: [2001, 2002] },
      excluded: { count: 30, rowIds: [2003] },
      total: 150
    })
  })

  test('handles partial loads data gracefully', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 1, rowIds: [1001] }
        // missing excluded
      }
      // missing adjusted
    })

    expect(result).toStrictEqual({
      added: {
        included: { count: 1, rowIds: [1001] },
        excluded: noRows,
        total: 1
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('calculates total from included + excluded counts', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 8, rowIds: [1001, 1002, 1003] },
        excluded: { count: 7, rowIds: [1004, 1005] }
      },
      adjusted: {
        included: { count: 4, rowIds: [2001, 2002, 2003, 2004] },
        excluded: { count: 3, rowIds: [2005, 2006, 2007] }
      }
    })

    expect(result.added.total).toBe(15)
    expect(result.adjusted.total).toBe(7)
  })
})

describe('#getWasteRecordSectionNumber', () => {
  test('returns section 1 for REPROCESSOR_INPUT', () => {
    expect(getWasteRecordSectionNumber('REPROCESSOR_INPUT')).toBe(1)
  })

  test('returns section 3 for REPROCESSOR_OUTPUT', () => {
    expect(getWasteRecordSectionNumber('REPROCESSOR_OUTPUT')).toBe(3)
  })

  test('returns section 1 for EXPORTER', () => {
    expect(getWasteRecordSectionNumber('EXPORTER')).toBe(1)
  })

  test('returns undefined for undefined processingType', () => {
    expect(getWasteRecordSectionNumber(undefined)).toBeUndefined()
  })

  test('returns undefined for unknown processingType', () => {
    expect(getWasteRecordSectionNumber('UNKNOWN_TYPE')).toBeUndefined()
  })
})
