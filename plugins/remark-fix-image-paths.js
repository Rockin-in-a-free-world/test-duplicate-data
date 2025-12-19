/**
 * Remark plugin to fix image paths in markdown
 * Converts ../images/... to /img/... (Docusaurus serves static files from root)
 * 
 * This is a CommonJS version that uses string replacement instead of AST traversal
 * to avoid ES module compatibility issues with unist-util-visit
 */
function remarkFixImagePaths() {
  return (tree, file) => {
    // Use a simple approach: traverse the tree manually
    // Since we can't use unist-util-visit (ES module), we'll do a simple recursive traversal
    function traverse(node) {
      if (!node || typeof node !== 'object') return;
      
      // Handle image nodes
      if (node.type === 'image' && node.url) {
        if (node.url.includes('../images/') || node.url.includes('./images/')) {
          const imagePath = node.url.replace(/^(\.\.\/|\.\/)+images\//, '');
          const filename = imagePath.split('/').pop();
          node.url = `/img/${filename}`;
        }
      }
      
      // Handle HTML nodes (for JSX img tags with require())
      if (node.type === 'html' && node.value) {
        let modified = false;
        let newValue = node.value;
        
        // Match src={require("../images/file.png").default} or src={require('../../images/file.png').default}
        newValue = newValue.replace(
          /src=\{require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
          (match, dots, imagePath) => {
            modified = true;
            const filename = imagePath.split('/').pop();
            return `src="/img/${filename}"`;
          }
        );
        
        // Also match single ../images/ pattern
        newValue = newValue.replace(
          /src=\{require\(["']\.\.\/images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
          (match, imagePath) => {
            modified = true;
            const filename = imagePath.split('/').pop();
            return `src="/img/${filename}"`;
          }
        );
        
        if (modified) {
          node.value = newValue;
        }
      }
      
      // Handle JSX nodes (mdxJsxFlowElement or mdxJsxTextElement) - this is how MDX parses JSX
      if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'img') {
        if (Array.isArray(node.attributes)) {
          node.attributes.forEach(attr => {
            if (attr.name === 'src' && attr.value) {
              // The value might be an object with type 'mdxJsxExpressionAttribute'
              // or it might be a string representation
              let valueStr = '';
              if (typeof attr.value === 'string') {
                valueStr = attr.value;
              } else if (attr.value && attr.value.type === 'mdxJsxExpressionAttribute') {
                // For JSX expressions, we need to check the value differently
                // The actual require() might be in a child node
                return; // Skip for now, handle in HTML node processing
              } else if (attr.value && attr.value.value) {
                valueStr = String(attr.value.value);
              }
              
              if (valueStr.includes('require') && valueStr.includes('../images/')) {
                const match = valueStr.match(/require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/);
                if (match) {
                  const filename = match[2].split('/').pop();
                  attr.value = `/img/${filename}`;
                }
              }
            }
          });
        }
      }
      
      // Recursively traverse children
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
      
      // Also check other common properties that might contain nodes
      for (const key in node) {
        if (key !== 'children' && Array.isArray(node[key])) {
          node[key].forEach(traverse);
        }
      }
    }
    
    traverse(tree);
  };
}

module.exports = remarkFixImagePaths;

