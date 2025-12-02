---
title: How it works
sidebar_position: 0
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Data refresh

The external content from the MetaMask repo is copied by a git submodule `/.gitmodules` pointing to the MetaMask docs repository. Before building or making changes, ensure you have the latest content from the source repository.

<Tabs>
<TabItem value="quick" label="Quick refresh" default>

Run the automated refresh script:

```bash
npm run refresh-data
```

The script [refresh-external-data.js](../scripts/refresh-external-data.js) will:

- Check that the submodule exists and is properly initialized
- Display the current commit and branch information
- Fetch the latest changes from the MetaMask repository
- Show confirmation if the update succeeded
- Display clear error messages if something goes wrong
- Provide next steps (review, commit, rebuild) if changes were found

</TabItem>
<TabItem value="manual" label="Manual refresh">

If you prefer to update manually:

```bash
git submodule update --remote external-services/downstream-metamask-docs
git add external-services/downstream-metamask-docs
git commit -m "Update external data from MetaMask docs"
npm run build
```

</TabItem>
</Tabs>

### About the submodule

The submodule uses sparse checkout (configured to only include the `services` folder): only pulling the documentation content you might need, not the entire MetaMask docs repository structure.

The config-driven content sync system automatically pulls documentation from the MetaMask docs repository during the Docusaurus build process. Here's how it works:

1. **During build**: [The plugin](../src/plugins/docusaurus-plugin-config-driven-sync/index.js) scans for `_config.yml` files in your `docs/` directory.
2. **File matching**: Files matching your `include` patterns in the config (e.g. `/docs/reference/ethereum/_config.yml`) are copied from the MetaMask data (stored in the external-services folder found at root: `/external-services/downstream-metamask-docs`).
3. **Path transformation**: Import paths in MDX files are automatically updated to point directly to `external-services`. Partials are resolved directly from the source folder - no symlink or copy needed.
4. **Metadata addition**: All synced files automatically receive a `warn: "do not edit this page, any changes will be overwritten at build"` metadata field. Files that import partials with broken links also receive a `note: "links unavailable"` metadata field.
5. **Docusaurus processes**: Standard Docusaurus then processes the synced content.

## Components

### Main Plugin

[The main plugin](../src/plugins/docusaurus-plugin-config-driven-sync/index.js) orchestrates the entire sync process. It implements Docusaurus's `loadContent()` lifecycle hook, which runs before the standard docs plugin processes files. The plugin scans the `docs/` directory for all `_config.yml` files, reads each configuration, and delegates file syncing to the utility functions. It calculates relative destination paths and ensures the sync happens in the correct location within the docs structure. This plugin is registered in [docusaurus.config.js](../docusaurus.config.js) and must run before the standard `@docusaurus/plugin-content-docs` plugin.

### Config Reader

[The config reader](../src/plugins/docusaurus-plugin-config-driven-sync/utils/config-reader.js) handles discovery and parsing of YAML configuration files. It recursively walks the docs directory tree to find all `_config.yml` files, then parses each one using the `js-yaml` library. It validates that required fields (`source` and `include`) are present and returns a structured config object with source paths, include/exclude patterns, and optional settings like image handling. The utility provides clear error messages for invalid configurations, helping writers debug their config files quickly.

### File Sync

[The file sync utility](../src/plugins/docusaurus-plugin-config-driven-sync/utils/file-sync.js) performs the actual file operations. It implements pattern matching using wildcards (`*` and `**`) to determine which files should be copied based on the include/exclude patterns. It automatically detects when synced files reference partials and transforms import paths to point directly to `external-services` (no symlink or copy needed - all partials come directly from the source). The utility transforms absolute paths like `/services/reference/_partials/...` to relative paths pointing to `external-services/downstream-metamask-docs/services/reference/_partials/...`.

**Link Resolution Process**: For each markdown link in synced files, the utility:
- Resolves the link path (handles both absolute paths starting with `/` and relative paths)
- Checks if the target file exists in the `docs/` directory
- **If the file exists**: Calculates the correct relative path from the current file and replaces the link with the updated path (preserving anchors like `#section`)
- **If the file doesn't exist**: Removes the link markup but keeps the link text. If the file imports partials that have broken links, a `note: "links unavailable"` metadata field is added to the page's frontmatter

**Metadata Management**: The utility automatically adds metadata to all synced files:
- All synced files receive `warn: "do not edit this page, any changes will be overwritten at build"` to prevent accidental edits
- Files that import partials with broken links receive `note: "links unavailable"` to indicate missing link targets
- The utility tracks which partials have broken links and propagates this information to synced files that import them

The utility also removes problematic component imports (like `CreditCost`) that don't exist in this site, ensuring the synced content builds successfully.