// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { startAnalytics, tagPolicy } from './analytics.js'

const containerId = 'GTM-TESTONLY'
const measurementId = 'G-TESTONLY01'

/**
 * @param {{ container?: string, measurement?: string, pagePath?: string, referrer?: string }} [published]
 */
const givenPublished = ({
  container = containerId,
  measurement = measurementId,
  pagePath = '/start',
  referrer
} = {}) => {
  document.head.innerHTML = [
    `<meta name="analytics-container-id" content="${container}">`,
    `<meta name="analytics-measurement-id" content="${measurement}">`,
    `<meta name="analytics-page-path" content="${pagePath}">`,
    referrer === undefined
      ? ''
      : `<meta name="analytics-page-referrer" content="${referrer}">`
  ].join('')
}

/**
 * The measurement library tells a command apart from a plain data push by the
 * entry being an `arguments` object, so the expected values are built as one.
 */
const command = function () {
  return arguments
}

const loadedTagUrls = () =>
  Array.from(document.head.querySelectorAll('script')).map(
    (script) => script.src
  )

/**
 * @param {string} name
 */
const commandsNamed = (name) =>
  (window.dataLayer ?? []).filter(
    (entry) => !Array.isArray(entry) && entry[0] === name
  )

describe('#analytics', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.dataLayer
  })

  describe('#startAnalytics', () => {
    it('should load the published tag manager container', () => {
      givenPublished()

      startAnalytics()

      expect(loadedTagUrls()).toStrictEqual([
        `https://www.googletagmanager.com/gtm.js?id=${containerId}`
      ])
    })

    it('should queue every control before the container can read the queue', () => {
      givenPublished()

      startAnalytics()

      expect(window.dataLayer).toStrictEqual([
        {
          'gtm.blocklist': [
            'customScripts',
            'html',
            'customPixels',
            'jsm',
            'nonGoogleScripts',
            'nonGooglePixels',
            'nonGoogleIframes'
          ]
        },
        command('policy', 'all', expect.any(Function)),
        command('consent', 'default', {
          ad_personalization: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          analytics_storage: 'granted'
        }),
        command('set', { page_location: 'http://localhost:3000/start' }),
        { 'gtm.start': expect.any(Number), event: 'gtm.js' }
      ])
    })

    it('should report the step rather than the address it arrived at', () => {
      givenPublished({
        pagePath:
          '/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
      })

      startAnalytics()

      expect(commandsNamed('set')).toStrictEqual([
        command('set', {
          page_location:
            'http://localhost:3000/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
        })
      ])
    })

    it('should report the step the visitor came from, not the address', () => {
      givenPublished({ referrer: '/organisations/:organisationId' })

      startAnalytics()

      expect(commandsNamed('set')).toStrictEqual([
        command('set', {
          page_location: 'http://localhost:3000/start',
          page_referrer: 'http://localhost:3000/organisations/:organisationId'
        })
      ])
    })

    it('should report the root when the page names no step', () => {
      document.head.innerHTML = `<meta name="analytics-container-id" content="${containerId}">
        <meta name="analytics-measurement-id" content="${measurementId}">`

      startAnalytics()

      expect(commandsNamed('set')).toStrictEqual([
        command('set', { page_location: 'http://localhost:3000/' })
      ])
    })

    it.for([
      { description: 'nothing is published', published: '' },
      {
        description: 'no container id is published',
        published: `<meta name="analytics-measurement-id" content="${measurementId}">`
      },
      {
        description: 'no measurement id is published',
        published: `<meta name="analytics-container-id" content="${containerId}">`
      },
      {
        description: 'the container id is blank',
        published: `<meta name="analytics-container-id" content="">
          <meta name="analytics-measurement-id" content="${measurementId}">`
      },
      {
        description: 'the measurement id is blank',
        published: `<meta name="analytics-container-id" content="${containerId}">
          <meta name="analytics-measurement-id" content="">`
      }
    ])('should do nothing when $description', ({ published }) => {
      document.head.innerHTML = published

      startAnalytics()

      expect(loadedTagUrls()).toStrictEqual([])
      expect(window.dataLayer).toBeUndefined()
    })

    it('should keep any queue an earlier load left behind', () => {
      givenPublished()
      window.dataLayer = [['earlier']]

      startAnalytics()

      expect(window.dataLayer?.[0]).toStrictEqual(['earlier'])
    })

    it('should not load the container twice', () => {
      givenPublished()

      startAnalytics()
      startAnalytics()

      expect(loadedTagUrls()).toHaveLength(1)
    })
  })

  describe('#tagPolicy', () => {
    const allows = tagPolicy({ containerId, measurementId })

    it.for([
      {
        description: 'reading the event being processed',
        request: [containerId, 'read_event_data', { key: 'event' }]
      },
      {
        description: 'reading container data',
        request: [measurementId, 'read_container_data', {}]
      },
      {
        description: 'the tag keeping its own storage',
        request: [measurementId, 'access_template_storage', {}]
      },
      {
        description: 'reading tag manager keys from the queue',
        request: [
          measurementId,
          'read_data_layer',
          { key: 'gtm.configContainerId' }
        ]
      },
      {
        description: 'loading the published measurement tag',
        request: [containerId, 'load_google_tags', { tagId: measurementId }]
      },
      {
        description: 'configuring the published measurement tag',
        request: [
          measurementId,
          'configure_google_tags',
          { tagId: measurementId, configuration: {} }
        ]
      },
      {
        description: 'configuring before a tag is named',
        request: [measurementId, 'configure_google_tags', {}]
      }
    ])('should allow $description', ({ request }) => {
      expect(allows(...request)).toBe(true)
    })

    it.for([
      {
        description: 'anything from another container',
        request: ['GTM-SOMEONEELSE', 'read_event_data', { key: 'event' }]
      },
      {
        description: 'loading another measurement tag',
        request: [containerId, 'load_google_tags', { tagId: 'AW-123456789' }]
      },
      {
        description: 'configuring another measurement tag',
        request: [
          measurementId,
          'configure_google_tags',
          { tagId: 'G-ELSEWHERE1' }
        ]
      },
      {
        description: 'reading our own keys from the queue',
        request: [measurementId, 'read_data_layer', { key: 'user' }]
      },
      {
        description: 'reading the address',
        request: [
          measurementId,
          'get_url',
          { component: 'query', queryKey: 'q' }
        ]
      },
      {
        description: 'reading the referrer',
        request: [measurementId, 'get_referrer', { component: 'url' }]
      },
      {
        description: 'listening for link clicks',
        request: [measurementId, 'detect_link_click_events', {}]
      },
      {
        description: 'listening for form use',
        request: [measurementId, 'detect_form_interaction_events', {}]
      },
      {
        description: 'listening for scrolling',
        request: [measurementId, 'detect_scroll_events', {}]
      },
      {
        description: 'reading the page itself',
        request: [
          measurementId,
          'read_dom_elements',
          { type: 'css', value: 'a' }
        ]
      },
      {
        description: 'injecting a script',
        request: [
          containerId,
          'inject_script',
          { url: 'https://example.com/x.js' }
        ]
      },
      {
        description: 'sending a pixel',
        request: [
          containerId,
          'send_pixel',
          { url: 'https://example.com/p.gif' }
        ]
      },
      {
        description: 'a permission it does not name',
        request: [containerId, 'unknown', {}]
      },
      {
        description: 'reading the queue without naming a key',
        request: [measurementId, 'read_data_layer']
      }
    ])('should refuse $description', ({ request }) => {
      expect(allows(...request)).toBe(false)
    })
  })
})
