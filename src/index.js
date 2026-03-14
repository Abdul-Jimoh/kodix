const core = require("@actions/core");
const github = require("@actions/github");

const { checkMissingKeys } = require("./key-checker");
const { scanHardcodedStrings } = require("./hardcode-scanner");
const { checkGlossaryViolations } = require("./glossary-checker");

async function run() {
  try {
    const githubToken = core.getInput("github-token");
    const lingoApiKey = core.getInput("lingo-api-key");
    const localesPath = core.getInput("locales-path");
    const baseLocale = core.getInput("base-locale");
    const lingoEngineId = core.getInput("lingo-engine-id");

    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    const { owner, repo } = context.repo;
    const prNumber = context.payload.pull_request.number;

    console.log(`Kodix: Starting i18n review for PR #${prNumber}`);

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    console.log(`Kodix: Found ${files.length} changed files`);

    const [missingKeys, hardcodedStrings, glossaryViolations] =
      await Promise.all([
        checkMissingKeys(files, localesPath, baseLocale),
        scanHardcodedStrings(
          files,
          octokit,
          owner,
          repo,
          context.payload.pull_request.head.sha,
        ),
        checkGlossaryViolations(files, lingoApiKey, lingoEngineId),
      ]);

    const allIssues = [
      ...missingKeys,
      ...hardcodedStrings,
      ...glossaryViolations,
    ];

    let comment = "## Kodix i18n Review\n\n";

    if (allIssues.length === 0) {
      comment += "**All i18n checks passed!** No issues found. Great work!\n";
    } else {
      comment += `Found **${allIssues.length} i18n issue(s)** that need attention:\n\n`;

      if (missingKeys.length > 0) {
        comment += "### Missing Translation Keys\n";
        missingKeys.forEach((issue) => {
          comment += `- ${issue}\n`;
        });
        comment += "\n";
      }

      if (hardcodedStrings.length > 0) {
        comment += "### Hardcoded Strings\n";
        hardcodedStrings.forEach((issue) => {
          comment += `- ${issue}\n`;
        });
        comment += "\n";
      }

      if (glossaryViolations.length > 0) {
        comment += "### Glossary Violations\n";
        glossaryViolations.forEach((issue) => {
          comment += `- ${issue}\n`;
        });
        comment += "\n";
      }
    }

    comment +=
      "---\n*Powered by [Kodix](https://github.com/Abdul-Jimoh/kodix) using [Lingo.dev](https://lingo.dev)*";

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });

    console.log("Kodix: Review comment posted successfully");

    if (allIssues.length > 0) {
      core.setFailed(
        `Kodix found ${allIssues.length} i18n issue(s). Please fix them before merging.`,
      );
    }
  } catch (error) {
    core.setFailed(`Kodix failed: ${error.message}`);
  }
}

run();
