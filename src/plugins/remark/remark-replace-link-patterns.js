/**
 * Remark plugin to replace link patterns based on YAML configuration
 * Reads from _maintainers/link-replacements.yaml
 * 
 * CommonJS version using manual tree traversal
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
    return { patterns: [] };
  }

  const content = fs.readFileSync(configPath, "utf8");
  const config = yaml.load(content) || {};

  return {
    patterns: config.patterns || [],
  };
}

function remarkReplaceLinkPatterns() {
  const { patterns } = loadLinkReplacements();
  
  return (tree) => {
    if (!patterns || patterns.length === 0) {
      return;
    }
    
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
        const originalUrl = String(node.url);
        
        // Skip absolute URLs and anchors
        if (!(/^(https?|mailto):/.test(originalUrl) || originalUrl.startsWith("#"))) {
          for (const patternConfig of patterns) {
            const { pattern, replacement, extractPath } = patternConfig;
            
            // Convert pattern to regex (similar to remark-link-rewriter)
            let regexPattern = pattern;
            if (!regexPattern.includes("*") && !/[?^${}()|[\]\\]/.test(regexPattern) && !regexPattern.endsWith('.+')) {
              regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + ".*";
            } else {
              regexPattern = regexPattern
                .replace(/[?^${}()|[\]\\]/g, "\\$&")
                .replace(/\*/g, ".*")
                .replace(/\.\+/g, ".+");
            }
            regexPattern = "^" + regexPattern;
            
            const regex = new RegExp(regexPattern);
            const match = originalUrl.match(regex);
            if (match) {
              let newUrl = replacement;
              if (extractPath) {
                // Extract the path after the pattern
                const patternBase = pattern.replace(/\.\+$/, '');
                const extractedPath = originalUrl.substring(patternBase.length);
                newUrl = `${replacement}${extractedPath}`;
              }
              
              // Only modify if URL actually changed
              if (newUrl !== originalUrl) {
                node.url = newUrl;
              }
              break; // Only apply first matching pattern
            }
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

module.exports = remarkReplaceLinkPatterns;
