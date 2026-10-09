// govuk-frontend ships no declarations. This describes only the surface this
// codebase imports: components are opaque, since they are handed to createAll
// and never touched directly.
declare module 'govuk-frontend' {
  class Component {
    constructor(root: Element, config?: Record<string, unknown>)
  }

  export const Accordion: typeof Component
  export const Button: typeof Component
  export const CharacterCount: typeof Component
  export const Checkboxes: typeof Component
  export const ErrorSummary: typeof Component
  export const Radios: typeof Component
  export const SkipLink: typeof Component
  export const Tabs: typeof Component

  export function createAll<ComponentClass extends typeof Component>(
    Component: ComponentClass,
    config?: Record<string, unknown>,
    scopeOrOptions?: Element | Document | null
  ): InstanceType<ComponentClass>[]
}
