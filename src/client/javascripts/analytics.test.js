// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { startAnalytics } from './analytics.js'

const measurementId = 'G-TESTONLY01'

/**
 * @param {string} [id]
 */
const givenMeasurementId = (id, pagePath = '/start') => {
  document.head.innerHTML =
    id === undefined
      ? ''
      : `<meta name="analytics-measurement-id" content="${id}">
         <meta name="analytics-page-path" content="${pagePath}">`
}

const loadedTagUrls = () =>
  Array.from(document.head.querySelectorAll('script')).map(
    (script) => script.src
  )

describe('#startAnalytics', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.dataLayer
  })

  it('should load the measurement library for the published id', () => {
    givenMeasurementId(measurementId)

    startAnalytics()

    expect(loadedTagUrls()).toStrictEqual([
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    ])
  })

  it('should record the page view against the published id', () => {
    givenMeasurementId(measurementId)

    startAnalytics()

    expect(window.dataLayer).toStrictEqual([
      ['js', expect.any(Date)],
      [
        'config',
        measurementId,
        { page_location: 'http://localhost:3000/start' }
      ]
    ])
  })

  it('should report the step rather than the address it arrived at', () => {
    givenMeasurementId(
      measurementId,
      '/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
    )

    startAnalytics()

    expect(window.dataLayer?.[1]).toStrictEqual([
      'config',
      measurementId,
      {
        page_location:
          'http://localhost:3000/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
      }
    ])
  })

  it('should report the root when the page names no step', () => {
    document.head.innerHTML = `<meta name="analytics-measurement-id" content="${measurementId}">`

    startAnalytics()

    expect(window.dataLayer?.[1]).toStrictEqual([
      'config',
      measurementId,
      { page_location: 'http://localhost:3000/' }
    ])
  })

  it('should do nothing when no id is published', () => {
    givenMeasurementId()

    startAnalytics()

    expect(loadedTagUrls()).toStrictEqual([])
    expect(window.dataLayer).toBeUndefined()
  })

  it('should do nothing when the published id is blank', () => {
    givenMeasurementId('')

    startAnalytics()

    expect(loadedTagUrls()).toStrictEqual([])
    expect(window.dataLayer).toBeUndefined()
  })

  it('should keep any queue an earlier load left behind', () => {
    givenMeasurementId(measurementId)
    window.dataLayer = [['earlier']]

    startAnalytics()

    expect(window.dataLayer?.[0]).toStrictEqual(['earlier'])
  })

  it('should not load the library twice', () => {
    givenMeasurementId(measurementId)

    startAnalytics()
    startAnalytics()

    expect(loadedTagUrls()).toHaveLength(1)
  })
})
