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
- Translate a product name that your brand glossary says should stay untranslated

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
Scans changed JS/JSX/TS/TSX files for user-facing text that isn't using a translation function.
```
Hardcoded string found in `src/components/Hero.jsx`: "Get started today"
Hardcoded attribute `placeholder="Enter your email"` in `src/components/Form.tsx`
```

### Glossary Violations
Uses your Lingo.dev glossary to catch translations that don't respect your brand terminology.
```
Possible glossary violation in `locales/de.json`: "checkout" should be translated as "Checkout"
```

---

## Quick Start

### 1. Add your Lingo.dev API key to GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- Name: `LINGO_API_KEY`
- Value: your Lingo.dev API key from [lingo.dev](https://lingo.dev)

### 2. Create the workflow file

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
          locales-path: "locales/"
          base-locale: "en"
```

### 3. Open a PR

That's it. Kodix will automatically review every PR and post a comment with any i18n issues found.

---

## Configuration

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for posting comments | ✅ | — |
| `lingo-api-key` | Lingo.dev API key for glossary checks | ✅ | — |
| `locales-path` | Path to your locale JSON files | ✅ | `locales/` |
| `base-locale` | Your source language code | ✅ | `en` |

---

## Blocking Merges

To prevent merging when i18n issues are found:

1. Go to your repo → **Settings** → **Branches**
2. Add a branch protection rule for `main`
3. Enable **"Require status checks to pass before merging"**
4. Add **"Kodix i18n Review"** as a required check

---

## How It Works
```
PR opened/updated
       ↓
GitHub Action triggers
       ↓
Kodix fetches changed files from GitHub API
       ↓
   ┌──────────────────────────────────────┐
   │  Runs 3 checks in parallel           │
   │  ├── Key Checker (locale JSON files) │
   │  ├── Hardcode Scanner (JSX/JS files) │
   │  └── Glossary Checker (Lingo.dev)   │
   └──────────────────────────────────────┘
       ↓
Posts review comment on PR
       ↓
Fails action if issues found ❌
```

---

## Requirements

- Your project uses **JSON locale files** for i18n (e.g. `locales/en.json`, `locales/fr.json`)
- Translation functions like `t()` or `useTranslation()` from libraries like `react-i18next`, `next-intl`, or similar

---

## Built With

- [Lingo.dev](https://lingo.dev) — Localization engine for glossary and brand voice checks
- [@actions/core](https://github.com/actions/toolkit) — GitHub Actions toolkit
- [@actions/github](https://github.com/actions/toolkit) — GitHub API client
- [@babel/parser](https://babeljs.io/docs/babel-parser) — AST parsing for hardcoded string detection

---

## License

MIT © [Abdulqadir Jimoh](https://github.com/Abdul-Jimoh)