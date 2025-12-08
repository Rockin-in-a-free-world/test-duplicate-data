import { visit } from 'unist-util-visit';

/**
 * Remark plugin to replace specific link patterns
 * Replaces dashboard links with placeholder
 */
export default function remarkReplaceLinkPatterns() {
  return (tree) => {
    visit(tree, 'link', (node) => {
      if (node.url && node.url.startsWith('/developer-tools/dashboard')) {
        node.url = 'dashboard/dashboard-placeholder.md';
      }
    });
  };
}

