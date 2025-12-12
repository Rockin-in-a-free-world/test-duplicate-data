// plugins/remark-link-rewriter.js
/**
 * Remark plugin to rewrite links based on YAML configuration
 * Uses manual tree traversal to avoid ES module compatibility issues
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

function loadLinkReplacements() {
  // Look for link-replacements.yaml in _maintainers/ first, then root
  const maintainersConfigPath = path.join(process.cwd(), "_maintainers", "link-replacements.yaml");
  const rootConfigPath = path.join(process.cwd(), "link-replacements.yaml");
  const configPath = fs.existsSync(maintainersConfigPath) ? maintainersConfigPath : rootConfigPath;

  if (!fs.existsSync(configPath)) {
    console.warn(`[remark-link-rewriter] No link-replacements.yaml found at ${configPath}`);
    return { replacements: new Map(), patterns: [] };
  }

  const content = fs.readFileSync(configPath, "utf8");
  const config = yaml.load(content) || {};

  // Exact replacements: { "/old/path": "https://new/url" }
  const replacements = new Map();
  if (config.replacements && typeof config.replacements === "object") {
    for (const [from, to] of Object.entries(config.replacements)) {
      replacements.set(from, to);
    }
  }

  // Pattern-based replacements: [{ pattern, replacement, description, extractPath }]
  const patterns = [];
  if (Array.isArray(config.patterns)) {
    for (const p of config.patterns) {
      if (!p.pattern || !p.replacement) continue;

      let regexPattern = p.pattern;
      let originalPattern = p.pattern; // Store original pattern for path extraction

      // If pattern has no '*' and no regex chars (except .+) → treat as prefix
      // Special handling for '.+' to not escape it
      if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+')) {
        regexPattern =
          regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
      } else {
        // Escape regex chars except '*' and '.+' and turn '*' into '.*'
        regexPattern = regexPattern
          .replace(/[?^${}()|[\]\\]/g, "\\$&") // Escape all except . + *
          .replace(/\*/g, ".*") // Convert * to .*
          .replace(/\.\+/g, ".+"); // Ensure .+ remains .+
      }

      regexPattern = "^" + regexPattern; // anchor at start

      patterns.push({
        originalPattern: originalPattern, // Store original pattern
        regex: new RegExp(regexPattern),
        replacement: p.replacement,
        extractPath: p.extractPath === true,
        description: p.description || "",
      });
    }
  }

  return { replacements, patterns };
}

function remarkLinkRewriter() {
  const { replacements, patterns } = loadLinkReplacements();

  // Early return if no replacements configured
  if (replacements.size === 0 && patterns.length === 0) {
    return (tree) => {
      // No-op: don't modify tree at all
    };
  }

  return (tree) => {
    function traverse(node) {
      if (!node || typeof node !== 'object' || !node.type) return;
      
      // Skip code blocks, inline code, and MDX-specific nodes - they contain literal code/content
      // that shouldn't be processed and could break MDX compilation if modified
      // Also skip HTML nodes to avoid corrupting JSX/HTML structures
      if (
        node.type === 'code' || 
        node.type === 'inlineCode' ||
        node.type === 'mdxjsEsm' ||
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement' ||
        node.type === 'mdxjsExpression' ||
        node.type === 'html'
      ) {
        return;
      }
      
      // Handle link nodes - only modify the URL property, nothing else
      // Be very defensive: only process if it's actually a link node with a string URL
      if (node.type === 'link' && node.url && typeof node.url === 'string') {
        const originalUrl = String(node.url); // Ensure it's a string

        // Skip absolute URLs and anchors
        if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#"))) {
          let newUrl = originalUrl;
          
          // 1. Pattern-based replacements (applied first as per YAML comment)
          for (const pattern of patterns) {
            const match = originalUrl.match(pattern.regex);
            if (match) {
              newUrl = pattern.replacement;
              if (pattern.extractPath) {
                // Extract the part of the URL after the original pattern
                // Example: url = /developer-tools/dashboard/foo/bar, originalPattern = /developer-tools/dashboard/.+
                // We want /foo/bar
                const patternBase = pattern.originalPattern.replace(/\.\+$/, ''); // Remove the '.+' from the end
                const extractedPath = originalUrl.substring(patternBase.length);
                newUrl = `${pattern.replacement}${extractedPath}`;
              }
              break; // Stop checking patterns once one matches
            }
          }

          // 2. Exact replacements (normalized variants) - only if not already replaced by pattern
          if (newUrl === originalUrl) {
            const normalizedWithSlash = originalUrl.startsWith("/") ? originalUrl : "/" + originalUrl;
            const withoutSlash = originalUrl.replace(/^\//, "");

            const exact =
              replacements.get(originalUrl) ||
              replacements.get(normalizedWithSlash) ||
              replacements.get(withoutSlash);

            if (exact) {
              newUrl = exact;
            }
          }
          
          // Only modify if URL actually changed
          if (newUrl !== originalUrl) {
            node.url = newUrl;
          }
        }
      }
      
      // Recursively traverse children - only standard markdown children array
      // Don't traverse into other properties to avoid corrupting MDX structures
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }
    
    traverse(tree);
  };
}

module.exports = remarkLinkRewriter;

