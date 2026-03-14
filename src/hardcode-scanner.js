const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

async function scanHardcodedStrings(files, octokit, owner, repo, ref) {
  const issues = [];

  // Filter only JS/JSX/TS/TSX files that weren't removed
  const jsFiles = files.filter((file) => {
    const ext = file.filename.split(".").pop();
    return (
      ["js", "jsx", "ts", "tsx"].includes(ext) && file.status !== "removed"
    );
  });

  for (const file of jsFiles) {
    try {
      console.log(`Kodix: Scanning ${file.filename} for hardcoded strings`);

      // Fetch the complete file content from GitHub
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref,
      });

      // GitHub returns content as base64 encoded string
      const content = Buffer.from(data.content, "base64").toString("utf-8");

      // Parse the complete file into an AST
      const ast = parser.parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
        errorRecovery: true,
      });

      // Walk the AST and find hardcoded strings
      traverse(ast, {
        // Check JSX text content e.g <button>Click me</button>
        JSXText(path) {
          const value = path.node.value.trim();
          if (value.length > 0 && /[a-zA-Z]/.test(value)) {
            issues.push(
              `Hardcoded string found in \`${file.filename}\`: "${value}" — consider using a translation key`
            );
          }
        },

        // Check JSX attributes e.g placeholder="Enter name"
        JSXAttribute(path) {
          if (
            path.node.value &&
            path.node.value.type === "StringLiteral" &&
            /[a-zA-Z]{3,}/.test(path.node.value.value)
          ) {
            const attrName = path.node.name.name;
            const attrValue = path.node.value.value;
            if (["placeholder", "label", "title", "alt"].includes(attrName)) {
              issues.push(
                `🔤 Hardcoded attribute \`${attrName}="${attrValue}"\` in \`${file.filename}\` — consider using a translation key`
              );
            }
          }
        },
      });

      console.log(`Kodix: Finished scanning ${file.filename}`);

    } catch (error) {
      console.log(`Kodix: Could not scan ${file.filename} — ${error.message}`);
    }
  }

  return issues;
}

module.exports = { scanHardcodedStrings };