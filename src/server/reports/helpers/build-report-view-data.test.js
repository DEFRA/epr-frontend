import { describe, expect, it } from 'vitest'

import {
  buildPrnSummaryViewData,
  buildWasteExportedViewData,
  buildWasteReceivedViewData,
  buildWasteSentOnViewData
} from './build-report-view-data.js'

describe('build-report-view-data', () => {
  describe(buildWasteReceivedViewData, () => {
    it('should format the total and build 5-column supplier rows', () => {
      const recyclingActivity = {
        totalTonnageReceived: 100.5,
        tonnageRecycled: null,
        tonnageNotRecycled: null,
        suppliers: [
          {
            supplierName: 'Acme',
            facilityType: 'Landfill',
            tonnageReceived: 12,
            supplierAddress: '1 Road',
            supplierPhone: '01234',
            supplierEmail: 'a@b.com'
          }
        ]
      }

      expect(buildWasteReceivedViewData(recyclingActivity)).toStrictEqual({
        totalTonnage: '100.50',
        supplierDetailRows: [
          [
            { text: 'Acme' },
            { text: 'Landfill' },
            { text: '1 Road' },
            { text: '01234' },
            { text: 'a@b.com' }
          ]
        ]
      })
    })
  })

  describe(buildWasteSentOnViewData, () => {
    it('should format the total and breakdown and build 4-column destination rows', () => {
      const wasteSent = {
        tonnageSentToReprocessor: 10,
        tonnageSentToExporter: 20,
        tonnageSentToAnotherSite: 30,
        finalDestinations: [
          {
            recipientName: 'Recipient',
            facilityType: 'Reprocessor',
            address: '2 Street',
            tonnageSentOn: 5
          }
        ]
      }

      expect(buildWasteSentOnViewData(wasteSent)).toStrictEqual({
        totalTonnage: '60.00',
        toReprocessors: '10.00',
        toExporters: '20.00',
        toOtherSites: '30.00',
        destinationDetailRows: [
          [
            { text: 'Recipient' },
            { text: 'Reprocessor' },
            { text: '2 Street' },
            { text: '5.00' }
          ]
        ]
      })
    })
  })

  describe(buildWasteExportedViewData, () => {
    it('should format tonnages and build rows, showing the approval column when requested', () => {
      const exportActivity = {
        totalTonnageExported: 40,
        overseasSites: [
          {
            siteName: 'Site',
            orsId: 'O1',
            country: 'DE',
            tonnageExported: 7,
            approved: true
          }
        ],
        unapprovedOverseasSites: [{ orsId: 'U1', tonnageExported: 3 }],
        tonnageReceivedNotExported: 2,
        tonnageRefusedAtDestination: 1,
        tonnageStoppedDuringExport: null,
        totalTonnageRefusedOrStopped: 1,
        tonnageRepatriated: 0
      }

      expect(
        buildWasteExportedViewData(exportActivity, { showApprovalColumn: true })
      ).toStrictEqual({
        totalTonnage: '40.00',
        overseasSiteRows: [
          [{ text: 'Site' }, { text: 'O1' }, { text: 'DE' }, { text: 'Yes' }]
        ],
        unapprovedOverseasSiteRows: [[{ text: 'U1' }]],
        tonnageReceivedNotExported: '2.00',
        tonnageRefused: '1.00',
        tonnageStopped: '-',
        tonnageRefusedOrStopped: '1.00',
        tonnageRepatriated: '0.00'
      })
    })

    it('should return an empty, dashed shape when export activity is absent', () => {
      expect(
        buildWasteExportedViewData(undefined, { showApprovalColumn: false })
      ).toStrictEqual({
        totalTonnage: '0.00',
        overseasSiteRows: [],
        unapprovedOverseasSiteRows: [],
        tonnageReceivedNotExported: '-',
        tonnageRefused: '-',
        tonnageStopped: '-',
        tonnageRefusedOrStopped: '-',
        tonnageRepatriated: '-'
      })
    })
  })

  describe(buildPrnSummaryViewData, () => {
    it('should format each populated value', () => {
      expect(
        buildPrnSummaryViewData({
          issuedTonnage: 75,
          totalRevenue: 1576.12,
          freeTonnage: 5,
          averagePricePerTonne: 21.01
        })
      ).toStrictEqual({
        issuedTonnage: '75',
        totalRevenue: '£1,576.12',
        freeTonnage: '5',
        averagePricePerTonne: '£21.01'
      })
    })

    it('should dash absent values while formatting the rest', () => {
      expect(
        buildPrnSummaryViewData({
          issuedTonnage: 75,
          totalRevenue: null,
          freeTonnage: null,
          averagePricePerTonne: null
        })
      ).toStrictEqual({
        issuedTonnage: '75',
        totalRevenue: '-',
        freeTonnage: '-',
        averagePricePerTonne: '-'
      })
    })

    it('should dash every value when the prn is absent', () => {
      expect(buildPrnSummaryViewData(undefined)).toStrictEqual({
        issuedTonnage: '-',
        totalRevenue: '-',
        freeTonnage: '-',
        averagePricePerTonne: '-'
      })
    })
  })
})
