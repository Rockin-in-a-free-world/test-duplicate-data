/**
 * File Scanner Module
 * Scans directories for markdown files and builds import maps
 */

const fs = require("fs");
const path = require("path");

// Directories where remote content is downloaded (relative to docs/)
const DOWNLOAD_DIRS = [
  "services/reference/_partials",
  "services/reference/ethereum",
  "services/reference/linea",
  "services/reference/base",
  "services/reference/gas-api",
  "services/reference/ipfs",
  "services/concepts",
  "services/get-started",
  "services/how-to",
  "services/tutorials",
];

/**
 * Get all markdown files from downloaded directories
 */
function getAllMarkdownFiles(docsPath) {
  const files = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip config files and hidden files (except files inside _partials directory)
      const isInPartials = fullPath.includes(path.join("reference", "_partials"));
      if (entry.name === "_config.yml" || (entry.name.startsWith("_") && !isInPartials)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
        files.push(fullPath);
      }
    }
  }
  
  // Scan all download directories
  DOWNLOAD_DIRS.forEach(relativeDir => {
    const fullDir = path.join(docsPath, relativeDir);
    scanDirectory(fullDir);
  });
  
  return files;
}

/**
 * Build a map of partial files to the files that import them
 * This allows us to validate links in partials from the importing file's context
 */
function buildPartialImportMap(files, docsPath) {
  const partialImportMap = new Map();
  const partialsDir = path.join(docsPath, "services/reference/_partials");
  
  files.forEach(filePath => {
    // Skip partial files themselves
    if (filePath.includes(path.join("reference", "_partials"))) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    // Match import statements: import X from "../../_partials/..." or "/services/reference/_partials/..."
    const importRegex = /import\s+\w+\s+from\s+["']([^"']*_partials[^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let partialPath;
      
      // Handle absolute paths starting with /services/reference/_partials/
      if (importPath.startsWith('/services/reference/_partials/') || importPath.startsWith('/service/reference/_partials/')) {
        const relativePath = importPath.replace(/^\/services?\/reference\/_partials\//, '');
        partialPath = path.join(partialsDir, relativePath);
      }
      // Handle relative paths
      else if (importPath.includes('_partials')) {
        const baseDir = path.dirname(filePath);
        partialPath = path.resolve(baseDir, importPath);
      }
      
      if (partialPath && fs.existsSync(partialPath)) {
        const normalizedPartialPath = path.normalize(partialPath);
        if (!partialImportMap.has(normalizedPartialPath)) {
          partialImportMap.set(normalizedPartialPath, []);
        }
        partialImportMap.get(normalizedPartialPath).push(filePath);
      }
    }
  });
  
  return partialImportMap;
}

module.exports = {
  getAllMarkdownFiles,
  buildPartialImportMap,
};

