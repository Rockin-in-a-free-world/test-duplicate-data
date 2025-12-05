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
  
  // Resolve relative path from base directory
  let resolvedPath;
  try {
    resolvedPath = path.resolve(baseDir, relativePath);
  } catch (e) {
    return false;
  }
  
  // Check if file exists
  if (fs.existsSync(resolvedPath)) {
    return true;
  }
  
  // Also check with .md and .mdx extensions if no extension provided
  if (!path.extname(resolvedPath)) {
    return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
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
 * Remove broken internal links (keep text, remove link)
 */
function removeBrokenLinks(content, filePath) {
  const baseDir = path.dirname(filePath);
  const docsRoot = path.join(__dirname, "..", "docs");
  
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
    
    // Check if it's a broken internal link
    const targetExists = fileExists(linkPath, baseDir) || 
                        fileExists(linkPath, docsRoot);
    
    if (!targetExists) {
      brokenLinks.push({ file: path.relative(docsRoot, filePath), link: linkPath, text: linkText });
      modified = true;
      // Remove link, keep text
      return linkText;
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
    const { content: fixedContent, modified: linksModified, brokenLinks } = removeBrokenLinks(content, filePath);
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
  
  // Step 3: Clean up old files
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

