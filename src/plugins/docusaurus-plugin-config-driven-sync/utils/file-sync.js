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
 * - Replaces links based on link_replacements config before checking for broken links
 * - Adds metadata notes for broken links and "do not edit" warnings
 * @param {string} filePath - Path to the MDX file
 * @param {string} destDir - Destination directory relative to docs root
 * @param {string} sourceRoot - Source root directory for context
 * @param {boolean} isSyncedFile - Whether this is a synced file (true) or a partial (false)
 * @param {Map<string, boolean>} partialsWithBrokenLinks - Map of partial paths to whether they have broken links
 * @param {Object} linkReplacements - Map of broken paths to https URLs (from config.link_replacements)
 * @returns {boolean} Whether broken links were found
 */
function transformImportPaths(filePath, destDir, sourceRoot, isSyncedFile = false, partialsWithBrokenLinks = new Map(), linkReplacements = {}) {
  const originalContent = fs.readFileSync(filePath, "utf8");
  let content = originalContent;
  let transformed = false;
  let hasBrokenLinks = false;
  let importsPartialWithBrokenLinks = false;
  
  // Track transformations for logging
  const brokenLinks = [];
  const imageFixes = [];
  const componentFixes = [];
  
  // Calculate relative path to partials (now downloaded to docs/services/reference/_partials by remote-content)
  // Partials are resolved from the downloaded location
  const fileDir = path.dirname(filePath);
  const partialsPath = path.resolve(process.cwd(), "docs/services/reference/_partials");
  const relativeToPartials = path.relative(fileDir, partialsPath).replace(/\\/g, "/");
  
  // Fix partial imports - handle both absolute and relative paths
  // Also check if imported partials have broken links (for synced files)
  let newContent = content.replace(
    /from\s+["']\/services\/reference\/_partials\/([^"']+)["']/g,
    (match, partialName) => {
      transformed = true;
      // Ensure path starts with ./
      const relPath = relativeToPartials.startsWith(".") 
        ? relativeToPartials 
        : `./${relativeToPartials}`;
      const partialPath = path.join(partialsPath, partialName).replace(/\\/g, "/");
      // Check if this partial has broken links (for synced files)
      if (isSyncedFile && partialsWithBrokenLinks.has(partialPath)) {
        importsPartialWithBrokenLinks = true;
      }
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
        const partialPath = path.join(partialsPath, fileName).replace(/\\/g, "/");
        // Check if this partial has broken links (for synced files)
        if (isSyncedFile && partialsWithBrokenLinks.has(partialPath)) {
          importsPartialWithBrokenLinks = true;
        }
        return `from "${relPath}/${fileName}"`;
      }
      return match;
    }
  );
  content = newContent;
  
  // Remove imports for components that don't exist in our site (Phase 1)
  // Remove CreditCost and similar component imports
  const beforeRemove = content;
  const componentImportRegex = /^import\s+(\w+)\s+from\s+['"](@site\/src\/components\/[^'"]+)['"];?\s*$/gm;
  let match;
  while ((match = componentImportRegex.exec(beforeRemove)) !== null) {
    const componentName = match[1];
    const importPath = match[2];
    const relativeFilePath = path.relative(process.cwd(), filePath);
    componentFixes.push({
      file: relativeFilePath,
      type: "import",
      name: componentName,
      path: importPath,
      import: match[0].trim(),
    });
  }
  content = content.replace(
    /^import\s+\w+\s+from\s+['"]@site\/src\/components\/[^'"]+['"];?\s*$/gm,
    ""
  );
  if (content !== beforeRemove) {
    transformed = true;
  }
  
  // Remove usage of CreditCost component (Phase 1: simple removal)
  const creditCostMatches = content.match(/<CreditCost[^>]*\s*\/>/g);
  if (creditCostMatches) {
    const relativeFilePath = path.relative(process.cwd(), filePath);
    creditCostMatches.forEach(() => {
      componentFixes.push({
        file: relativeFilePath,
        type: "usage",
        name: "CreditCost",
        path: null,
        import: null,
      });
    });
  }
  content = content.replace(/<CreditCost[^>]*\s*\/>/g, "");
  
  // Replace specific broken links with working https URLs before checking for broken links
  // Link replacements come from config.link_replacements (e.g., dashboard, faucet)
  // Format in config: link_replacements: { "/developer-tools/faucet": "https://faucet.metamask.io/" }
  for (const [brokenPath, httpsUrl] of Object.entries(linkReplacements)) {
    const regex = new RegExp(`\\[([^\\]]+)\\]\\(${brokenPath.replace(/\//g, "\\/")}(?:#[^)]*)?\\)`, "g");
    content = content.replace(regex, (match, linkText) => {
      transformed = true;
      return `[${linkText}](${httpsUrl})`;
    });
  }
  
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
        const relativeFilePath = path.relative(process.cwd(), filePath);
        brokenLinks.push({ file: relativeFilePath, link: linkPath, text: linkText });
        console.warn(`[config-driven-sync] Broken link in ${relativeFilePath}: [${linkText}](${linkPath}) - removing link, keeping text`);
        return linkText; // Remove link, keep text
      }
    }
  );
  
  // For synced files: add "do not edit" warning and check for broken links in imported partials
  // For partials: only add note if they have broken links themselves
  const needsNote = isSyncedFile ? importsPartialWithBrokenLinks : hasBrokenLinks;
  
  // Check if file has frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const frontmatterMatch = content.match(frontmatterRegex);
  
  if (frontmatterMatch) {
    // Has frontmatter - update it
    let frontmatter = frontmatterMatch[1];
    
    // For synced files: always add/update the "do not edit" warning
    if (isSyncedFile) {
      if (frontmatter.includes('warn:')) {
        // Update existing warn if it doesn't already have the message
        if (!frontmatter.includes('do not edit this page')) {
          frontmatter = frontmatter.replace(/warn:\s*["']?([^"'\n]*)["']?/i, (match, existingWarn) => {
            const newWarn = existingWarn ? `${existingWarn}; do not edit this page, any changes will be overwritten at build` : 'do not edit this page, any changes will be overwritten at build';
            return `warn: "${newWarn}"`;
          });
        }
      } else {
        // Add new warn field
        frontmatter += '\nwarn: "do not edit this page, any changes will be overwritten at build"';
      }
    }
    
    // Add note for broken links (if needed and not already present)
    if (needsNote) {
      if (frontmatter.includes('note:')) {
        // Check if note already mentions links unavailable
        if (!frontmatter.includes('links unavailable')) {
          frontmatter = frontmatter.replace(/note:\s*["']?([^"'\n]*)["']?/i, (match, existingNote) => {
            const newNote = existingNote ? `${existingNote}; links unavailable` : 'links unavailable';
            return `note: "${newNote}"`;
          });
        }
      } else {
        // Add new note field
        frontmatter += '\nnote: "links unavailable"';
      }
    }
    
    content = content.replace(frontmatterRegex, `---\n${frontmatter}\n---\n`);
    transformed = true;
  } else {
    // No frontmatter - add it
    let newFrontmatter = '';
    if (isSyncedFile) {
      newFrontmatter += 'warn: "do not edit this page, any changes will be overwritten at build"';
    }
    if (needsNote) {
      if (newFrontmatter) newFrontmatter += '\n';
      newFrontmatter += 'note: "links unavailable"';
    }
    content = `---\n${newFrontmatter}\n---\n\n${content}`;
    transformed = true;
  }
  
  // Only write if content actually changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Transformed import paths in: ${path.relative(process.cwd(), filePath)}`);
    if (hasBrokenLinks) {
      console.log(`  → Added metadata note for broken links`);
    }
  }
  
  return {
    hasBrokenLinks,
    brokenLinks,
    imageFixes,
    componentFixes,
  };
}

/**
 * Copy files from source to destination based on config
 * @param {Object} config - Config object with source, include, exclude
 * @param {string} configDir - Directory where config file is located
 * @param {string} destDir - Destination directory (relative to docs root)
 */
function syncFiles(config, configDir, destDir) {
  // Files are already downloaded by remote-content, so process them in place
  // The destDir is where the files already exist (e.g., docs/services/reference/ethereum)
  const destRoot = path.resolve(process.cwd(), "docs", destDir);
  
  if (!fs.existsSync(destRoot)) {
    console.warn(`[config-driven-sync] Destination directory does not exist: ${destRoot}`);
    console.warn(`[config-driven-sync] Files may not have been downloaded yet. Run 'npm run get-remote' first.`);
    return;
  }
  
  // Check if files reference partials (for transformation purposes)
  // Partials are now in docs/services/reference/_partials (downloaded by remote-content)
  let needsPartials = false;
  const filesToProcess = [];
  
  // Collect files that already exist in destination to check for partial usage
  function collectFiles(currentDir, relativePath = "") {
    if (!fs.existsSync(currentDir)) {
      return;
    }
    
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      // Skip config files
      if (item === "_config.yml" || item.startsWith("_")) {
        continue;
      }
      
      const itemPath = path.join(currentDir, item);
      const itemRelativePath = path.join(relativePath, item).replace(/\\/g, "/");
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        collectFiles(itemPath, itemRelativePath);
      } else if (stat.isFile() && shouldIncludeFile(itemRelativePath, config.include, config.exclude)) {
        if (item.endsWith(".mdx") || item.endsWith(".md")) {
          filesToProcess.push(itemPath);
        }
      }
    }
  }
  collectFiles(destRoot);
  
  // Check if any files use partial imports
  for (const filePath of filesToProcess) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("/services/reference/_partials/") || content.includes("_partials/") || content.includes("from") && content.includes("_partials")) {
        needsPartials = true;
        break;
      }
    } catch (e) {
      // Skip if file can't be read
    }
  }
  
  // Track which partials have broken links (for synced files to inherit the note)
  const partialsWithBrokenLinks = new Map();
  
  // Transform partial files if needed (partials are now in docs/services/reference/_partials)
  // Import paths in files will be transformed to point to the downloaded partials location
  const partialsPath = path.resolve(process.cwd(), "docs/services/reference/_partials");
  if (needsPartials && fs.existsSync(partialsPath)) {
    const stat = fs.statSync(partialsPath);
    if (stat.isDirectory()) {
      // Transform partial files to fix links and remove problematic imports
      // Track which partials have broken links
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
            const result = transformImportPaths(itemPath, destDir, null, false, partialsWithBrokenLinks, config.link_replacements);
            // Store in map for other files to check
            const normalizedPath = itemPath.replace(/\\/g, "/");
            partialsWithBrokenLinks.set(normalizedPath, result.hasBrokenLinks);
          }
        }
      }
      transformPartialFiles(partialsPath);
      console.log(`[config-driven-sync] Processed partials from: ${path.relative(process.cwd(), partialsPath)}`);
    }
  }
  
  // Process files that already exist in destination (downloaded by remote-content)
  // Apply transformations: links, images, components
  const allBrokenLinks = [];
  const allImageFixes = [];
  const allComponentFixes = [];
  
  for (const filePath of filesToProcess) {
    const result = transformImportPaths(filePath, destDir, null, true, partialsWithBrokenLinks, config.link_replacements);
    allBrokenLinks.push(...result.brokenLinks);
    allImageFixes.push(...result.imageFixes);
    allComponentFixes.push(...result.componentFixes);
  }
  
  if (filesToProcess.length > 0) {
    console.log(`[config-driven-sync] Processed ${filesToProcess.length} file(s) in ${destDir}`);
  }
  
  return {
    brokenLinks: allBrokenLinks,
    imageFixes: allImageFixes,
    componentFixes: allComponentFixes,
  };
}

module.exports = {
  resolveSourcePath,
  shouldIncludeFile,
  syncFiles,
};


