/**
 * Component Processor Module
 * Handles component import fixes and usage commenting
 */

/**
 * Fix component imports by commenting them out and tracking for maintainers
 */
function processComponents(content, filePath) {
  let modified = false;
  const removedComponents = new Set();
  const removedConstants = new Set();
  const componentFixes = [];
  
  // First, remove any existing commented imports that might cause MDX parsing issues
  // Remove // import ... lines entirely (they cause MDX parsing errors with backslashes)
  content = content.replace(/^\/\/\s*import\s+.*?@site\/src\/(?:components|plugins)\/.*?$/gm, '');
  
  // Remove JSX block comments that cause MDX parsing errors
  // These comments in the top-level ESM context cause "BlockStatement" errors
  // Remove both valid JSX comments {/* */} and invalid ones with backslashes {/\* \*/}
  // Pattern: {/\* ... \*/} where \ is literal backslash
  content = content.replace(/\{\/\\\*[\s\S]*?\\\*\/\}/g, '');
  // Also remove valid JSX comments {/* */}
  content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  
  // Match @site/src/components imports (including nested paths like CreditCost/CreditCostPrice.js)
  // Match complete import statements with flexible line boundaries
  content = content.replace(/(^|\n)(import\s+(\w+)\s+from\s+["']@site\/src\/components\/([^"']+)["']\s*;?\s*)(\n|$)/gm, (match, before, importStmt, componentName, componentPath, after) => {
    modified = true;
    removedComponents.add(componentName);
    componentFixes.push({ type: 'component', name: componentName, path: componentPath, import: importStmt.trim() });
    // Return just the newline characters to preserve line structure
    return before + after;
  });
  
  // Match @site/src/plugins imports (like NETWORK_NAMES) - named imports
  const pluginImportRegex = /(^|\n)import\s+{([^}]+)}\s+from\s+["']@site\/src\/plugins\/([^"']+)["']\s*;?\s*($|\n)/gm;
  
  content = content.replace(pluginImportRegex, (match, before, imports, pluginPath, after) => {
    modified = true;
    const constants = imports.split(',').map(i => i.trim());
    constants.forEach(constName => {
      removedConstants.add(constName);
      componentFixes.push({ type: 'plugin', name: constName, path: pluginPath, import: match.trim() });
    });
    return before + after;
  });
  
  // Match default imports from plugins
  const pluginDefaultImportRegex = /(^|\n)import\s+(\w+)\s+from\s+["']@site\/src\/plugins\/([^"']+)["']\s*;?\s*($|\n)/gm;
  
  content = content.replace(pluginDefaultImportRegex, (match, before, importName, pluginPath, after) => {
    modified = true;
    removedConstants.add(importName);
    componentFixes.push({ type: 'plugin', name: importName, path: pluginPath, import: match.trim() });
    return before + after;
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
    const openCloseRegex = new RegExp(`<${componentName}(?:[^>]*?)>([\\s\\S]*?)</${componentName}>`, 'g');
    if (openCloseRegex.test(content)) {
      content = content.replace(openCloseRegex, (match, innerContent) => {
        modified = true;
        return `{/* ${match} - Component not available */}`;
      });
    }
  });
  
  // Comment out usage of removed constants
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

module.exports = {
  processComponents,
};

