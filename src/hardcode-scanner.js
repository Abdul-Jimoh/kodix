const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

async function scanHardcodedStrings(files) {
  const issues = [];

  const jsFiles = files.filter((file) => {
    const ext = file.filename.split(".").pop();
    return (
      ["js", "jsx", "ts", "tsx"].includes(ext) && file.status !== "removed"
    );
  });

  jsFiles.forEach((file) => {
    if (!file.patch) return;

    const addedLines = extractAddedLines(file.patch);
    if (addedLines.length === 0) return;

    const codeString = addedLines.join("\n");

    try {
      const wrappedCode = `function __kodix_wrapper__() { ${codeString} }`;

      const ast = parser.parse(wrappedCode, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
        errorRecovery: true,
        strictMode: false,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
      });

      traverse(ast, {
        JSXText(path) {
          const value = path.node.value.trim();
          if (value.length > 0 && /[a-zA-Z]/.test(value)) {
            issues.push(
              `Hardcoded string found in \`${file.filename}\`: "${value}" — consider using a translation key`,
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
                `Hardcoded attribute \`${attrName}="${attrValue}"\` in \`${file.filename}\` — consider using a translation key`,
              );
            }
          }
        },
      });
    } catch (error) {
      console.log(`Kodix: Could not parse ${file.filename}, skipping`);
    }
  });

  return issues;
}

function extractAddedLines(patch) {
  if (!patch) return [];

  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

module.exports = { scanHardcodedStrings };
