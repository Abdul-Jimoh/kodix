async function checkGlossaryViolations(files, lingoApiKey, engineId) {
  const issues = [];

  if (!lingoApiKey) {
    console.log(
      "Kodix: No Lingo.dev API key provided, skipping glossary check",
    );
    return issues;
  }

  // Filter only changed locale JSON files, excluding the base locale
  const localeFiles = files.filter(
    (file) =>
      file.filename.endsWith(".json") &&
      file.status !== "removed" &&
      !file.filename.includes("en.json"),
  );

  if (localeFiles.length === 0) {
    console.log(
      "Kodix: No non-base locale files changed, skipping glossary check",
    );
    return issues;
  }

  for (const file of localeFiles) {
    if (!file.patch) continue;

    // Extract added translation pairs from the diff
    const addedPairs = extractAddedPairs(file.patch);
    if (Object.keys(addedPairs).length === 0) continue;

    // Detect target locale from filename e.g locales/fr.json -> fr
    const targetLocale = detectLocale(file.filename);
    if (!targetLocale) continue;

    console.log(
      `Kodix: Checking ${Object.keys(addedPairs).length} translations in ${file.filename} against Lingo.dev engine`,
    );

    try {
      // Ask Lingo.dev what the correct translations should be
      const suggested = await localizeWithLingo(
        addedPairs,
        "en",
        targetLocale,
        lingoApiKey,
        engineId,
      );

      console.log(`Kodix DEBUG - actual: ${JSON.stringify(addedPairs)}`);
      console.log(`Kodix DEBUG - suggested: ${JSON.stringify(suggested)}`);

      // Compare suggested vs actual translations
      for (const key of Object.keys(addedPairs)) {
        const actual = addedPairs[key].toLowerCase().trim();
        const expected = suggested[key]?.toLowerCase().trim();

        if (!expected) continue;

        // Calculate similarity between actual and expected
        const similarity = calculateSimilarity(actual, expected);

        // Flag if they're significantly different (less than 70% similar)
        if (similarity < 0.7) {
          issues.push(
            `📖 Possible glossary/brand voice violation in \`${file.filename}\` for key \`${key}\`: got "${addedPairs[key]}" but Lingo.dev suggests "${suggested[key]}"`,
          );
        }
      }
    } catch (error) {
      console.log(`Kodix: Could not check ${file.filename} — ${error.message}`);
    }
  }

  return issues;
}

function extractAddedPairs(patch) {
  const pairs = {};
  const lines = patch.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      // Match "key": "value" pattern
      const match = line.match(/^\+\s*"([^"]+)"\s*:\s*"([^"]+)"/);
      if (match) {
        pairs[match[1]] = match[2];
      }
    }
  });

  return pairs;
}

function detectLocale(filename) {
  // Extract locale from filename e.g locales/fr.json -> fr
  const match = filename.match(/([a-z]{2}(?:-[A-Z]{2})?)\.json$/);
  return match ? match[1] : null;
}

async function localizeWithLingo(
  data,
  sourceLocale,
  targetLocale,
  apiKey,
  engineId,
) {
  const body = {
    sourceLocale,
    targetLocale,
    data,
  };

  // Only include engineId if provided
  if (engineId) {
    body.engineId = engineId;
  }

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
  // Simple similarity check using common words (Jaccard similarity)
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = [...words1].filter((word) => words2.has(word));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
}

module.exports = { checkGlossaryViolations };
