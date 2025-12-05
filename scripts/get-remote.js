#!/usr/bin/env node

/**
 * Custom script to download remote content from MetaMask docs
 * and handle broken links
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const BASE_DIR = path.join(__dirname, "..", "docs", "services");
const DOWNLOAD_DIRS = [
  path.join(BASE_DIR, "reference", "_partials"),
  path.join(BASE_DIR, "reference", "ethereum"),
  path.join(BASE_DIR, "reference", "linea"),
  path.join(BASE_DIR, "reference", "base"),
  path.join(BASE_DIR, "reference", "gas-api"),
  path.join(BASE_DIR, "reference", "ipfs"),
  path.join(BASE_DIR, "concepts"),
  path.join(BASE_DIR, "get-started"),
  path.join(BASE_DIR, "how-to"),
  path.join(BASE_DIR, "tutorials"),
];

// Also check old directories for cleanup
const OLD_API_DIR = path.join(__dirname, "..", "docs", "api");
const OLD_NETWORKS_DIR = path.join(OLD_API_DIR, "networks");

/**
 * Get statistics about downloaded files
 */
function getImportStats() {
  let totalFileCount = 0;
  const files = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
        files.push(fullPath);
        totalFileCount++;
      }
    }
  }
  
  DOWNLOAD_DIRS.forEach(dir => scanDirectory(dir));
  
  return {
    fileCount: totalFileCount,
    files: files.map(f => path.relative(BASE_DIR, f)),
  };
}

/**
 * Download remote content using docusaurus-plugin-remote-content
 */
function downloadRemoteContent() {
  console.log("📥 Downloading remote content from MetaMask docs...");
  try {
    // Download all configured remote content sources
    execSync("npx docusaurus download-remote-metamask-partials", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-ethereum", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-linea", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-base", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-concepts", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-get-started", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-gas-api", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-ipfs", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-how-to", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    execSync("npx docusaurus download-remote-metamask-tutorials", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    
    // Get import statistics
    const stats = getImportStats();
    console.log("\n✅ Remote content downloaded successfully!");
    console.log(`📊 Files imported: ${stats.fileCount}`);
  } catch (error) {
    console.error("❌ Error downloading remote content:", error.message);
    process.exit(1);
  }
}

/**
 * Get all markdown files from downloaded directories
 */
function getAllMarkdownFiles() {
  const files = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
        files.push(fullPath);
      }
    }
  }
  
  DOWNLOAD_DIRS.forEach(dir => scanDirectory(dir));
  
  // Also scan old directories if they exist (for cleanup)
  if (fs.existsSync(OLD_API_DIR)) {
    scanDirectory(OLD_API_DIR);
  }
  
  return files;
}

/**
 * Check if a file exists relative to a base directory
 */
function fileExists(relativePath, baseDir) {
  // Skip external URLs
  if (/^(https?|mailto):/.test(relativePath)) {
    return true; // Consider external links as "existing"
  }
  
  // Skip anchor links
  if (relativePath.startsWith('#')) {
    return true;
  }
  
  // Strip anchor/hash from path (e.g., "file.md#anchor" -> "file.md")
  const pathWithoutAnchor = relativePath.split('#')[0];
  
  // Handle absolute paths starting with /services/ (web paths, not filesystem paths)
  // These need to be resolved relative to the docs directory
  const docsRoot = path.join(__dirname, "..", "docs");
  let pathToCheck = pathWithoutAnchor;
  
  if (pathWithoutAnchor.startsWith('/services/')) {
    // Convert /services/... to docs/services/...
    pathToCheck = pathWithoutAnchor.replace(/^\/services\//, 'services/');
    // Resolve from docs root
    try {
      const resolvedPath = path.resolve(docsRoot, pathToCheck);
      if (fs.existsSync(resolvedPath)) {
        return true;
      }
      // Also check with .md and .mdx extensions if no extension provided
      if (!path.extname(resolvedPath)) {
        return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  // Resolve relative path from base directory
  let resolvedPath;
  try {
    resolvedPath = path.resolve(baseDir, pathToCheck);
  } catch (e) {
    return false;
  }
  
  // Check if file exists
  if (fs.existsSync(resolvedPath)) {
    return true;
  }
  
  // Also check with .md and .mdx extensions if no extension provided
  if (!path.extname(resolvedPath)) {
    if (fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx')) {
      return true;
    }
    
    // If link starts with ../ and doesn't exist, try same directory as fallback
    // (e.g., ../eth_newfilter from filter-methods/ should try filter-methods/eth_newfilter)
    // This handles cases where links are written incorrectly but files exist in same dir
    if (pathToCheck.startsWith('../')) {
      const filename = path.basename(pathToCheck);
      const sameDirPath = path.join(baseDir, filename);
      if (fs.existsSync(sameDirPath + '.md') || fs.existsSync(sameDirPath + '.mdx')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Replace specific link patterns
 */
function replaceLinkPatterns(content) {
  // Replace dashboard links with placeholder
  content = content.replace(
    /\[([^\]]+)\]\(\/developer-tools\/dashboard[^)]*\)/g,
    '[$1](dashboard/dashboard-placeholder.md)'
  );
  
  return content;
}

/**
 * Build a map of partial files to the files that import them
 * This allows us to validate links in partials from the importing file's context
 * 
 * @returns {Map<string, string[]>} Map of partial file path -> array of importing file paths
 */
function buildPartialImportMap() {
  const partialImportMap = new Map();
  const files = getAllMarkdownFiles();
  const docsRoot = path.join(__dirname, "..", "docs");
  const partialsDir = path.join(BASE_DIR, "reference", "_partials");
  
  files.forEach(filePath => {
    // Skip partial files themselves
    if (filePath.includes(path.join("reference", "_partials"))) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Match import statements: import X from "../../_partials/..."
    // or import X from "/services/reference/_partials/..."
    const importRegex = /import\s+\w+\s+from\s+["']([^"']*_partials[^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let partialPath;
      
      // Handle absolute paths
      if (importPath.startsWith('/services/reference/_partials/')) {
        const relativePath = importPath.replace('/services/reference/_partials/', '');
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

/**
 * Try to fix a broken link by finding the correct path
 * Returns the fixed path if found, null otherwise
 */
function tryFixLink(linkPath, baseDir, docsRoot) {
  // Strip anchor for checking existence
  const linkWithoutAnchor = linkPath.split('#')[0];
  const anchor = linkPath.includes('#') ? '#' + linkPath.split('#').slice(1).join('#') : '';
  
  // Common broken link patterns to fix
  // Fix: ../../ethereum/concepts/... -> /services/concepts/...
  if (linkWithoutAnchor.match(/^\.\.\/\.\.\/ethereum\/concepts\/(.+)$/)) {
    const fixedPath = '/services/concepts/' + linkWithoutAnchor.replace(/^\.\.\/\.\.\/ethereum\/concepts\//, '') + anchor;
    if (fileExists(fixedPath, docsRoot)) {
      return fixedPath;
    }
  }
  
  // Fix: ../ethereum/concepts/... -> /services/concepts/...
  if (linkWithoutAnchor.match(/^\.\.\/ethereum\/concepts\/(.+)$/)) {
    const fixedPath = '/services/concepts/' + linkWithoutAnchor.replace(/^\.\.\/ethereum\/concepts\//, '') + anchor;
    if (fileExists(fixedPath, docsRoot)) {
      return fixedPath;
    }
  }
  
  return null;
}

/**
 * Fix or remove broken internal links
 * For partial files, validates links from the context of importing files
 * Tries to fix broken links before removing them
 */
function removeBrokenLinks(content, filePath, partialImportMap) {
  const baseDir = path.dirname(filePath);
  const docsRoot = path.join(__dirname, "..", "docs");
  const normalizedFilePath = path.normalize(filePath);
  
  // Check if this is a partial file
  const isPartial = filePath.includes(path.join("reference", "_partials"));
  const importingFiles = isPartial ? (partialImportMap.get(normalizedFilePath) || []) : [];
  
  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let modified = false;
  const brokenLinks = [];
  
  content = content.replace(linkRegex, (match, linkText, linkPath) => {
    // Skip external links (http, https, mailto, etc.)
    if (/^(https?|mailto|#):/.test(linkPath)) {
      return match;
    }
    
    // Skip anchor links (starting with #)
    if (linkPath.startsWith('#')) {
      return match;
    }
    
    let targetExists = false;
    let fixedPath = null;
    
    // For partial files, we need to check from multiple contexts:
    // 1. The partial's own context (where the link might be written relative to)
    // 2. Each importing file's context (where the partial will be rendered)
    // Only mark as broken if it fails in ALL contexts
    if (isPartial) {
      // Check from partial's own context first
      const worksFromPartial = fileExists(linkPath, baseDir) || fileExists(linkPath, docsRoot);
      
      if (worksFromPartial) {
        targetExists = true;
      } else if (importingFiles.length > 0) {
        // Check from each importing file's context
        // Link is valid if it works from at least one importing context
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          if (fileExists(linkPath, importingDir) || fileExists(linkPath, docsRoot)) {
            targetExists = true;
            break; // Link is valid from at least one context
          }
        }
      } else {
        // No importing files found, so just check from partial's context
        targetExists = worksFromPartial;
      }
    } else {
      // For regular files, check from the file's own context
      targetExists = fileExists(linkPath, baseDir) || fileExists(linkPath, docsRoot);
    }
    
    // If link is broken, try to fix it
    if (!targetExists) {
      // Try to fix from the file's own context
      fixedPath = tryFixLink(linkPath, baseDir, docsRoot);
      
      // If still not fixed and it's a partial, try from importing file contexts
      if (!fixedPath && isPartial && importingFiles.length > 0) {
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          fixedPath = tryFixLink(linkPath, importingDir, docsRoot);
          if (fixedPath) break;
        }
      }
      
      if (fixedPath && fileExists(fixedPath, docsRoot)) {
        // Link was fixed, update it
        modified = true;
        return `[${linkText}](${fixedPath})`;
      } else {
        // Couldn't fix, remove link but keep text
        brokenLinks.push({ file: path.relative(docsRoot, filePath), link: linkPath, text: linkText });
        modified = true;
        return linkText;
      }
    }
    
    return match;
  });
  
  return { content, modified, brokenLinks };
}


/**
 * Fix image paths
 * Converts ../images/... or ../../images/... or ../../../images/... to @site/static/img/...
 */
function fixImagePaths(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match require() statements for images with any number of ../ before images/
  // This handles patterns like: require("../images/..."), require("../../images/..."), etc.
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+)["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `require('@site/static/img/${imagePath}')`, image: imagePath });
      return `require('@site/static/img/${imagePath}')`;
    }
  );
  
  // Match src={require(...)} patterns with any number of ../ before images/
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+)["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `src={require('@site/static/img/${imagePath}').default}`, image: imagePath });
      return `src={require('@site/static/img/${imagePath}').default}`;
    }
  );
  
  // Also handle markdown image syntax: ![alt](../../images/file.png)
  content = content.replace(
    /!\[([^\]]*)\]\((\.\.\/)+images\/([^)]+)\)/g,
    (match, alt, dots, imagePath) => {
      modified = true;
      const newPath = `<img src={require('@site/static/img/${imagePath}').default} alt="${alt}" />`;
      imageFixes.push({ original: match, new: newPath, image: imagePath });
      return newPath;
    }
  );
  
  return { content, modified, imageFixes };
}

/**
 * Remove or comment out missing component imports and their usage
 */
function fixComponentImports(content, filePath) {
  let modified = false;
  const removedComponents = new Set();
  const removedConstants = new Set();
  const componentFixes = [];
  
  // Match @site/src/components imports and track component names
  const componentImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?$/gm;
  
  content = content.replace(componentImportRegex, (match, componentName, componentPath) => {
    modified = true;
    removedComponents.add(componentName);
    componentFixes.push({ type: 'component', name: componentName, path: componentPath, import: match });
    // Comment out the import and add a placeholder comment
    return `// ${match} // Component not available in this project`;
  });
  
  // Match @site/src/plugins imports (like NETWORK_NAMES)
  const pluginImportRegex = /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginImportRegex, (match, imports, pluginPath) => {
    modified = true;
    // Extract constant names from the import
    const constants = imports.split(',').map(i => i.trim());
    constants.forEach(constName => {
      removedConstants.add(constName);
      componentFixes.push({ type: 'plugin', name: constName, path: pluginPath, import: match });
    });
    // Comment out the import
    return `// ${match} // Plugin not available in this project`;
  });
  
  // Also match default imports from plugins
  const pluginDefaultImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginDefaultImportRegex, (match, importName, pluginPath) => {
    modified = true;
    removedConstants.add(importName);
    componentFixes.push({ type: 'plugin', name: importName, path: pluginPath, import: match });
    return `// ${match} // Plugin not available in this project`;
  });
  
  // Remove or comment out usage of these components
  // Match JSX usage: <ComponentName ... /> (including multi-line)
  removedComponents.forEach(componentName => {
    // Match self-closing tags (including multi-line attributes)
    const selfClosingRegex = new RegExp(`<${componentName}(?:[\\s\\S]*?)/>`, 'g');
    if (selfClosingRegex.test(content)) {
      content = content.replace(selfClosingRegex, (match) => {
        modified = true;
        // Replace with a comment, preserving the original for reference
        const lines = match.split('\n');
        return `{/* ${lines[0]}... - Component not available */}`;
      });
    }
    
    // Match opening/closing tags (including multi-line)
    const openCloseRegex = new RegExp(`<${componentName}(?:[\\s\\S]*?)>([\\s\\S]*?)</${componentName}>`, 'g');
    if (openCloseRegex.test(content)) {
      content = content.replace(openCloseRegex, (match, innerContent) => {
        modified = true;
        // Replace with a comment
        const lines = match.split('\n');
        return `{/* ${lines[0]}... - Component not available */}`;
      });
    }
  });
  
  // Remove or comment out usage of removed constants
  removedConstants.forEach(constName => {
    // Match usage like: NETWORK_NAMES.linea, NETWORK_NAMES.ethereum, etc.
    const constantUsageRegex = new RegExp(`\\b${constName}\\.[\\w]+`, 'g');
    if (constantUsageRegex.test(content)) {
      content = content.replace(constantUsageRegex, (match) => {
        modified = true;
        return `/* ${match} - Constant not available */`;
      });
    }
    
    // Also match standalone usage (though less common)
    const standaloneRegex = new RegExp(`\\b${constName}\\b`, 'g');
    // Only replace if it's not already in a comment
    content = content.replace(standaloneRegex, (match, offset) => {
      // Check if we're inside a comment
      const before = content.substring(0, offset);
      const lastComment = before.lastIndexOf('//');
      const lastNewline = before.lastIndexOf('\n');
      if (lastComment > lastNewline) {
        return match; // Already in a comment
      }
      modified = true;
      return `/* ${match} - Constant not available */`;
    });
  });
  
  return { content, modified, componentFixes };
}

/**
 * Helper function to fix broken links in downloaded files
 */
function fixBrokenLinks() {
  console.log("🔗 Fixing import paths and broken links...");
  
  const hasAnyDir = DOWNLOAD_DIRS.some(dir => fs.existsSync(dir));
  if (!hasAnyDir) {
    console.log("⚠️  No downloaded content directories found. Skipping fixes.");
    return;
  }

  const files = getAllMarkdownFiles();
  console.log(`   Processing ${files.length} files...`);
  
  // Build map of partial files to their importing files
  console.log(`   Building partial import map...`);
  const partialImportMap = buildPartialImportMap();
  if (partialImportMap.size > 0) {
    console.log(`   Found ${partialImportMap.size} partial file(s) with imports`);
  }
  
  let totalBroken = 0;
  let totalImageFixes = 0;
  let totalComponentFixes = 0;
  const allBrokenLinks = [];
  const allImageFixes = [];
  const allComponentFixes = [];
  const docsRoot = path.join(__dirname, "..", "docs");
  
  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileModified = false;
    const relativeFilePath = path.relative(docsRoot, filePath);
    
    // Step 1: Fix image paths
    const { content: imageFixed, modified: imageModified, imageFixes } = fixImagePaths(content, filePath);
    content = imageFixed;
    if (imageModified) {
      fileModified = true;
      totalImageFixes += imageFixes.length;
      imageFixes.forEach(fix => {
        allImageFixes.push({
          file: relativeFilePath,
          original: fix.original,
          new: fix.new,
          image: fix.image
        });
      });
    }
    
    // Step 2: Fix component imports
    const { content: componentFixed, modified: componentModified, componentFixes } = fixComponentImports(content, filePath);
    content = componentFixed;
    if (componentModified) {
      fileModified = true;
      totalComponentFixes += componentFixes.length;
      componentFixes.forEach(fix => {
        allComponentFixes.push({
          file: relativeFilePath,
          type: fix.type,
          name: fix.name,
          path: fix.path,
          import: fix.import
        });
      });
    }
    
    // Step 3: Replace specific patterns (dashboard links, etc.)
    content = replaceLinkPatterns(content);
    
    // Step 4: Remove broken internal links
    const { content: fixedContent, modified: linksModified, brokenLinks } = removeBrokenLinks(content, filePath, partialImportMap);
    content = fixedContent;
    
    if (linksModified) {
      fileModified = true;
      totalBroken += brokenLinks.length;
      allBrokenLinks.push(...brokenLinks);
    }
    
    if (fileModified || content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
  
  // Write detailed logs to files
  const logsDir = path.join(__dirname, "..", ".maintainer-logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Write image fixes log
  if (allImageFixes.length > 0) {
    const imageLogPath = path.join(logsDir, "image-path-fixes.log");
    const imageLogContent = allImageFixes.map(fix => 
      `File: ${fix.file}\n  Original: ${fix.original}\n  New: ${fix.new}\n  Image: ${fix.image}\n`
    ).join("\n");
    fs.writeFileSync(imageLogPath, `Image Path Fixes (${allImageFixes.length} total)\n${"=".repeat(80)}\n\n${imageLogContent}`);
  }
  
  // Write component fixes log
  if (allComponentFixes.length > 0) {
    const componentLogPath = path.join(logsDir, "component-import-fixes.log");
    const componentLogContent = allComponentFixes.map(fix => 
      `File: ${fix.file}\n  Type: ${fix.type}\n  Name: ${fix.name}\n  Path: ${fix.path}\n  Import: ${fix.import}\n`
    ).join("\n");
    fs.writeFileSync(componentLogPath, `Component Import Fixes (${allComponentFixes.length} total)\n${"=".repeat(80)}\n\n${componentLogContent}`);
  }
  
  // Write broken links log
  if (allBrokenLinks.length > 0) {
    const linksLogPath = path.join(logsDir, "broken-links-removed.log");
    const linksLogContent = allBrokenLinks.map(({ file, link, text }) => 
      `File: ${file}\n  Link Text: ${text}\n  Broken Link: ${link}\n`
    ).join("\n");
    fs.writeFileSync(linksLogPath, `Broken Links Removed (${allBrokenLinks.length} total)\n${"=".repeat(80)}\n\n${linksLogContent}`);
  }
  
  // Report fixes
  if (totalImageFixes > 0) {
    console.log(`   ✅ Fixed ${totalImageFixes} image path(s)`);
    console.log(`      📝 Details written to .maintainer-logs/image-path-fixes.log`);
  }
  if (totalComponentFixes > 0) {
    console.log(`   ⚠️  Commented out ${totalComponentFixes} missing component import(s)`);
    console.log(`      📝 Details written to .maintainer-logs/component-import-fixes.log`);
  }
  if (totalBroken > 0) {
    console.log(`   ⚠️  Found and removed ${totalBroken} broken link(s)`);
    console.log(`      📝 Details written to .maintainer-logs/broken-links-removed.log`);
    // Log first 10 broken links as examples
    const examples = allBrokenLinks.slice(0, 10);
    examples.forEach(({ file, link, text }) => {
      console.log(`      - ${file}: [${text}](${link})`);
    });
    if (allBrokenLinks.length > 10) {
      console.log(`      ... and ${allBrokenLinks.length - 10} more`);
    }
  }
  
  console.log("✅ All fixes completed");
}

/**
 * Convert filename to title case
 * Example: "get-started.md" -> "Get Started"
 * For index files, uses the parent directory name instead
 * Example: "linea/index.md" -> "Linea", "base/index.md" -> "Base"
 * 
 * @param {string} filePath - The full file path
 * @returns {string} Title-cased version of the filename or parent directory
 */
function filenameToTitle(filePath) {
  const filename = path.basename(filePath);
  const nameWithoutExt = path.basename(filePath, path.extname(filePath));
  
  // Handle index files - use parent directory name instead
  if (nameWithoutExt === 'index') {
    const parentDir = path.basename(path.dirname(filePath));
    // Convert parent directory name to title case
    return parentDir
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Split by hyphens, capitalize each word, join with spaces
  return nameWithoutExt
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Add titles and warning metadata to all markdown files
 * 
 * This function processes all downloaded markdown files to:
 * 1. Add titles to files that are missing them (generated from filename)
 * 2. Add a warning metadata field indicating the content is sourced from MetaMask's repo
 * 
 * Titles are generated from filenames by:
 * - Removing the file extension
 * - Splitting on hyphens
 * - Capitalizing each word
 * - Joining with spaces
 * Example: "get-started.md" -> "Get Started"
 * 
 * The warning field alerts users that edits will be lost on next import.
 */
function addTitlesAndMetadata() {
  console.log("📝 Adding titles and metadata to files...");
  
  const files = getAllMarkdownFiles();
  const sourceRepoUrl = "https://github.com/MetaMask/metamask-docs/tree/main/services";
  let titleCount = 0;
  let metadataCount = 0;
  
  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const isMdxFile = filePath.endsWith('.mdx');
    
    // Skip .mdx files entirely - don't add frontmatter or metadata to them
    if (isMdxFile) {
      return; // Skip processing .mdx files
    }
    
    // Only process .md files
    // Check if title already exists
    const hasTitle = content.match(/^title:\s+/m);
    
    // Generate title from filename if missing
    if (!hasTitle) {
      const title = filenameToTitle(filePath);
      
      // Add title to frontmatter
      // Pattern 1: Frontmatter with description
      const frontmatterWithDesc = /^---\n(description:.*?\n)---/m;
      if (frontmatterWithDesc.test(content)) {
        content = content.replace(
          frontmatterWithDesc,
          `---\ntitle: ${title}\ntitle-autogenerated: T\n$1---`
        );
        modified = true;
        titleCount++;
      }
      // Pattern 2: Frontmatter without description (just ---)
      else if (content.startsWith('---\n---\n')) {
        content = content.replace(
          '---\n---\n',
          `---\ntitle: ${title}\ntitle-autogenerated: T\n---\n`
        );
        modified = true;
        titleCount++;
      }
      // Pattern 3: Frontmatter with other fields
      else if (content.startsWith('---\n')) {
        // Insert title after opening ---
        content = content.replace(
          /^(---\n)/,
          `$1title: ${title}\ntitle-autogenerated: T\n`
        );
        modified = true;
        titleCount++;
      }
    }
    
    // Add warning metadata if not present
    // Check if warning field already exists in frontmatter
    const hasWarning = /^warning:\s+/m.test(content);
    if (!hasWarning) {
      // Ensure we have frontmatter
      if (!content.startsWith('---\n')) {
        // Add frontmatter if file doesn't have it
        content = `---\n---\n${content}`;
        modified = true;
      }
      
      // Insert warning after title-autogenerated (if exists), or after title, or at start of frontmatter
      if (content.match(/^title-autogenerated:\s+.*\n/m)) {
        // Insert after title-autogenerated
        content = content.replace(
          /^(title-autogenerated:\s+.*\n)/m,
          `$1warning: This data is sourced from ${sourceRepoUrl} all edits to this page will be lost\n`
        );
      } else if (content.match(/^title:\s+.*\n/m)) {
        // Insert after title if no title-autogenerated
        content = content.replace(
          /^(title:\s+.*\n)/m,
          `$1warning: This data is sourced from ${sourceRepoUrl} all edits to this page will be lost\n`
        );
      } else if (content.startsWith('---\n')) {
        // Insert after opening --- if no title
        content = content.replace(
          /^(---\n)/,
          `$1warning: This data is sourced from ${sourceRepoUrl} all edits to this page will be lost\n`
        );
      }
      modified = true;
      metadataCount++;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
  
  if (titleCount > 0) {
    console.log(`   ✅ Added titles to ${titleCount} file(s)`);
  }
  if (metadataCount > 0) {
    console.log(`   ✅ Added warning metadata to ${metadataCount} file(s)`);
  }
  if (titleCount === 0 && metadataCount === 0) {
    console.log("   ✅ All files already have titles and metadata");
  }
}

/**
 * Clean up old directories if they exist
 */
function cleanupOldDirectories() {
  console.log("🧹 Cleaning up old files...");
  
  let cleaned = false;
  
  if (fs.existsSync(OLD_API_DIR)) {
    console.log(`   Removing old api directory: ${path.relative(path.join(__dirname, ".."), OLD_API_DIR)}`);
    fs.rmSync(OLD_API_DIR, { recursive: true, force: true });
    console.log("   ✅ Old api directory removed");
    cleaned = true;
  }
  
  if (!cleaned) {
    console.log("   ✅ No cleanup needed");
  }
}

/**
 * Main execution
 */
function main() {
  console.log("🚀 Starting get-remote script...\n");
  
  // Step 1: Download remote content
  downloadRemoteContent();
  
  // Step 2: Fix broken links and import paths
  fixBrokenLinks();
  
  // Step 3: Add titles and warning metadata to all files
  addTitlesAndMetadata();
  
  // Step 4: Clean up old files
  cleanupOldDirectories();
  
  console.log("\n✨ get-remote script completed!");
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  downloadRemoteContent,
  fixBrokenLinks,
};

