# i18n Translation Runbook

This runbook documents the internationalization (i18n) workflow for epr-frontend, covering how to extract, translate, and import Welsh translations.

## Overview

The application supports two languages:

- **English (en)** - Default language
- **Welsh (cy)** - Accessed via `/cy/` URL prefix

Translations are organised by **namespace** (feature/page), with each namespace having its own `en.json` and `cy.json` files.

## File Structure

```
src/server/
├── common/
│   ├── en.json          # English translations
│   └── cy.json          # Welsh translations
├── home/
│   ├── en.json
│   └── cy.json
├── contact/
│   ├── en.json
│   └── cy.json
└── [namespace]/
    ├── en.json
    └── cy.json
```

## Translation Key Format

Keys use the format `namespace:key.nested.path`:

| Example Key                   | Namespace | Path                 |
| ----------------------------- | --------- | -------------------- |
| `common:serviceName`          | common    | serviceName          |
| `home:pageTitle`              | home      | pageTitle            |
| `common:footer.getHelp.email` | common    | footer.getHelp.email |

### Nested vs Flat Keys

Translation files support both nested objects and flat keys:

```json
{
  "back": "Back",
  "footer": {
    "crownCopyright": "Crown copyright",
    "getHelp": {
      "email": "example@gov.uk"
    }
  }
}
```

Access nested keys with dot notation: `common:footer.getHelp.email`

## Workflow: Extracting Translations

### 1. Extract untranslated strings to Excel

```bash
npm run i18n:extract
```

This generates `translations.xlsx` containing only strings that:

- Have English text
- Are missing Welsh translations

### 2. Preview extraction (dry run)

```bash
npm run i18n:extract:dry
```

### 3. Custom output filename

```bash
node scripts/export-translations.js --out my-translations.xlsx
```

### Excel Output Format

| field name                   | en                    | cy  |
| ---------------------------- | --------------------- | --- |
| common:serviceName           | Record reprocessed... |     |
| common:footer.crownCopyright | Crown copyright       |     |
| home:pageTitle               | Home                  |     |

## Workflow: Importing Translations

### 1. Prepare the Excel file

Ensure your Excel file has three columns:

- **field name** - The translation key (e.g., `common:serviceName`)
- **en** - English text (optional, for reference)
- **cy** - Welsh translation

Column headers are case-insensitive.

### 2. Import translations

```bash
npm run i18n:import
```

Default input file: `import-translations.xlsx`

### 3. Custom input filename

```bash
node scripts/import-translations.js --in my-translations.xlsx
```

Or using URL:

```bash
node scripts/import-translations.js --importFileURL my-translations.xlsx
```

### What the import does

1. Reads the Excel file
2. Groups translations by namespace
3. For each namespace:
   - Reads existing `cy.json` (or starts fresh if missing/invalid)
   - **Deep merges** new translations with existing ones
   - Handles nested keys correctly (e.g., `footer.getHelp.email` updates nested structure)
   - Writes updated `cy.json`

### Nested Key Handling

When importing `common:footer.getHelp.email`:

**Before:**

```json
{
  "footer": {
    "crownCopyright": "Existing",
    "getHelp": {
      "phone": "123"
    }
  }
}
```

**After:**

```json
{
  "footer": {
    "crownCopyright": "Existing",
    "getHelp": {
      "phone": "123",
      "email": "prawf@enghraifft.com"
    }
  }
}
```

## Checking Translation Status

```bash
npm run i18n:status
```

## Using Translations in Code

### In Controllers

```javascript
export const controller = {
  handler: async (request, h) => {
    const { t: localise } = request

    return h.view('home/index', {
      pageTitle: localise('home:pageTitle'),
      serviceName: localise('common:serviceName')
    })
  }
}
```

### In Nunjucks Templates

```nunjucks
<h1>{{ localise('common:serviceName') }}</h1>
<p>{{ localise('home:subheading') }}</p>
```

### URL Localisation

```javascript
// In controller
const { localiseUrl } = request
const homeUrl = localiseUrl('/home')
// Returns '/home' for English, '/cy/home' for Welsh
```

## Adding New Translations

### 1. Add the English translation

Edit the appropriate `en.json` file:

```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

### 2. Add placeholder Welsh translation

Edit the corresponding `cy.json` file with empty strings:

```json
{
  "newFeature": {
    "title": "",
    "description": ""
  }
}
```

### 3. Use in code

```javascript
localise('namespace:newFeature.title')
```

### 4. Extract and send for translation

```bash
npm run i18n:extract
# Send translations.xlsx to translator
```

### 5. Import completed translations

```bash
# Save translator's file as import-translations.xlsx
npm run i18n:import
```

## Troubleshooting

### Import not updating nested values

**Symptom:** Flat keys like `"footer.crownCopyright"` appearing at root level instead of inside nested objects.

**Cause:** Older import script version that didn't handle nested keys.

**Solution:** Ensure you're using the updated import script with `setNestedValue` and `deepMerge` helpers.

### Translation not appearing

1. Check the namespace matches the directory name
2. Verify the key exists in both `en.json` and `cy.json`
3. Check for typos in the key path
4. Restart the dev server to reload translations

### Excel import skipping rows

Rows are skipped if:

- **field name** column is empty
- **cy** column is empty
- **field name** doesn't contain a colon (`:`)

### Invalid JSON error during import

The import script handles invalid JSON gracefully - it will start fresh for that namespace. Check the console output for warnings.

## Configuration

### i18next.config.ts

Key settings:

```typescript
{
  locales: ['en', 'cy'],
  extract: {
    input: ['src/server/**/*.js', 'src/config/**/*.js'],
    output: 'src/server/{{namespace}}/{{language}}.json',
    defaultNS: 'common',
    keySeparator: '.',
    nsSeparator: ':',
    functions: ['t', '*.t', 'localise']
  }
}
```

### Custom Plugins

The extraction uses three custom plugins:

1. **i18next-nunjucks-plugin.mjs** - Extracts keys from `.njk` templates
2. **i18next-dynamic-keys-plugin.mjs** - Expands template literal keys
3. **i18next-export-plugin.mjs** - Transforms extraction to Excel format

## Scripts Reference

| Command                    | Description                           |
| -------------------------- | ------------------------------------- |
| `npm run i18n:extract`     | Extract untranslated strings to Excel |
| `npm run i18n:extract:dry` | Preview extraction without writing    |
| `npm run i18n:import`      | Import Welsh translations from Excel  |
| `npm run i18n:status`      | Check translation completeness        |

## Best Practices

1. **Keep translations co-located** - Each feature's translations should be in its namespace directory
2. **Use meaningful key names** - `pageTitle` not `title1`
3. **Nest related translations** - Group related strings under a common parent
4. **Extract regularly** - Run extraction after adding new strings
5. **Review imports** - Check git diff after importing to verify changes
6. **Test both languages** - Navigate with `/cy/` prefix to test Welsh
