export const paths = Object.freeze({
  auth: Object.freeze({
    defraId: Object.freeze({
      callback: '/auth/callback',
      login: '/login',
      organisation: '/auth/organisation'
    }),
    entraId: Object.freeze({
      callback: '/auth/callback/entra',
      login: '/regulators/login'
    }),
    postLogoutRedirect: '/auth/logout'
  }),
  loggedOut: '/logged-out',
  logout: '/logout',
  regulators: Object.freeze({
    home: '/regulators/home',
    loggedOut: '/regulators/logged-out',
    marketInsights: '/regulators/market-insights',
    marketInsightsYear: '/regulators/market-insights/{year}',
    marketInsightsChooseYear: '/regulators/market-insights/{year}/choose-year',
    marketInsightsEngland: '/regulators/market-insights/{year}/england',
    marketInsightsExport: '/regulators/market-insights/{year}/export.zip',
    marketInsightsNorthernIreland:
      '/regulators/market-insights/{year}/northern-ireland',
    marketInsightsOutstandingReturns:
      '/regulators/market-insights/{year}/outstanding-returns',
    marketInsightsScotland: '/regulators/market-insights/{year}/scotland',
    marketInsightsUk: '/regulators/market-insights/{year}/uk',
    marketInsightsUnredactedWorkbook:
      '/regulators/market-insights/{year}/unredacted-workbook.xlsx',
    marketInsightsWales: '/regulators/market-insights/{year}/wales',
    marketInsightsWasteBalance:
      '/regulators/market-insights/{year}/waste-balance',
    marketInsightsWorkbook: '/regulators/market-insights/{year}/workbook.xlsx',
    start: '/regulators/start'
  }),
  start: '/start'
})
