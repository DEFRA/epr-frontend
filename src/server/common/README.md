# Server common work

For common work that is Server specific

## Putting a conditional control inside a component macro

A Nunjucks macro cannot see the calling template's context. A macro that reads a
context variable, such as the `isReadOnly` flag that hides write controls, gets
`undefined` for it unless every call site imports the macro
`{% from "…/macro.njk" import name with context %}`. There is no error and no
warning: the condition simply evaluates as though the variable were false, and
the control renders for everyone. Import `with context` at each call site, and
prove the behaviour with a test that renders the page and asserts the control is
absent.

The wider point is worth keeping in mind whenever a check like this is
automated: a test that scans source text proves a guard was **written**, never
that it **evaluates**. Pair any such check with one that renders.
