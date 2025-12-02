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
4. **Link handling**: Broken markdown links are automatically detected and removed (text is kept), with a metadata note added to affected pages.
5. **Docusaurus processes**: Standard Docusaurus then processes the synced content.

## Components

### Main Plugin

[The main plugin](../src/plugins/docusaurus-plugin-config-driven-sync/index.js) orchestrates the entire sync process. It implements Docusaurus's `loadContent()` lifecycle hook, which runs before the standard docs plugin processes files. The plugin scans the `docs/` directory for all `_config.yml` files, reads each configuration, and delegates file syncing to the utility functions. It calculates relative destination paths and ensures the sync happens in the correct location within the docs structure. This plugin is registered in [docusaurus.config.js](../docusaurus.config.js) and must run before the standard `@docusaurus/plugin-content-docs` plugin.

### Config Reader

[The config reader](../src/plugins/docusaurus-plugin-config-driven-sync/utils/config-reader.js) handles discovery and parsing of YAML configuration files. It recursively walks the docs directory tree to find all `_config.yml` files, then parses each one using the `js-yaml` library. It validates that required fields (`source` and `include`) are present and returns a structured config object with source paths, include/exclude patterns, and optional settings like image handling. The utility provides clear error messages for invalid configurations, helping writers debug their config files quickly.

### File Sync

[The file sync utility](../src/plugins/docusaurus-plugin-config-driven-sync/utils/file-sync.js) performs the actual file operations. It implements pattern matching using wildcards (`*` and `**`) to determine which files should be copied based on the include/exclude patterns. It automatically detects when synced files reference partials and transforms import paths to point directly to `external-services` (no symlink or copy needed - all partials come directly from the source). The utility transforms absolute paths like `/services/reference/_partials/...` to relative paths pointing to `external-services/downstream-metamask-docs/services/reference/_partials/...`. It also removes problematic component imports (like `CreditCost`) that don't exist in this site, handles broken markdown links by removing links while keeping text, and adds metadata notes to affected pages, ensuring the synced content builds successfully.