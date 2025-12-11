/**
 * File Processor Utility
 * 
 * Automatically processes all downloaded files to:
 * - Fix broken internal links (remove links that don't exist)
 * - Fix image paths
 * - Remove/comment out missing component imports
 * - Apply link_replacements from config (pattern replacements)
 */

const fs = require("fs");
const path = require("path");

// Directories where remote content is downloaded
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
      
      // Skip config files and hidden files
      if (entry.name === "_config.yml" || entry.name.startsWith("_") && entry.name !== "_partials") {
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
 * Check if a file exists relative to a base directory
 */
function fileExists(relativePath, baseDir, docsRoot) {
  // Skip external URLs
  if (/^(https?|mailto):/.test(relativePath)) {
    return true;
  }
  
  // Skip anchor links
  if (relativePath.startsWith('#')) {
    return true;
  }
  
  // Strip anchor/hash from path
  const pathWithoutAnchor = relativePath.split('#')[0];
  
  // Handle absolute paths starting with /service/ or /services/ (web paths)
  if (pathWithoutAnchor.startsWith('/service/') || pathWithoutAnchor.startsWith('/services/')) {
    // Convert /service/... or /services/... to services/... (root level)
    const pathToCheck = pathWithoutAnchor.replace(/^\/services?\//, 'services/');
    const resolvedPath = path.resolve(docsRoot, pathToCheck);
    if (fs.existsSync(resolvedPath)) {
      return true;
    }
    if (!path.extname(resolvedPath)) {
      return fs.existsSync(resolvedPath + '.md') || fs.existsSync(resolvedPath + '.mdx');
    }
    return false;
  }
  
  // Resolve relative path from base directory
  let resolvedPath;
  try {
    resolvedPath = path.resolve(baseDir, pathWithoutAnchor);
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
    if (pathWithoutAnchor.startsWith('../')) {
      const filename = path.basename(pathWithoutAnchor);
      const sameDirPath = path.join(baseDir, filename);
      if (fs.existsSync(sameDirPath + '.md') || fs.existsSync(sameDirPath + '.mdx')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Build a map of partial files to the files that import them
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
    const importRegex = /import\s+\w+\s+from\s+["']([^"']*_partials[^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let partialPath;
      
      // Handle absolute paths
      if (importPath.startsWith('/service/reference/_partials/')) {
        const relativePath = importPath.replace('/service/reference/_partials/', '');
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
 * Fix or remove broken internal links
 */
function removeBrokenLinks(content, filePath, partialImportMap, linkReplacements, docsPath) {
  const baseDir = path.dirname(filePath);
  const normalizedFilePath = path.normalize(filePath);
  
  // Check if this is a partial file
  const isPartial = filePath.includes(path.join("reference", "_partials"));
  const importingFiles = isPartial ? (partialImportMap.get(normalizedFilePath) || []) : [];
  
  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let modified = false;
  const brokenLinks = [];
  
  content = content.replace(linkRegex, (match, linkText, linkPath) => {
    // Skip external links
    if (/^(https?|mailto|#):/.test(linkPath)) {
      return match;
    }
    
    // Skip anchor links
    if (linkPath.startsWith('#')) {
      return match;
    }
    
    // Apply link replacements first (pattern replacements from config)
    for (const [brokenPath, httpsUrl] of Object.entries(linkReplacements)) {
      if (linkPath.startsWith(brokenPath) || linkPath === brokenPath) {
        modified = true;
        return `[${linkText}](${httpsUrl})`;
      }
    }
    
    let targetExists = false;
    
    // For partial files, check from multiple contexts
    if (isPartial) {
      const worksFromPartial = fileExists(linkPath, baseDir, docsPath);
      
      if (worksFromPartial) {
        targetExists = true;
      } else if (importingFiles.length > 0) {
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          if (fileExists(linkPath, importingDir, docsPath)) {
            targetExists = true;
            break;
          }
        }
      } else {
        targetExists = worksFromPartial;
      }
    } else {
      targetExists = fileExists(linkPath, baseDir, docsPath);
    }
    
    if (!targetExists) {
      // Remove link but keep text
      const relativeFilePath = path.relative(docsPath, filePath);
      brokenLinks.push({ file: relativeFilePath, link: linkPath, text: linkText });
      modified = true;
      return linkText;
    }
    
    return match;
  });
  
  return { content, modified, brokenLinks };
}

/**
 * Fix partial import paths
 * Converts absolute paths like /services/reference/_partials/... to relative paths
 */
function fixPartialImports(content, filePath, docsPath) {
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

/**
 * Fix image paths
 */
function fixImagePaths(content, filePath) {
  let modified = false;
  const imageFixes = [];
  
  // Match require() statements for images
  content = content.replace(
    /require\(["'](\.\.\/)+images\/([^"']+)["']\)/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `require('@site/static/img/${imagePath}')`, image: imagePath });
      return `require('@site/static/img/${imagePath}')`;
    }
  );
  
  // Match src={require(...)} patterns
  content = content.replace(
    /src=\{require\(["'](\.\.\/)+images\/([^"']+)["']\)\.default\}/g,
    (match, dots, imagePath) => {
      modified = true;
      imageFixes.push({ original: match, new: `src={require('@site/static/img/${imagePath}').default}`, image: imagePath });
      return `src={require('@site/static/img/${imagePath}').default}`;
    }
  );
  
  // Handle markdown image syntax
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
  
  // Match @site/src/components imports (including nested paths and .js extensions)
  // Examples: @site/src/components/CreditCost/CreditCostPrice.js
  //           @site/src/components/CardList
  const componentImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["'];?\s*$/gm;
  
  content = content.replace(componentImportRegex, (match, componentName, componentPath) => {
    modified = true;
    removedComponents.add(componentName);
    componentFixes.push({ type: 'component', name: componentName, path: componentPath, import: match.trim() });
    // Comment out the entire import line, preserving it for maintainers
    return `// ${match.trim()} // Component not available in this project`;
  });
  
  // Match @site/src/plugins imports
  const pluginImportRegex = /^import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginImportRegex, (match, imports, pluginPath) => {
    modified = true;
    const constants = imports.split(',').map(i => i.trim());
    constants.forEach(constName => {
      removedConstants.add(constName);
      componentFixes.push({ type: 'plugin', name: constName, path: pluginPath, import: match });
    });
    return `// ${match} // Plugin not available in this project`;
  });
  
  // Match default imports from plugins
  const pluginDefaultImportRegex = /^import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["'];?$/gm;
  
  content = content.replace(pluginDefaultImportRegex, (match, importName, pluginPath) => {
    modified = true;
    removedConstants.add(importName);
    componentFixes.push({ type: 'plugin', name: importName, path: pluginPath, import: match });
    return `// ${match} // Plugin not available in this project`;
  });
  
  // Comment out usage of these components (preserve for maintainers but hide from rendering)
  removedComponents.forEach(componentName => {
    // Match self-closing tags: <ComponentName ... />
    const selfClosingRegex = new RegExp(`<${componentName}(?:[^>]*?)\\s*/>`, 'g');
    if (selfClosingRegex.test(content)) {
      content = content.replace(selfClosingRegex, (match) => {
        modified = true;
        // Comment out the entire component usage, preserving it for maintainers
        return `{/* ${match} - Component not available */}`;
      });
    }
    
    // Match opening/closing tags: <ComponentName>...</ComponentName>
    // This handles multi-line component usage
    const openCloseRegex = new RegExp(`<${componentName}(?:[^>]*?)>([\\s\\S]*?)</${componentName}>`, 'g');
    if (openCloseRegex.test(content)) {
      content = content.replace(openCloseRegex, (match, innerContent) => {
        modified = true;
        // Comment out the entire component usage, preserving it for maintainers
        return `{/* ${match} - Component not available */}`;
      });
    }
  });
  
  // Remove usage of removed constants
  removedConstants.forEach(constName => {
    const constantUsageRegex = new RegExp(`\\b${constName}\\.[\\w]+`, 'g');
    if (constantUsageRegex.test(content)) {
      content = content.replace(constantUsageRegex, (match) => {
        modified = true;
        return `/* ${match} - Constant not available */`;
      });
    }
  });
  
  return { content, modified, componentFixes };
}

/**
 * Process all downloaded files
 */
function processAllFiles(docsPath, linkReplacements) {
  console.log(`[file-processor] Scanning for downloaded files...`);
  
  const files = getAllMarkdownFiles(docsPath);
  console.log(`[file-processor] Found ${files.length} file(s) to process`);
  
  if (files.length === 0) {
    return {
      brokenLinks: [],
      imageFixes: [],
      componentFixes: [],
    };
  }
  
  // Build map of partial files to their importing files
  const partialImportMap = buildPartialImportMap(files, docsPath);
  if (partialImportMap.size > 0) {
    console.log(`[file-processor] Found ${partialImportMap.size} partial file(s) with imports`);
  }
  
  const allBrokenLinks = [];
  const allImageFixes = [];
  const allComponentFixes = [];
  
  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativeFilePath = path.relative(docsPath, filePath);
    
    // Step 1: Fix partial import paths
    const { content: partialFixed, modified: partialModified } = fixPartialImports(content, filePath, docsPath);
    content = partialFixed;
    
    // Step 2: Fix image paths
    const { content: imageFixed, modified: imageModified, imageFixes } = fixImagePaths(content, filePath);
    content = imageFixed;
    if (imageModified) {
      imageFixes.forEach(fix => {
        allImageFixes.push({
          file: relativeFilePath,
          original: fix.original,
          new: fix.new,
          image: fix.image
        });
      });
    }
    
    // Step 3: Fix component imports
    const { content: componentFixed, modified: componentModified, componentFixes } = fixComponentImports(content, filePath);
    content = componentFixed;
    if (componentModified) {
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
    
    // Step 4: Remove broken internal links
    const { content: fixedContent, modified: linksModified, brokenLinks } = removeBrokenLinks(content, filePath, partialImportMap, linkReplacements, docsPath);
    content = fixedContent;
    
    if (linksModified) {
      allBrokenLinks.push(...brokenLinks);
    }
    
    // Write file if modified
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
  
  return {
    brokenLinks: allBrokenLinks,
    imageFixes: allImageFixes,
    componentFixes: allComponentFixes,
  };
}

module.exports = {
  processAllFiles,
};

