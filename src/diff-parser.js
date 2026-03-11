const path = require("path");

function parseDiff(files, localesPath, baseLocale) {
  const localeFiles = [];
  const jsxFiles = [];

  files.forEach((file) => {
    const filePath = file.filename;
    const fileExtension = path.extname(filePath);

    // Check if this is a locale JSON file
    if (filePath.startsWith(localesPath) && fileExtension === ".json") {
      localeFiles.push({
        filename: filePath,
        status: file.status, // added, modified, removed
        content: file.patch, // the actual diff content
      });
    }

    // Check if this is a JS/JSX file
    if (
      [".js", ".jsx", ".ts", ".tsx"].includes(fileExtension) &&
      file.status !== "removed"
    ) {
      jsxFiles.push({
        filename: filePath,
        content: file.patch,
      });
    }
  });

  const baseLocaleFile = localeFiles.find((file) =>
    file.filename.includes(`${baseLocale}.json`)
  );

  const otherLocaleFiles = localeFiles.filter(
    (file) => !file.filename.includes(`${baseLocale}.json`)
  );

  return {
    baseLocaleFile,
    otherLocaleFiles,
    jsxFiles,
  };
}

module.exports = { parseDiff };