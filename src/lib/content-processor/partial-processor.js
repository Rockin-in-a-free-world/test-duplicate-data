/**
 * Partial Processor Module
 * Handles fixing partial import paths
 */

const path = require("path");

/**
 * Fix partial import paths
 * Converts absolute paths like /services/reference/_partials/... to relative paths
 */
function processPartials(content, filePath, docsPath) {
  let modified = false;
  const fileDir = path.dirname(filePath);
  const partialsPath = path.resolve(docsPath, "services/reference/_partials");
  const relativeToPartials = path.relative(fileDir, partialsPath).replace(/\\/g, "/");
  
  // Fix absolute paths like /services/reference/_partials/bundler/file.mdx
  content = content.replace(
    /from\s+["']\/services\/reference\/_partials\/([^"']+)["']/g,
    (match, partialName) => {
      modified = true;
      const relPath = relativeToPartials.startsWith(".") 
        ? relativeToPartials 
        : `./${relativeToPartials}`;
      return `from "${relPath}/${partialName}"`;
    }
  );
  
  // Also handle /service/reference/_partials/ (without 's')
  content = content.replace(
    /from\s+["']\/service\/reference\/_partials\/([^"']+)["']/g,
    (match, partialName) => {
      modified = true;
      const relPath = relativeToPartials.startsWith(".") 
        ? relativeToPartials 
        : `./${relativeToPartials}`;
      return `from "${relPath}/${partialName}"`;
    }
  );
  
  return { content, modified };
}

module.exports = {
  processPartials,
};

