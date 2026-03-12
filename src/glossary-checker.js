async function checkGlossaryViolations(files, lingoApiKey) {
  const issues = [];

  if (!lingoApiKey) {
    console.log("Kodix: No Lingo.dev API key provided, skipping glossary check");
    return issues;
  }
  const localeFiles = files.filter(
    (file) =>
      file.filename.endsWith(".json") && file.status !== "removed"
  );

  if (localeFiles.length === 0) {
    console.log("Kodix: No locale files changed, skipping glossary check");
    return issues;
  }

  try {
    const glossary = await fetchGlossary(lingoApiKey);

    if (!glossary || glossary.length === 0) {
      console.log("Kodix: No glossary entries found, skipping glossary check");
      return issues;
    }

    console.log(`Kodix: Checking against ${glossary.length} glossary entries`);

    localeFiles.forEach((file) => {
      if (!file.patch) return;

      const addedLines = file.patch
        .split("\n")
        .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
        .map((line) => line.slice(1));

      addedLines.forEach((line) => {
        const match = line.match(/:\s*"([^"]+)"/);
        if (!match) return;

        const translationValue = match[1];

        glossary.forEach((entry) => {
          const { sourceTerm, targetTerm, locale } = entry;

          if (
            translationValue.toLowerCase().includes(sourceTerm.toLowerCase()) &&
            targetTerm &&
            !translationValue.toLowerCase().includes(targetTerm.toLowerCase())
          ) {
            issues.push(
              `📖 Possible glossary violation in \`${file.filename}\`: "${sourceTerm}" should be translated as "${targetTerm}" for locale \`${locale}\``
            );
          }
        });
      });
    });
  } catch (error) {
    console.log(`Kodix: Glossary check failed — ${error.message}`);
  }

  return issues;
}

async function fetchGlossary(lingoApiKey) {
  const response = await fetch("https://api.lingo.dev/v1/glossary", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${lingoApiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Lingo.dev API returned ${response.status}`);
  }

  const data = await response.json();
  return data.entries || [];
}

module.exports = { checkGlossaryViolations };
