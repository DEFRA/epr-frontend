// Minimal shim for jsdom. The DefinitelyTyped @types/jsdom package adds
// browser-DOM ambient declarations that conflict with Node's `fetch`
// `RequestInit`/`BodyInit` shapes used in production code, so we declare
// only what tests touch — covering direct property access and the methods
// passed into `@testing-library/dom` queries.

declare module 'jsdom' {
  export interface JsdomElement {
    innerHTML: string
    textContent: string | null
    value: string
    classList: { contains(token: string): boolean }
    nextElementSibling: JsdomElement | null
    getAttribute(name: string): string | null
    querySelector(selector: string): JsdomElement | null
    querySelectorAll(selector: string): JsdomElement[]
  }

  export type DOMWindow = {
    readonly document: {
      readonly body: JsdomElement
      readonly title: string
      querySelector(selector: string): JsdomElement | null
    }
    readonly HTMLElement: new () => JsdomElement
  }

  export class JSDOM {
    constructor(input?: string)
    readonly window: DOMWindow
  }
}
