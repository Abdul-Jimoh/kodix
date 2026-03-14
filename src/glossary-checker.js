async function checkGlossaryViolations(files, lingoApiKey, engineId, baseLocaleContent, baseLocale) {
  const issues = [];

  if (!lingoApiKey) {
    console.log("Kodix: No Lingo.dev API key provided, skipping glossary check");
    return issues;
  }

  // Filter only changed locale JSON files, excluding the base locale
  const localeFiles = files.filter(
    (file) =>
      file.filename.endsWith(".json") &&
      file.status !== "removed" &&
      !file.filename.includes(`${baseLocale}.json`)
  );

  if (localeFiles.length === 0) {
    console.log("Kodix: No non-base locale files changed, skipping glossary check");
    return issues;
  }

  for (const file of localeFiles) {
    if (!file.patch) continue;

    // Get the keys that were added/modified in this locale file
    const addedKeys = extractAddedKeys(file.patch);
    if (addedKeys.length === 0) continue;

    // Build pairs using base locale source values for these keys
    const sourcePairs = {};
    addedKeys.forEach((key) => {
      if (baseLocaleContent[key]) {
        sourcePairs[key] = baseLocaleContent[key];
      }
    });

    if (Object.keys(sourcePairs).length === 0) continue;

    // Detect target locale from filename e.g locales/fr.json -> fr
    const targetLocale = detectLocale(file.filename);
    if (!targetLocale) continue;

    console.log(
      `Kodix: Checking ${Object.keys(sourcePairs).length} translations in ${file.filename} against Lingo.dev engine`
    );

    try {
      // Ask Lingo.dev what the correct translations should be
      // using the base locale values as source
      const suggested = await localizeWithLingo(
        sourcePairs,
        baseLocale,
        targetLocale,
        lingoApiKey,
        engineId
      );

      // Get actual translated values for comparison
      const actualPairs = extractAddedPairs(file.patch);

      console.log(`Kodix DEBUG - source: ${JSON.stringify(sourcePairs)}`);
      console.log(`Kodix DEBUG - actual: ${JSON.stringify(actualPairs)}`);
      console.log(`Kodix DEBUG - suggested: ${JSON.stringify(suggested)}`);

      // Compare suggested vs actual translations
      for (const key of Object.keys(sourcePairs)) {
        const actual = actualPairs[key]?.toLowerCase().trim();
        const expected = suggested[key]?.toLowerCase().trim();

        if (!actual || !expected) continue;

        const similarity = calculateSimilarity(actual, expected);

        if (similarity < 0.7) {
          issues.push(
            `📖 Possible glossary/brand voice violation in \`${file.filename}\` for key \`${key}\`: got "${actualPairs[key]}" but Lingo.dev suggests "${suggested[key]}"`
          );
        }
      }
    } catch (error) {
      console.log(`Kodix: Could not check ${file.filename} — ${error.message}`);
    }
  }

  return issues;
}

function extractAddedKeys(patch) {
  const keys = [];
  const lines = patch.split("\n");
  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const match = line.match(/^\+\s*"([^"]+)"\s*:/);
      if (match) keys.push(match[1]);
    }
  });
  return keys;
}

function extractAddedPairs(patch) {
  const pairs = {};
  const lines = patch.split("\n");
  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const match = line.match(/^\+\s*"([^"]+)"\s*:\s*"([^"]+)"/);
      if (match) {
        pairs[match[1]] = match[2];
      }
    }
  });
  return pairs;
}

function detectLocale(filename) {
  const match = filename.match(/([a-z]{2}(?:-[A-Z]{2})?)\.json$/);
  return match ? match[1] : null;
}

async function localizeWithLingo(data, sourceLocale, targetLocale, apiKey, engineId) {
  const body = {
    sourceLocale,
    targetLocale,
    data,
  };

  if (engineId) {
    body.engineId = engineId;
  }

  console.log(`Kodix DEBUG - calling lingo with engineId: "${engineId}" sourceLocale: "${sourceLocale}" targetLocale: "${targetLocale}"`);
  console.log(`Kodix DEBUG - request body: ${JSON.stringify(body)}`);

  const response = await fetch("https://api.lingo.dev/process/localize", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Lingo.dev API returned ${response.status}`);
  }

  const result = await response.json();
  return result.data || {};
}

function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  const intersection = [...words1].filter((word) => words2.has(word));
  const union = new Set([...words1, ...words2]);
  return intersection.length / union.size;
}

module.exports = { checkGlossaryViolations };