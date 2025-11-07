import { beforeEach, describe, expect, test } from 'vitest'
import { renderComponent } from '#modules/platform/test-helpers/component-helpers.js'

describe('heading Component', () => {
  /** @type {CheerioAPI} */
  let $heading

  describe('with caption', () => {
    beforeEach(() => {
      $heading = renderComponent('heading', {
        text: 'Services',
        caption: 'A page showing available services'
      })
    })

    test('should render app heading component', () => {
      expect($heading('[data-testid="app-heading"]')).toHaveLength(1)
    })

    test('should contain expected heading', () => {
      expect($heading('[data-testid="app-heading-title"]').text().trim()).toBe(
        'Services'
      )
    })

    test('should have expected heading caption', () => {
      expect(
        $heading('[data-testid="app-heading-caption"]').text().trim()
      ).toBe('A page showing available services')
    })
  })
})

/**
 * @import { CheerioAPI } from 'cheerio'
 */
