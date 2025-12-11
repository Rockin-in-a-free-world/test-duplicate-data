---
title: Sync Content from MetaMask Docs
sidebar_position: 1
---

This guide explains how to use the content sync tooling to pull documentation from the MetaMask docs repository into this site.

## Overview

The content sync tooling uses `docusaurus-plugin-remote-content` to fetch content from the MetaMask repository and then processes it using modular processors to fix links, images, and components. All transformations are logged for maintainer review.

## Architecture

The tooling is organized into focused modules:

- **Download Module** (`src/lib/content-processor/download.js`): Handles downloading remote content using `docusaurus-plugin-remote-content` CLI commands
- **File Scanner** (`src/lib/content-processor/file-scanner.js`): Scans directories for markdown files and builds import maps
- **Link Processor** (`src/lib/content-processor/link-processor.js`): Uses remark plugins to rewrite links based on YAML config and removes broken links
- **Image Processor** (`src/lib/content-processor/image-processor.js`): Fixes image paths using remark plugins
- **Component Processor** (`src/lib/content-processor/component-processor.js`): Comments out unavailable component imports and their usage
- **Partial Processor** (`src/lib/content-processor/partial-processor.js`): Fixes partial import paths
- **Reporter** (`src/lib/content-processor/reporter.js`): Writes detailed logs to `_maintainers/logs/`

## Prerequisites

- GitHub Personal Access Token with repository access
- Token should be set in `.env` file as `GITHUB_TOKEN=your_token_here`

## Configuration

### Link Replacements

Link replacements are configured in `_maintainers/link-replacements.yaml`. This file supports:

1. **Exact replacements**: Map specific paths to URLs
2. **Pattern-based replacements**: Use regex patterns to match and replace links

Example configuration:

```yaml
# Exact path replacements
replacements:
  /developer-tools/faucet: https://docs.metamask.io/developer-tools/faucet
  /developer-tools/dashboard: https://developer.metamask.io/login

# Pattern-based replacements
patterns:
  - pattern: '/developer-tools/dashboard/.+'
    replacement: 'https://developer.metamask.io'
    extractPath: true
    description: 'Replace developer dashboard sub-paths, preserving the sub-path'
```

The remark plugins (`remark-link-rewriter` and `remark-replace-link-patterns`) automatically read this configuration and apply replacements during content processing.

## Usage

### Download Remote Content

To download content from the MetaMask repository:

```bash
npm run get-remote
```

This script:
1. Downloads content from 10 configured MetaMask service directories
2. Uses GitHub API (with your token) to dynamically list files
3. Downloads files to `docs/services/` subdirectories

**Note**: This does NOT run the content processor. Processing happens during `npm run build`.

### Build and Process

To build the site and process all downloaded content:

```bash
npm run build
```

This will:
1. Download remote content (if not already downloaded)
2. Process all files using the modular processors:
   - Fix partial import paths
   - Fix image paths (using remark plugin)
   - Comment out unavailable component imports
   - Apply link replacements (from YAML config)
   - Remove broken links
3. Generate maintainer logs in `_maintainers/logs/`

### Development Mode

To run the development server:

```bash
npm start
```

**Note**: The development server does NOT download remote content or make API requests. It only processes already-downloaded files.

## Maintainer Logs

All transformations are logged to `_maintainers/logs/`:

- **`broken-links-removed.log`**: Lists all broken links that were removed (link text preserved)
- **`component-import-fixes.log`**: Lists all component imports that were commented out
- **`image-path-fixes.log`**: Lists all image paths that were fixed

Each log file includes:
- File path (relative to `docs/`)
- Original content
- New content
- Additional context (component name, image filename, etc.)

## How It Works

### 1. Download Phase

The `download.js` module uses `docusaurus-plugin-remote-content` CLI commands to fetch content. Each plugin instance is configured in `docusaurus.config.js` with:
- Source URL (MetaMask repo)
- Output directory
- File patterns to include

### 2. Processing Phase

The Docusaurus plugin (`docusaurus-plugin-config-driven-sync`) runs during `loadContent` and:

1. **Scans** all downloaded files in `docs/services/`
2. **Fixes partial imports**: Converts absolute paths to relative paths
3. **Processes images**: Uses `remark-fix-image-paths` plugin to convert `../images/` to `/img/`
4. **Processes components**: Comments out unavailable imports and their JSX usage
5. **Processes links**: 
   - First applies pattern/exact replacements from YAML config (via remark plugins)
   - Then detects and removes broken internal links
6. **Writes logs**: Generates detailed reports for maintainers

### 3. Remark Plugins

The solution uses three remark plugins for config-driven transformations:

- **`remark-link-rewriter`**: Applies exact and pattern-based link replacements from YAML
- **`remark-replace-link-patterns`**: Applies pattern-based replacements (runs before link-rewriter)
- **`remark-fix-image-paths`**: Converts relative image paths to Docusaurus-compatible paths

All plugins read from `_maintainers/link-replacements.yaml` automatically.

## Managing Sidebars

The site supports multiple Docusaurus docs instances with a unified sidebar:

- **Main docs** (`docs/`): Route base path `/`
- **Services docs** (`services/`): Route base path `/services`

### Sidebar Configuration

Sidebars are defined in `sidebars.js` at the project root. The file exports two sidebar configurations:

1. **`docSidebar`**: Sidebar for the main docs instance (route `/`)
2. **`services`**: Sidebar for the services instance (route `/services`)

### Adding Items to Sidebars

To add a new document to a sidebar, edit `sidebars.js`:

```javascript
const sidebars = {
  docSidebar: [
    {
      type: "category",
      label: "Documentation",
      items: [
        {
          type: "doc",
          id: "index",  // Document ID (filename without .md/.mdx)
        },
        {
          type: "doc",
          id: "how-to/sync-content",  // Path relative to docs/ directory
        },
        // Add more items here
      ],
    },
  ],
  services: [
    {
      type: "doc",
      id: "index",  // Document ID from services/ directory
    },
    // Add more items here
  ],
};
```

### Cross-Linking Between Instances

To link from one docs instance to another, use the `link` type:

```javascript
{
  type: "link",
  label: "Services Overview",
  href: "/services",  // Absolute path to other instance
}
```

This allows users to navigate between the main docs and services docs seamlessly.

### Sidebar Item Types

- **`doc`**: Links to a document (uses `id` field)
- **`link`**: Links to an external URL or another route (uses `href` field)
- **`category`**: Groups items under a collapsible category
- **`ref`**: References a document from another docs instance

### Auto-Generated Sidebars

Docusaurus can auto-generate sidebars based on file structure. However, this project uses manual sidebar configuration for better control over navigation and cross-linking between instances.

## Managing Imports

The content processor automatically handles several types of imports. Understanding how imports work helps you manage content effectively.

### Partial Imports

**What are partials?** Partials are reusable content snippets stored in `docs/services/reference/_partials/`. They're imported into other documents using MDX import syntax.

**Automatic Fixes:**

The processor automatically fixes partial import paths:

- **Before**: `import X from "/services/reference/_partials/bundler/file.mdx"`
- **After**: `import X from "../../_partials/bundler/file.mdx"` (relative path)

This conversion happens automatically during processing. The processor:
1. Detects absolute paths starting with `/services/reference/_partials/` or `/service/reference/_partials/`
2. Converts them to relative paths based on the importing file's location
3. Handles both `/services/` and `/service/` variants (with or without 's')

**Manual Management:**

If you need to add a new partial:
1. Place it in `docs/services/reference/_partials/`
2. Import it in your document using a relative path: `import X from "../../_partials/your-partial.mdx"`
3. The processor will validate the import during build

**Partial Import Context:**

The processor builds a map of which files import which partials. This allows it to:
- Validate links in partials from the importing file's context
- Fix broken links in partials that might work from the importing file's directory

### Component Imports

**What happens to component imports?**

The processor automatically comments out unavailable component imports:

- **Components from `@site/src/components/`**: If the component doesn't exist, the import and all JSX usage are commented out
- **Plugins from `@site/src/plugins/`**: Plugin imports (like `NETWORK_NAMES`) are commented out if unavailable

**Example:**

```jsx
// Before processing:
import CreditCost from '@site/src/components/CreditCost/CreditCostPrice.js';
<CreditCost price={100} />

// After processing:
// import CreditCost from '@site/src/components/CreditCost/CreditCostPrice.js'; // Component not available in this project
{/* <CreditCost price={100} /> - Component not available */}
```

**Reviewing Component Fixes:**

Check `_maintainers/logs/component-import-fixes.log` to see all commented-out components. For each component, you can:

1. **Create the component**: Add the missing component to `src/components/`
2. **Remove the usage**: Delete the commented-out import and JSX
3. **Fix the path**: If the component exists but path is wrong, update the import

**Component Import Patterns:**

The processor recognizes these import patterns:
- `import ComponentName from '@site/src/components/...'`
- `import { ConstantName } from '@site/src/plugins/...'`
- `import PluginName from '@site/src/plugins/...'`

All matching imports are processed and their JSX usage is commented out if unavailable.

### Image Imports

**Automatic Image Path Fixes:**

The processor fixes image paths using the `remark-fix-image-paths` plugin:

- **Before**: `![alt](../images/file.png)` or `src={require('../images/file.png').default}`
- **After**: `![alt](/img/file.png)` or `src="/img/file.png"`

**Managing Images:**

1. Place images in `static/img/` directory
2. The processor automatically converts relative image paths to `/img/` paths
3. Check `_maintainers/logs/image-path-fixes.log` to see all fixed paths
4. Ensure the actual image files exist in `static/img/` after processing

### Import Validation

The processor validates imports during processing:

- **Partial imports**: Checks that the partial file exists
- **Component imports**: Comments out if component doesn't exist (doesn't fail build)
- **Image imports**: Fixes paths but doesn't validate file existence (Docusaurus will show broken images if file missing)

**Best Practice**: After processing, review the maintainer logs and ensure all referenced files (partials, images) actually exist.

## Troubleshooting

### No content downloaded

- Check that `GITHUB_TOKEN` is set in `.env`
- Verify the token has repository access
- Run `npm run get-remote` manually to see error messages

### Broken links not being removed

- Check that files exist in the expected locations
- Verify partial import paths are correct
- Check `_maintainers/logs/broken-links-removed.log` for details

### Component imports not commented out

- Verify the component path matches the pattern `@site/src/components/...`
- Check `_maintainers/logs/component-import-fixes.log` for details

### Image paths not fixed

- Ensure images are in `static/img/` directory
- Check `_maintainers/logs/image-path-fixes.log` for details

## File Structure

```
.
├── _maintainers/
│   ├── _config.yml              # Global config (optional)
│   ├── link-replacements.yaml   # Link replacement rules
│   └── logs/                    # Maintainer logs (gitignored)
├── docs/
│   └── services/               # Downloaded content
├── services/                    # Second docs instance
├── src/
│   ├── lib/
│   │   └── content-processor/  # Modular processors
│   └── plugins/
│       ├── docusaurus-plugin-config-driven-sync/  # Main plugin
│       └── remark/             # Remark plugins
└── scripts/
    └── get-remote-content.js   # Download script
```

## Best Practices

1. **Review logs regularly**: Check `_maintainers/logs/` after each sync to see what changed
2. **Update link replacements**: Add new patterns to `link-replacements.yaml` as needed
3. **Fix components**: When components are commented out, either:
   - Create the missing component
   - Remove the component usage entirely
   - Update the import path if it's incorrect
4. **Add images**: When image paths are fixed, ensure the images exist in `static/img/`
