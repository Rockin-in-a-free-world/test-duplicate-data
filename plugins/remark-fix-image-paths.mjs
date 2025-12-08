import { visit } from 'unist-util-visit';

/**
 * Remark plugin to fix image paths in markdown
 * Converts ../images/... to /img/... (Docusaurus serves static files from root)
 */
export default function remarkFixImagePaths() {
  return (tree) => {
    visit(tree, ['image', 'html'], (node) => {
      if (node.type === 'image') {
        // Handle markdown image syntax: ![alt](../../images/file.png)
        if (node.url && (node.url.includes('../images/') || node.url.includes('./images/'))) {
          // Handle both ../images/ and ./images/ patterns
          const imagePath = node.url.replace(/^(\.\.\/|\.\/)+images\//, '');
          // Extract just the filename to avoid path issues
          const filename = imagePath.split('/').pop();
          // Update URL to use Docusaurus static path (served from root)
          node.url = `/img/${filename}`;
        }
      } else if (node.type === 'html') {
        // Handle require() statements and src={require(...)} patterns
        // Convert to simple /img/ path since Docusaurus serves static files from root
        // Only match relative paths starting with ../ or ./ to avoid matching absolute paths
        if (node.value) {
          node.value = node.value
            .replace(
              /require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)/g,
              (match, dots, imagePath) => {
                // For standalone require(), convert to /img/ path
                // Extract just the filename (no path separators)
                const filename = imagePath.split('/').pop();
                return `'/img/${filename}'`;
              }
            )
            .replace(
              /src=\{require\(["'](\.\.\/)+images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
              (match, dots, imagePath) => {
                // For JSX src attributes, use simple /img/ path
                // Extract just the filename (no path separators)
                const filename = imagePath.split('/').pop();
                return `src="/img/${filename}"`;
              }
            )
            .replace(
              /src=\{require\(["']\.\.\/images\/([^"']+\.(png|jpg|jpeg|gif|svg|webp))["']\)\.default\}/g,
              (match, imagePath) => {
                // Handle single ../images/ pattern
                const filename = imagePath.split('/').pop();
                return `src="/img/${filename}"`;
              }
            );
        }
      }
    });
  };
}

