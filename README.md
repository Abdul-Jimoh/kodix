# Kodix — i18n Review for GitHub PRs

> Catch i18n issues before they reach production. Kodix reviews your pull requests for missing translation keys, hardcoded strings, and glossary violations — powered by [Lingo.dev](https://lingo.dev).

![GitHub Action](https://img.shields.io/badge/GitHub-Action-2088FF?logo=github-actions&logoColor=white)
![Lingo.dev](https://img.shields.io/badge/Powered%20by-Lingo.dev-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The Problem

Most i18n tools check your **translation files**. Kodix checks your **code and your brand**.

When a developer opens a PR, they might:
- Add a new key to `en.json` but forget `fr.json` and `de.json`
- Hardcode `<button>Subscribe</button>` instead of using `t('subscribe_button')`
- Translate a brand term that your Lingo.dev glossary says should stay untranslated

None of these show up in code review. They ship to production. Users see broken UI, raw keys, or off-brand translations.

Kodix catches all three — automatically, on every PR, before anything merges.

---

## What Kodix Checks

### Missing Translation Keys
Detects keys added to your base locale (e.g. `en.json`) that are missing in other locale files.
```
Missing translation key `subscribe_button` in `locales/fr.json`
Missing translation key `subscribe_button` in `locales/de.json`
```

### Hardcoded Strings
Fetches the full file content of every changed JS/JSX/TS/TSX file and scans it using an AST parser for user-facing text that isn't wrapped in a translation function.
```
Hardcoded string found in `src/components/Hero.jsx`: "Get started today"
Hardcoded attribute `placeholder="Enter your email"` in `src/components/Form.tsx`
```

### Glossary Violations
Sends your base locale values to your Lingo.dev localization engine and compares what the engine suggests against what the developer actually wrote. Catches translations that violate your glossary terms or brand voice.
```
Possible glossary violation in `locales/de.json` for key `checkout_title`: got "Kasse" but Lingo.dev suggests "Checkout"
```

---

## Quick Start

### 1. Set up your Lingo.dev engine

Create a free account at [lingo.dev](https://lingo.dev), create a localization engine, and configure your glossary and brand voice. Copy your API key and engine ID from the dashboard.

### 2. Add secrets to your GitHub repo

Go to your repo -> **Settings** -> **Secrets and variables** -> **Actions** and add:

| Secret | Value |
|--------|-------|
| `LINGO_API_KEY` | Your Lingo.dev API key |
| `LINGO_ENGINE_ID` | Your Lingo.dev engine ID (starts with `eng_`) |

### 3. Create the workflow file

Create `.github/workflows/kodix.yml` in your repo:
```yaml
name: Kodix i18n Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  i18n-review:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Kodix i18n Review
        uses: Abdul-Jimoh/kodix@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          lingo-api-key: ${{ secrets.LINGO_API_KEY }}
          lingo-engine-id: ${{ secrets.LINGO_ENGINE_ID }}
          locales-path: "locales/"
          base-locale: "en"
```

### 4. Open a PR

That's it. Kodix will automatically review every PR and post a comment with any i18n issues found. On subsequent pushes to the same PR, Kodix updates the existing comment instead of creating a new one.

---

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for posting comments | Yes | — |
| `lingo-api-key` | Lingo.dev API key | Yes | — |
| `lingo-engine-id` | Lingo.dev engine ID for glossary and brand voice checks | No | — |
| `locales-path` | Path to your locale JSON files | Yes | `locales/` |
| `base-locale` | Your source language code | Yes | `en` |

---

## Blocking Merges

To prevent merging when i18n issues are found:

1. Go to your repo -> **Settings** -> **Branches**
2. Add a branch protection rule for `main`
3. Enable **"Require status checks to pass before merging"**
4. Add **"Kodix i18n Review"** as a required check

---

## How It Works
```
PR opened or updated
        |
GitHub Action triggers
        |
Kodix fetches changed files from GitHub API
        |
        |-- Key Checker
        |   Parses PR diff to find new keys in base locale
        |   Checks all other locale files for those keys
        |
        |-- Hardcode Scanner
        |   Fetches full file content for each changed JS/JSX/TS/TSX file
        |   Parses into AST using Babel
        |   Detects JSX text and attributes that should be translation keys
        |
        |-- Glossary Checker
            Fetches base locale file content
            Sends English source values to Lingo.dev localization engine
            Compares suggested translations against what the developer wrote
            Flags significant differences as glossary or brand voice violations
        |
Posts or updates review comment on PR
        |
Fails action if issues found
```

---

## Requirements

- Your project uses JSON locale files for i18n (e.g. `locales/en.json`, `locales/fr.json`)
- Translation functions like `t()` or `useTranslation()` from libraries like `react-i18next`, `next-intl`, or similar

---

## Built With

- [Lingo.dev](https://lingo.dev) — Localization engine for glossary and brand voice checks
- [@actions/core](https://github.com/actions/toolkit) — GitHub Actions toolkit
- [@actions/github](https://github.com/actions/toolkit) — GitHub API client
- [@babel/parser](https://babeljs.io/docs/babel-parser) — AST parsing for hardcoded string detection
- [@babel/traverse](https://babeljs.io/docs/babel-traverse) — AST traversal for JSX node detection

---

## License

MIT © [Abdulqadir Jimoh](https://github.com/Abdul-Jimoh)