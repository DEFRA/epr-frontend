import { describe, expect, it } from 'vitest'

import { toPrnGroups } from './prn-groups.js'

/**
 * @param {Partial<PackagingRecyclingNote> & { status: string }} note
 * @returns {PackagingRecyclingNote}
 */
const aNote = (note) => ({
  id: note.id ?? `id-${note.status}`,
  prnNumber: null,
  issuedToOrganisation: { id: 'org-1', name: 'Radar Compliance PLC' },
  tonnage: 10,
  material: 'paper',
  createdAt: '2026-01-01T00:00:00.000Z',
  issuedAt: null,
  wasteProcessingType: 'reprocessor',
  processToBeUsed: '',
  isDecemberWaste: false,
  ...note
})

const ids = (/** @type {PackagingRecyclingNote[]} */ notes) =>
  notes.map((note) => note.id)

describe(toPrnGroups, () => {
  describe('the partition', () => {
    it('files a note of each shown status under the group that draws it', () => {
      const groups = toPrnGroups([
        aNote({ id: 'auth', status: 'awaiting_authorisation' }),
        aNote({ id: 'cancelling', status: 'awaiting_cancellation' }),
        aNote({ id: 'accepting', status: 'awaiting_acceptance' }),
        aNote({ id: 'accepted', status: 'accepted' }),
        aNote({ id: 'cancelled', status: 'cancelled' })
      ])

      expect(ids(groups.awaitingAuthorisation)).toStrictEqual(['auth'])
      expect(ids(groups.awaitingCancellation)).toStrictEqual(['cancelling'])
      expect(ids(groups.issued)).toStrictEqual(['accepting', 'accepted'])
      expect(ids(groups.cancelled)).toStrictEqual(['cancelled'])
    })

    it('shows a regulator neither a draft note nor a discarded one', () => {
      const groups = toPrnGroups([
        aNote({ id: 'draft', status: 'draft' }),
        aNote({ id: 'discarded', status: 'discarded' })
      ])

      expect(groups.awaitingAuthorisation).toStrictEqual([])
      expect(groups.awaitingCancellation).toStrictEqual([])
      expect(groups.issued).toStrictEqual([])
      expect(groups.cancelled).toStrictEqual([])
      expect(groups.mostRecent).toStrictEqual([])
    })

    it('drops a status it has no group for rather than raising', () => {
      const groups = toPrnGroups([
        aNote({ id: 'invented', status: 'invented_by_a_later_release' })
      ])

      expect(groups.isEmpty).toBe(true)
    })
  })

  describe('the ordering', () => {
    it('keeps a group in the order the backend answered in', () => {
      const groups = toPrnGroups([
        aNote({
          id: 'older',
          status: 'accepted',
          issuedAt: '2026-01-10T09:00:00.000Z'
        }),
        aNote({
          id: 'newer',
          status: 'accepted',
          issuedAt: '2026-01-20T09:00:00.000Z'
        })
      ])

      // The tables are read whole, and reordering them would reorder the
      // operator's list too.
      expect(ids(groups.issued)).toStrictEqual(['older', 'newer'])
    })

    it('orders the most recent by date issued, newest first', () => {
      const groups = toPrnGroups([
        aNote({
          id: 'older',
          status: 'accepted',
          issuedAt: '2026-01-10T09:00:00.000Z'
        }),
        aNote({
          id: 'newer',
          status: 'accepted',
          issuedAt: '2026-01-20T09:00:00.000Z'
        })
      ])

      expect(ids(groups.mostRecent)).toStrictEqual(['newer', 'older'])
    })

    it('puts a note awaiting issue above every note already issued', () => {
      const groups = toPrnGroups([
        aNote({
          id: 'issued-today',
          status: 'accepted',
          issuedAt: '2026-02-01T09:00:00.000Z'
        }),
        aNote({
          id: 'awaiting-issue',
          status: 'awaiting_acceptance',
          createdAt: '2020-01-01T09:00:00.000Z',
          issuedAt: null
        })
      ])

      expect(ids(groups.mostRecent)).toStrictEqual([
        'awaiting-issue',
        'issued-today'
      ])
    })

    it('orders two unissued notes newest date created first', () => {
      const groups = toPrnGroups([
        aNote({
          id: 'older',
          status: 'awaiting_authorisation',
          createdAt: '2026-01-10T09:00:00.000Z'
        }),
        aNote({
          id: 'newer',
          status: 'awaiting_authorisation',
          createdAt: '2026-01-20T09:00:00.000Z'
        })
      ])

      expect(ids(groups.mostRecent)).toStrictEqual(['newer', 'older'])
    })
  })

  describe('the most recent', () => {
    it('draws its three across every group, not from one of them', () => {
      const groups = toPrnGroups([
        aNote({
          id: 'oldest-issued',
          status: 'accepted',
          issuedAt: '2026-01-01T09:00:00.000Z'
        }),
        aNote({
          id: 'newest-issued',
          status: 'cancelled',
          issuedAt: '2026-03-01T09:00:00.000Z'
        }),
        aNote({
          id: 'middle-issued',
          status: 'accepted',
          issuedAt: '2026-02-01T09:00:00.000Z'
        }),
        aNote({
          id: 'awaiting',
          status: 'awaiting_authorisation',
          createdAt: '2020-01-01T09:00:00.000Z'
        })
      ])

      expect(ids(groups.mostRecent)).toStrictEqual([
        'awaiting',
        'newest-issued',
        'middle-issued'
      ])
    })

    it('names what there is where the accreditation holds fewer than three', () => {
      const groups = toPrnGroups([
        aNote({ id: 'only', status: 'awaiting_authorisation' })
      ])

      expect(ids(groups.mostRecent)).toStrictEqual(['only'])
    })
  })

  describe('emptiness', () => {
    it('answers empty for an accreditation that has issued nothing', () => {
      const groups = toPrnGroups([])

      expect(groups).toStrictEqual({
        awaitingAuthorisation: [],
        awaitingCancellation: [],
        issued: [],
        cancelled: [],
        mostRecent: [],
        isEmpty: true
      })
    })

    it('answers empty for notes a regulator may not see, which hasCreatedPrns would not', () => {
      const groups = toPrnGroups([
        aNote({ id: 'discarded', status: 'discarded' })
      ])

      expect(groups.isEmpty).toBe(true)
    })

    it('answers not empty as soon as one note falls in a group', () => {
      const groups = toPrnGroups([
        aNote({ id: 'draft', status: 'draft' }),
        aNote({ id: 'cancelled', status: 'cancelled' })
      ])

      expect(groups.isEmpty).toBe(false)
    })
  })
})

/**
 * @import { PackagingRecyclingNote } from './fetch-packaging-recycling-notes.js'
 */
