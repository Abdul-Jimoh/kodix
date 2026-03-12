const { parseDiff } = require("./diff-parser");

async function checkMissingKeys(files, localesPath, baseLocale) {
  const issues = [];
  const { baseLocaleFile, otherLocaleFiles } = parseDiff(
    files,
    localesPath,
    baseLocale
  );

  if (!baseLocaleFile) {
    console.log("Kodix: No base locale file changed, skipping key check");
    return issues;
  }

  const addedKeys = extractAddedKeys(baseLocaleFile.content);

  if (addedKeys.length === 0) {
    console.log("Kodix: No new keys added to base locale, skipping key check");
    return issues;
  }

  console.log(`Kodix: Found ${addedKeys.length} new keys in base locale`);

  otherLocaleFiles.forEach((localeFile) => {
    const localeKeys = extractAllKeys(localeFile.content);
    const localeName = localeFile.filename;

    addedKeys.forEach((key) => {
      if (!localeKeys.includes(key)) {
        issues.push(
          `Missing translation key \`${key}\` in \`${localeName}\``
        );
      }
    });
  });

  return issues;
}

function extractAddedKeys(patch) {
  if (!patch) return [];

  const addedKeys = [];
  const lines = patch.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const match = line.match(/^\+\s*"([^"]+)"\s*:/);
      if (match) {
        addedKeys.push(match[1]);
      }
    }
  });

  return addedKeys;
}

function extractAllKeys(patch) {
  if (!patch) return [];

  const keys = [];
  const lines = patch.split("\n");

  lines.forEach((line) => {
    if (!line.startsWith("-")) {
      const match = line.match(/^\+?\s*"([^"]+)"\s*:/);
      if (match) {
        keys.push(match[1]);
      }
    }
  });

  return keys;
}

module.exports = { checkMissingKeys };
