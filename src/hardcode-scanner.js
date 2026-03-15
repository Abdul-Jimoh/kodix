const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

async function scanHardcodedStrings(files, octokit, owner, repo, ref) {
  const issues = [];

  const jsFiles = files.filter((file) => {
    const ext = file.filename.split(".").pop();
    return (
      ["js", "jsx", "ts", "tsx"].includes(ext) && file.status !== "removed"
    );
  });

  for (const file of jsFiles) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref,
      });

      const content = Buffer.from(data.content, "base64").toString("utf-8");

      const ast = parser.parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
        errorRecovery: true,
      });

      traverse(ast, {
        JSXText(path) {
          const value = path.node.value.trim();
          if (value.length > 0 && /[a-zA-Z]/.test(value)) {
            issues.push(
              `Hardcoded string found in \`${file.filename}\`: "${value}" — consider using a translation key`
            );
          }
        },

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
                `Hardcoded attribute \`${attrName}="${attrValue}"\` in \`${file.filename}\` — consider using a translation key`
              );
            }
          }
        },
      });
    } catch (error) {
      console.log(`Kodix: Could not scan ${file.filename} — ${error.message}`);
    }
  }

  return issues;
}

module.exports = { scanHardcodedStrings };