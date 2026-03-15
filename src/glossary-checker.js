async function checkGlossaryViolations(files, lingoApiKey, engineId, baseLocaleContent, baseLocale) {
  const issues = [];

  if (!lingoApiKey) {
    console.log("Kodix: No Lingo.dev API key provided, skipping glossary check");
    return issues;
  }

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

    const addedKeys = extractAddedKeys(file.patch);
    if (addedKeys.length === 0) continue;

    const sourcePairs = {};
    addedKeys.forEach((key) => {
      if (baseLocaleContent[key]) {
        sourcePairs[key] = baseLocaleContent[key];
      }
    });

    if (Object.keys(sourcePairs).length === 0) continue;

    const targetLocale = detectLocale(file.filename);
    if (!targetLocale) continue;

    console.log(`Kodix: Checking ${Object.keys(sourcePairs).length} translations in ${file.filename} against Lingo.dev engine`);

    try {
      const suggested = await localizeWithLingo(
        sourcePairs,
        baseLocale,
        targetLocale,
        lingoApiKey,
        engineId
      );

      const actualPairs = extractAddedPairs(file.patch);

      for (const key of Object.keys(sourcePairs)) {
        const actual = actualPairs[key]?.toLowerCase().trim();
        const expected = suggested[key]?.toLowerCase().trim();

        if (!actual || !expected) continue;

        const similarity = calculateSimilarity(actual, expected);

        if (similarity < 0.3) {
          issues.push(
            `Possible glossary violation in \`${file.filename}\` for key \`${key}\`: got "${actualPairs[key]}" but Lingo.dev suggests "${suggested[key]}"`
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