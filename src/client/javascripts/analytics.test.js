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
    const decide = tagPolicy({ containerId, measurementId })

    it.for([
      'access_template_storage',
      'detect_click_events',
      'detect_element_visibility_events',
      'detect_form_interaction_events',
      'detect_form_submit_events',
      'detect_history_change_events',
      'detect_link_click_events',
      'detect_scroll_events',
      'detect_timer_events',
      'get_referrer',
      'get_url',
      'listen_data_layer',
      'logging',
      'read_container_data',
      'read_data_layer',
      'read_dom_elements',
      'read_event_data',
      'read_event_metadata',
      'read_title'
    ])('should let the container observe the page through %s', (permission) => {
      expect(decide(measurementId, permission, {})).toBe(true)
    })

    it.for([
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
      },
      {
        description: 'configuring without any details',
        request: [measurementId, 'configure_google_tags']
      }
    ])('should allow $description', ({ request }) => {
      expect(decide(...request)).toBe(true)
    })

    it.for([
      {
        description: 'anything from another container',
        request: ['GTM-SOMEONEELSE', 'read_event_data', { key: 'event' }],
        refused: 'read_event_data from GTM-SOMEONEELSE'
      },
      {
        description: 'loading another measurement tag',
        request: [containerId, 'load_google_tags', { tagId: 'AW-123456789' }],
        refused: 'load_google_tags for AW-123456789'
      },
      {
        description: 'configuring another measurement tag',
        request: [
          measurementId,
          'configure_google_tags',
          { tagId: 'G-ELSEWHERE1' }
        ],
        refused: 'configure_google_tags for G-ELSEWHERE1'
      },
      {
        description: 'injecting a script',
        request: [
          containerId,
          'inject_script',
          { url: 'https://example.com/x.js' }
        ],
        refused: 'inject_script'
      },
      {
        description: 'injecting an iframe',
        request: [
          containerId,
          'inject_hidden_iframe',
          { url: 'https://example.com/f.html' }
        ],
        refused: 'inject_hidden_iframe'
      },
      {
        description: 'sending a pixel',
        request: [
          containerId,
          'send_pixel',
          { url: 'https://example.com/p.gif' }
        ],
        refused: 'send_pixel'
      },
      {
        description: 'setting cookies',
        request: [containerId, 'set_cookies', { name: '_fbp' }],
        refused: 'set_cookies'
      },
      {
        description: 'reaching into page globals',
        request: [containerId, 'access_globals', { key: 'fbq' }],
        refused: 'access_globals'
      },
      {
        description: 'watching for video, which the service has none of',
        request: [measurementId, 'detect_youtube_activity_events', {}],
        refused: 'detect_youtube_activity_events'
      },
      {
        description: 'a permission it does not name',
        request: [containerId, 'unknown', {}],
        refused: 'unknown'
      }
    ])(
      'should refuse $description, saying so in preview',
      ({ request, refused }) => {
        expect(() => decide(...request)).toThrow(
          `Refused by the page: ${refused}`
        )
      }
    )
  })
})
