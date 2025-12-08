/**
 * Remark plugin to replace specific link patterns
 * Replaces dashboard links with placeholder
 * 
 * CommonJS version using manual tree traversal
 */
function remarkReplaceLinkPatterns() {
  return (tree) => {
    function traverse(node) {
      if (!node || typeof node !== 'object') return;
      
      if (node.type === 'link' && node.url && node.url.startsWith('/developer-tools/dashboard')) {
        node.url = 'dashboard/dashboard-placeholder.md';
      }
      
      // Recursively traverse children
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
      
      for (const key in node) {
        if (key !== 'children' && Array.isArray(node[key])) {
          node[key].forEach(traverse);
        }
      }
    }
    
    traverse(tree);
  };
}

module.exports = remarkReplaceLinkPatterns;
