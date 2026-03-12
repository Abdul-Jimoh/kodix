const core = require("@actions/core");
const github = require("@actions/github");

const { parseDiff } = require("./diff-parser");
const { checkMissingKeys } = require("./key-checker");
const { scanHardcodedStrings } = require("./hardcode-scanner");
const { checkGlossaryViolations } = require("./glossary-checker");

async function run() {
  try {
    const githubToken = core.getInput("github-token");
    const lingoApiKey = core.getInput("lingo-api-key");
    const localesPath = core.getInput("locales-path");
    const baseLocale = core.getInput("base-locale");

    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    const { owner, repo } = context.repo;
    const prNumber = context.payload.pull_request.number;

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    console.log(
      `Kodix: Found ${files.length} changed files in PR #${prNumber}`,
    );

    const missingKeys = await checkMissingKeys(files, localesPath, baseLocale);
    const hardcodedStrings = await scanHardcodedStrings(files);
    const glossaryViolations = await checkGlossaryViolations(
      files,
      lingoApiKey,
    );

    const allIssues = [
      ...missingKeys,
      ...hardcodedStrings,
      ...glossaryViolations,
    ];

    let comment = "## 🌍 Kodix i18n Review\n\n";

    if (allIssues.length === 0) {
      comment += "✅ No i18n issues found. Great work!\n";
    } else {
      comment += `Found **${allIssues.length} i18n issue(s)** that need attention:\n\n`;
      allIssues.forEach((issue) => {
        comment += `- ${issue}\n`;
      });
    }

    comment +=
      "\n\n---\n*Powered by [Kodix](https://github.com/Abdul-Jimoh/kodix) using [Lingo.dev](https://lingo.dev)*";

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment,
    });

    console.log("Kodix: Review comment posted successfully");
  } catch (error) {
    core.setFailed(`Kodix failed: ${error.message}`);
  }
}

run();
