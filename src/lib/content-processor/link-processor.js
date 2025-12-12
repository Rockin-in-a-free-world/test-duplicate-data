/**
 * Link Processor Module
 * Handles broken link detection and removal using remark plugins
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { remark } = require("remark");
const remarkLinkRewriter = require("../../plugins/remark/remark-link-rewriter");
const remarkReplaceLinkPatterns = require("../../plugins/remark/remark-replace-link-patterns");

/**
 * Load link replacements from YAML config (used by both regex and remark)
 */
function loadLinkReplacements() {
  const maintainersConfigPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml");
  const rootConfigPath = path.join(process.cwd(), "link-replacements.yaml");
  const configPath = fs.existsSync(maintainersConfigPath) ? maintainersConfigPath : rootConfigPath;

  if (!fs.existsSync(configPath)) {
    return { replacements: new Map(), patterns: [] };
  }

  const content = fs.readFileSync(configPath, "utf8");
  const config = yaml.load(content) || {};

  const replacements = new Map();
  if (config.replacements && typeof config.replacements === "object") {
    for (const [from, to] of Object.entries(config.replacements)) {
      replacements.set(from, to);
    }
  }

  const patterns = [];
  if (Array.isArray(config.patterns)) {
    for (const p of config.patterns) {
      if (!p.pattern || !p.replacement) continue;

      let regexPattern = p.pattern;
      let originalPattern = p.pattern;

      if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+')) {
        regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
      } else {
        regexPattern = regexPattern
          .replace(/[?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\.\+/g, ".+");
      }

      regexPattern = "^" + regexPattern;

      patterns.push({
        originalPattern: originalPattern,
        regex: new RegExp(regexPattern),
        replacement: p.replacement,
        extractPath: p.extractPath === true,
      });
    }
  }

  return { replacements, patterns };
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
 * Try to fix a broken link by finding the correct path
 */
function tryFixLink(linkPath, baseDir, docsRoot) {
  const linkWithoutAnchor = linkPath.split('#')[0];
  const anchor = linkPath.includes('#') ? '#' + linkPath.split('#').slice(1).join('#') : '';
  
  // Common broken link patterns to fix
  if (linkWithoutAnchor.match(/^\.\.\/\.\.\/ethereum\/concepts\/(.+)$/)) {
    const fixedPath = '/services/concepts/' + linkWithoutAnchor.replace(/^\.\.\/\.\.\/ethereum\/concepts\//, '') + anchor;
    if (fileExists(fixedPath, docsRoot, docsRoot)) {
      return fixedPath;
    }
  }
  
  if (linkWithoutAnchor.match(/^\.\.\/ethereum\/concepts\/(.+)$/)) {
    const fixedPath = '/services/concepts/' + linkWithoutAnchor.replace(/^\.\.\/ethereum\/concepts\//, '') + anchor;
    if (fileExists(fixedPath, docsRoot, docsRoot)) {
      return fixedPath;
    }
  }
  
  return null;
}

/**
 * Apply link replacements using regex (safe for both .md and .mdx files)
 * This avoids corrupting JSX expressions in MDX files
 */
function applyLinkReplacementsRegex(content, replacements, patterns) {
  if (replacements.size === 0 && patterns.length === 0) {
    return content;
  }
  
  // Process markdown links only (not JSX/HTML) - regex is safe and doesn't parse AST
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, linkPath) => {
    // Skip external URLs and anchors
    if (/^(https?|mailto):/.test(linkPath) || linkPath.startsWith('#')) {
      return match;
    }
    
    let newUrl = linkPath;
    
    // Apply pattern-based replacements first
    for (const pattern of patterns) {
      const patternMatch = linkPath.match(pattern.regex);
      if (patternMatch) {
        newUrl = pattern.replacement;
        if (pattern.extractPath) {
          const patternBase = pattern.originalPattern.replace(/\.\+$/, '');
          const extractedPath = linkPath.substring(patternBase.length);
          newUrl = `${pattern.replacement}${extractedPath}`;
        }
        break;
      }
    }
    
    // Apply exact replacements if not already replaced by pattern
    if (newUrl === linkPath) {
      const normalizedWithSlash = linkPath.startsWith("/") ? linkPath : "/" + linkPath;
      const withoutSlash = linkPath.replace(/^\//, "");
      const exact = replacements.get(linkPath) || replacements.get(normalizedWithSlash) || replacements.get(withoutSlash);
      if (exact) {
        newUrl = exact;
      }
    }
    
    return newUrl !== linkPath ? `[${linkText}](${newUrl})` : match;
  });
}

/**
 * Process links in content using regex for replacements, then detect broken links
 */
async function processLinks(content, filePath, partialImportMap, docsPath) {
  const baseDir = path.dirname(filePath);
  const normalizedFilePath = path.normalize(filePath);
  
  // Check if this is a partial file
  const isPartial = filePath.includes(path.join("reference", "_partials"));
  const importingFiles = isPartial ? (partialImportMap.get(normalizedFilePath) || []) : [];
  
  // Apply link replacements using regex (safe for both .md and .mdx, avoids JSX corruption)
  const { replacements, patterns } = loadLinkReplacements();
  content = applyLinkReplacementsRegex(content, replacements, patterns);
  
  // Then detect and remove broken links
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
      // Try to fix the link
      let fixedPath = tryFixLink(linkPath, baseDir, docsPath);
      
      if (!fixedPath && isPartial && importingFiles.length > 0) {
        for (const importingFile of importingFiles) {
          const importingDir = path.dirname(importingFile);
          fixedPath = tryFixLink(linkPath, importingDir, docsPath);
          if (fixedPath) break;
        }
      }
      
      if (fixedPath && fileExists(fixedPath, docsPath, docsPath)) {
        modified = true;
        return `[${linkText}](${fixedPath})`;
      } else {
        // Remove link but keep text
        const relativeFilePath = path.relative(docsPath, filePath);
        brokenLinks.push({ file: relativeFilePath, link: linkPath, text: linkText });
        modified = true;
        return linkText;
      }
    }
    
    return match;
  });
  
  return { content, modified, brokenLinks };
}

module.exports = {
  processLinks,
  fileExists,
};

