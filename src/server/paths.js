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
    marketInsightsEngland: '/regulators/market-insights/england',
    marketInsightsExport: '/regulators/market-insights/export.zip',
    marketInsightsNorthernIreland:
      '/regulators/market-insights/northern-ireland',
    marketInsightsOutstandingReturns:
      '/regulators/market-insights/outstanding-returns',
    marketInsightsScotland: '/regulators/market-insights/scotland',
    marketInsightsUk: '/regulators/market-insights/uk',
    marketInsightsWales: '/regulators/market-insights/wales',
    marketInsightsWasteBalance: '/regulators/market-insights/waste-balance',
    start: '/regulators/start'
  }),
  start: '/start'
})
