// accessible-autocomplete ships no declarations, and resolves to a minified
// bundle nothing can be inferred from. This describes only the surface this
// codebase imports.
declare module 'accessible-autocomplete' {
  export interface EnhanceSelectElementOptions {
    defaultValue?: string
    minLength?: number
    selectElement: HTMLSelectElement
    showAllValues?: boolean
  }

  const accessibleAutocomplete: {
    enhanceSelectElement: (options: EnhanceSelectElementOptions) => void
  }

  export default accessibleAutocomplete
}
