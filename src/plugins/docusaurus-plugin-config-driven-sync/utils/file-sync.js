/**
 * File Sync Utility
 * 
 * Handles copying files from external sources (MetaMask docs) to the docs directory
 * based on YAML configuration files. Key features:
 * 
 * - Pattern matching: Supports wildcards (* and **) for flexible file selection
 * - Import transformation: Converts partial imports to point directly to external-services
 *   (no symlink or copy needed - all partials resolved directly from source)
 * - Link handling: Detects broken markdown links, removes links while keeping text,
 *   and adds metadata notes to affected pages
 * - Component cleanup: Removes imports for components that don't exist in this site
 * 
 * All partials are resolved directly from external-services/downstream-metamask-docs
 * via transformed relative import paths. No symlink or directory is created in docs/.
 */

const fs = require("fs");
const path = require("path");

/**
 * Resolve a source path relative to the config file's directory
 * @param {string} sourcePath - Source path from config (relative)
 * @param {string} configDir - Directory where config file is located
 * @returns {string} Absolute path to source directory
 */
function resolveSourcePath(sourcePath, configDir) {
  return path.resolve(configDir, sourcePath);
}

/**
 * Match a file path against include/exclude patterns
 * @param {string} filePath - Relative file path from source root
 * @param {Array<string>} includePatterns - Include patterns
 * @param {Array<string>} excludePatterns - Exclude patterns
 * @returns {boolean} Whether file should be included
 */
function shouldIncludeFile(filePath, includePatterns, excludePatterns) {
  // Check excludes first
  for (const excludePattern of excludePatterns) {
    if (matchesPattern(filePath, excludePattern)) {
      return false;
    }
  }
  
  // Check includes
  for (const includePattern of includePatterns) {
    if (matchesPattern(filePath, includePattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Simple pattern matching (supports * and **)
 * @param {string} filePath - File path to match
 * @param {string} pattern - Pattern to match against
 * @returns {boolean}
 */
function matchesPattern(filePath, pattern) {
  // Convert pattern to regex
  // First, escape special regex characters (but preserve * and **)
  let regexPattern = pattern
    .replace(/\*\*/g, "___DOUBLE_STAR___")
    .replace(/\*/g, "___SINGLE_STAR___");
  
  // Escape other special regex characters
  regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  
  // Now replace the placeholders with regex patterns
  regexPattern = regexPattern
    .replace(/___DOUBLE_STAR___/g, ".*")  // ** matches anything including slashes
    .replace(/___SINGLE_STAR___/g, "[^/]*");  // * matches anything except slashes
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Transform import paths in MDX files to point directly to external-services
 * - Converts absolute partial paths to relative paths pointing to external-services
 * - Removes imports for components that don't exist in our site
 * - Handles broken markdown links by removing links but keeping text
 * @param {string} filePath - Path to the MDX file
 * @param {string} destDir - Destination directory relative to docs root
 * @param {string} sourceRoot - Source root directory for context
 * @returns {boolean} Whether broken links were found
 */
function transformImportPaths(filePath, destDir, sourceRoot) {
  let content = fs.readFileSync(filePath, "utf8");
  let transformed = false;
  let hasBrokenLinks = false;
  
  // Calculate relative path to partials in external-services
  // All partials are resolved directly from external-services (no symlink needed)
  const fileDir = path.dirname(filePath);
  const partialsPath = path.resolve(process.cwd(), "external-services/downstream-metamask-docs/services/reference/_partials");
  const relativeToPartials = path.relative(fileDir, partialsPath).replace(/\\/g, "/");
  
  // Fix partial imports - handle both absolute and relative paths
  let newContent = content.replace(
    /from\s+["']\/services\/reference\/_partials\/([^"']+)["']/g,
    (match, partialName) => {
      transformed = true;
      // Ensure path starts with ./
      const relPath = relativeToPartials.startsWith(".") 
        ? relativeToPartials 
        : `./${relativeToPartials}`;
      return `from "${relPath}/${partialName}"`;
    }
  );
  
  // Also handle relative imports like "./_eth_chainid-request.mdx" that should point to _partials
  newContent = newContent.replace(
    /from\s+["']\.\/(_[^"']+\.mdx)["']/g,
    (match, fileName) => {
      // Check if this looks like a partial file (starts with _)
      if (fileName.startsWith('_')) {
        transformed = true;
        const relPath = relativeToPartials.startsWith(".") 
          ? relativeToPartials 
          : `./${relativeToPartials}`;
        return `from "${relPath}/${fileName}"`;
      }
      return match;
    }
  );
  content = newContent;
  
  // Remove imports for components that don't exist in our site (Phase 1)
  // Remove CreditCost and similar component imports
  const beforeRemove = content;
  content = content.replace(
    /^import\s+\w+\s+from\s+['"]@site\/src\/components\/[^'"]+['"];?\s*$/gm,
    ""
  );
  if (content !== beforeRemove) {
    transformed = true;
  }
  
  // Remove usage of CreditCost component (Phase 1: simple removal)
  content = content.replace(/<CreditCost[^>]*\s*\/>/g, "");
  
  // Transform markdown links to point to files that exist in our repo
  const docsRoot = path.resolve(process.cwd(), "docs");
  
  // Match markdown links: [text](path/to/file.mdx) or [text](path/to/file.md) or [text](path/to/file.md#anchor)
  content = content.replace(
    /\[([^\]]+)\]\(([^)]+\.(mdx?|md)(?:#[^)]*)?)\)/g,
    (match, linkText, linkPath, extension) => {
      // Skip if it's already an absolute URL (http/https)
      if (linkPath.startsWith("http://") || linkPath.startsWith("https://") || linkPath.startsWith("#")) {
        return match;
      }
      
      // Extract file path and anchor separately
      const anchorMatch = linkPath.match(/^([^#]+)(#.*)?$/);
      const filePathOnly = anchorMatch ? anchorMatch[1] : linkPath;
      const anchor = anchorMatch && anchorMatch[2] ? anchorMatch[2] : "";
      
      // Resolve the link path relative to the current file's directory
      let resolvedPath;
      if (filePathOnly.startsWith("/")) {
        // Absolute path from repo root - convert to relative from docs root
        resolvedPath = path.resolve(docsRoot, filePathOnly.substring(1));
      } else {
        // Relative path - resolve from current file's directory
        resolvedPath = path.resolve(fileDir, filePathOnly);
      }
      
      // Normalize the path
      resolvedPath = path.normalize(resolvedPath);
      
      // Check if the file exists in our docs directory
      if (fs.existsSync(resolvedPath) && resolvedPath.startsWith(docsRoot)) {
        // File exists - calculate relative path from current file
        const relativePath = path.relative(fileDir, resolvedPath).replace(/\\/g, "/");
        const newPath = relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
        transformed = true;
        return `[${linkText}](${newPath}${anchor})`;
      } else {
        // File doesn't exist - remove link, keep text, and mark that broken links were found
        hasBrokenLinks = true;
        console.warn(`[config-driven-sync] Broken link in ${path.relative(process.cwd(), filePath)}: [${linkText}](${linkPath}) - removing link, keeping text`);
        return linkText; // Remove link, keep text
      }
    }
  );
  
  // Add metadata note if broken links were found
  if (hasBrokenLinks) {
    // Check if file has frontmatter
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const frontmatterMatch = content.match(frontmatterRegex);
    
    if (frontmatterMatch) {
      // Has frontmatter - add note to it
      let frontmatter = frontmatterMatch[1];
      // Add or update the note field
      if (frontmatter.includes('note:')) {
        // Update existing note
        frontmatter = frontmatter.replace(/note:\s*["']?([^"'\n]*)["']?/i, (match, existingNote) => {
          const newNote = existingNote ? `${existingNote}; links unavailable` : 'links unavailable';
          return `note: "${newNote}"`;
        });
      } else {
        // Add new note field
        frontmatter += '\nnote: "links unavailable"';
      }
      content = content.replace(frontmatterRegex, `---\n${frontmatter}\n---\n`);
    } else {
      // No frontmatter - add it
      content = `---\nnote: "links unavailable"\n---\n\n${content}`;
    }
    transformed = true;
  }
  
  if (transformed || content !== fs.readFileSync(filePath, "utf8")) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Transformed import paths in: ${path.relative(process.cwd(), filePath)}`);
  }
  
  return hasBrokenLinks;
}

/**
 * Copy files from source to destination based on config
 * @param {Object} config - Config object with source, include, exclude
 * @param {string} configDir - Directory where config file is located
 * @param {string} destDir - Destination directory (relative to docs root)
 */
function syncFiles(config, configDir, destDir) {
  const sourceRoot = resolveSourcePath(config.source, configDir);
  const destRoot = path.resolve(process.cwd(), "docs", destDir);
  
  if (!fs.existsSync(sourceRoot)) {
    console.warn(`Source directory does not exist: ${sourceRoot}`);
    return;
  }
  
  // Ensure destination directory exists
  if (!fs.existsSync(destRoot)) {
    fs.mkdirSync(destRoot, { recursive: true });
  }
  
  // Check if synced files reference partials (for transformation purposes)
  // Partials are resolved directly from external-services - no symlink or copy needed
  let needsPartials = false;
  const copiedFiles = [];
  
  // First pass: collect files that will be copied to check for partial usage
  function collectFiles(currentSource, relativePath = "") {
    if (!fs.existsSync(currentSource)) {
      return;
    }
    
    const items = fs.readdirSync(currentSource);
    for (const item of items) {
      const itemSourcePath = path.join(currentSource, item);
      const itemRelativePath = path.join(relativePath, item).replace(/\\/g, "/");
      const stat = fs.statSync(itemSourcePath);
      
      if (stat.isDirectory()) {
        collectFiles(itemSourcePath, itemRelativePath);
      } else if (stat.isFile() && shouldIncludeFile(itemRelativePath, config.include, config.exclude)) {
        if (item.endsWith(".mdx") || item.endsWith(".md")) {
          copiedFiles.push(itemSourcePath);
        }
      }
    }
  }
  collectFiles(sourceRoot);
  
  // Check if any files use partial imports
  for (const filePath of copiedFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("/services/reference/_partials/") || content.includes("_partials/")) {
        needsPartials = true;
        break;
      }
    } catch (e) {
      // Skip if file can't be read
    }
  }
  
  // Transform partial files if needed (all partials come directly from external-services)
  // Import paths in synced files will be transformed to point directly to external-services
  if (needsPartials || config.partials_source) {
    const partialsSourceRoot = config.partials_source 
      ? resolveSourcePath(config.partials_source, configDir)
      : path.resolve(path.dirname(sourceRoot), "_partials");
    
    if (fs.existsSync(partialsSourceRoot)) {
      const stat = fs.statSync(partialsSourceRoot);
      if (!stat.isDirectory()) {
        console.warn(`[config-driven-sync] Partials source exists but is not a directory: ${partialsSourceRoot}`);
        return;
      }
      
      // Transform partial files to fix links and remove problematic imports
      // These files are accessed directly from external-services, no symlink needed
      function transformPartialFiles(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          let stat;
          try {
            stat = fs.statSync(itemPath);
          } catch (e) {
            continue;
          }
          if (stat.isDirectory()) {
            transformPartialFiles(itemPath);
          } else if (item.endsWith(".mdx") && stat.isFile()) {
            transformImportPaths(itemPath, "reference/_partials", sourceRoot);
          }
        }
      }
      transformPartialFiles(partialsSourceRoot);
      console.log(`[config-driven-sync] Partials resolved directly from: ${path.relative(process.cwd(), partialsSourceRoot)}`);
    } else {
      console.warn(`[config-driven-sync] Partials source does not exist: ${partialsSourceRoot}`);
    }
  }
  
  // Walk source directory and copy matching files (second pass: actual copy)
  function walkAndCopy(currentSource, currentDest, relativePath = "") {
    if (!fs.existsSync(currentSource)) {
      return;
    }
    
    const items = fs.readdirSync(currentSource);
    
    for (const item of items) {
      const itemSourcePath = path.join(currentSource, item);
      const itemRelativePath = path.join(relativePath, item).replace(/\\/g, "/");
      const stat = fs.statSync(itemSourcePath);
      
      if (stat.isDirectory()) {
        // Recursively process directories
        const itemDestPath = path.join(currentDest, item);
        walkAndCopy(itemSourcePath, itemDestPath, itemRelativePath);
      } else if (stat.isFile()) {
        // Check if file matches patterns
        if (shouldIncludeFile(itemRelativePath, config.include, config.exclude)) {
          const itemDestPath = path.join(currentDest, item);
          
          // Ensure parent directory exists
          const parentDir = path.dirname(itemDestPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          
          // Copy file
          fs.copyFileSync(itemSourcePath, itemDestPath);
          console.log(`Copied: ${itemRelativePath} -> ${path.relative(process.cwd(), itemDestPath)}`);
          
          // Transform import paths in MDX files
          // Partials will point directly to external-services via relative paths
          if (item.endsWith(".mdx")) {
            transformImportPaths(itemDestPath, destDir, sourceRoot);
          }
        }
      }
    }
  }
  
  walkAndCopy(sourceRoot, destRoot);
}

module.exports = {
  resolveSourcePath,
  shouldIncludeFile,
  syncFiles,
};

