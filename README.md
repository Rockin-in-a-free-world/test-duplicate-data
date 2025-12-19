# Testing porting documentation to site

This is a test site as a poc for bringing remote data into the site for inclusion in the Docusaurus build using a known plugin: `docusaurus-plugin-remote-content`.

## Known issues

[] Components not made available
  - eg // import GasApiNetworks from "@site/src/components/GasApiNetworks.tsx"; // Component not available in this project

[x] Creates title step -- no handling for special cases yet
  - Api not API
  - Curl not CURL
  - Jwt not JWT

  > Partial fix is adding _category_.json which persists, need to see how many cases that leaves

## Set up

1. One time/First use: `npm install` to setup the Docusaurus site.
  `npm start` or `npm run build` to serve or build the site.

2. GitHub Authentication (Required): The plugin uses GitHub's API which has rate limits. To avoid rate limiting, create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Generate a new token (classic is fine give it public repo access): give it access to Infura
   - Create a `.env` file in the project root:
     ```
     GITHUB_TOKEN=your_github_token_here
     ```

3. To do the import, run the script with `npm run get-remote`

## Import function

### Plugin configuration

The remote content plugin is configured in:
- `docusaurus.config.js` - Contains the `docusaurus-plugin-remote-content` plugin configuration that determines what content is downloaded from MetaMask's GitHub
- `src/lib/list-remote.js` - Helper library that provides functions to create repo objects, build GitHub raw URLs, and list documents from remote repositories

Webpack Alias Configuration: Because MetaMask's documentation uses absolute paths like `/services/reference/_partials/...` (they don't put all docs in a `docs/` folder), a webpack alias plugin is configured in `docusaurus.config.js` (see the `plugins` array) to map `/services/` to `docs/services/`. 

> This alias allows Docusaurus to resolve absolute import paths in MDX files during the build process. For example, when a file contains `import Description from "/services/reference/_partials/_eth_accounts-description.mdx"`, webpack will resolve it to `docs/services/reference/_partials/_eth_accounts-description.mdx` in the filesystem.

> Note: The script's broken link detection (`scripts/get-remote.js`) also handles `/services/` paths when validating markdown links, converting them to filesystem paths for validation. This ensures links are checked before the build, while webpack handles import resolution during the build.

### Import script

The import script is located at:
- `scripts/get-remote.js` - Custom script that handles downloading and reconfigureing the remote content.

#### What the import script does

### 1. Downloads Remote Content

Downloads all configured content sources from MetaMask docs using the `docusaurus-plugin-remote-content` command. The configuration is managed in docusaurus.config.js at the root of this repo.

Plugin behavior:
1. **Scan for `_config.yml` files** in the docs directory structure
2. **Read each config** to determine source path and include/exclude patterns
3. **Copy files** from MetaMask repo (via git submodule) to test docs structure
4. **Transform import paths** to point directly to `external-services` (partials resolved directly from source, no symlink needed)
5. **Handle broken links** by removing links while keeping text, and add metadata notes to affected pages
6. **Transform paths** in markdown (update relative links, image paths)
7. **Generate routes** using standard Docusaurus content-docs plugin

**Key plugin methods:**
- `loadContent()`: Read all `_config.yml` files, resolve patterns, copy files, transform imports
- Integration with `@docusaurus/plugin-content-docs` to serve the copied content

Next, the `get-remote` script performs several automated processing steps after downloading content:

### 2. Fixes image paths

Image References: Updates image paths to point to the local static directory
- Before: `src={require("../../../images/Web3.png").default}`
- After: `src={require('@site/static/img/Web3.png').default}`

*Note: Images were copied manually from the source repository's `services/images/` directory to `static/img/` as a one-time setup. The script only updates the paths in the markdown files.*

### 3. Handles missing components

Component Imports: Comments out imports for components that don't exist in this project
- Components like `CardList`, `GasApiNetworks`, `CreditCostTable`, etc. are commented out
- Their usage in JSX is also replaced with comments

Plugin Imports: Comments out plugin imports (e.g., `NETWORK_NAMES` from `@site/src/plugins/plugin-json-rpc`)
- Any usage of these constants is also commented out

### 4. Processes broken links

Removes Broken Internal Links: 
- Detects markdown links pointing to files that don't exist locally
- Removes the link markup while preserving the link text
- Example: `[Optimism](../optimism/index.md)` becomes just `Optimism`

Replaces Specific Patterns:
- Dashboard links: `/developer-tools/dashboard/...` → `dashboard/dashboard-placeholder.md`
- This handles links to the MetaMask Developer dashboard that aren't available in this test site

### 5. Cleanup

Removes old directories (like the previous `docs/api/networks/` structure) to prevent build conflicts.

### 6. Statistics and maintainer Logs

After processing, the script displays:
- Total number of files imported
- Number of image paths fixed
- Number of component imports commented out
- Number of broken links removed (with examples)

Detailed logs for maintainers are written to `.maintainer-logs/` directory (gitignored):
- `image-path-fixes.log` - Complete list of all image path conversions with before/after examples
- `component-import-fixes.log` - Complete list of all component and plugin imports that were commented out, including file locations and import statements
- `broken-links-removed.log` - Complete list of all broken links that were removed, showing the file, link text, and broken URL

These logs are regenerated on each run and provide full details for maintainers to review what changes were made during processing.

1. **Pre-build:** Plugin reads all `_config.yml` files
2. **Sync phase:** Plugin copies files from submodule based on configs
3. **Import transformation:** Plugin transforms import paths to point directly to `external-services` (partials resolved directly from source, no symlink or copy needed)
4. **Link handling:** Plugin detects broken markdown links, removes links while keeping text, and adds metadata notes
5. **Image handling:** Plugin scans copied files, finds image references, copies images to `static/img/services/` (future phase)
6. **Path transformation:** Plugin updates image paths in markdown files (future phase)
7. **Docusaurus build:** Standard Docusaurus processes the synced content

## Files to Create

### In test Docs Repository:

**Plugin:**
- `src/plugins/docusaurus-plugin-config-driven-sync/index.js` - Main plugin orchestrates the sync process
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/config-reader.js` - Config file parser and validator
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/file-sync.js` - File copying, import path transformation, and link handling
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/image-handler.js` - Image copying and path transformation (future phase)

**Config files (examples):**
- `reference/_config.yml` - Root reference config
- `reference/ethereum/_config.yml` - Ethereum network config
- `reference/ethereum/json-rpc-methods/trace-methods/_config.yml` - Optional trace methods override

**Configuration:**
- `docusaurus.config.js` - Add plugin configuration
- `.gitmodules` - Git submodule (auto-generated)

## Writer Workflow Examples

### Enable all trace methods:
Edit `reference/ethereum/_config.yml`:
```yaml
include:
  - json-rpc-methods/trace-methods/**
```

### Disable trace methods, enable only specific ones:
Edit `reference/ethereum/_config.yml`:
```yaml
include:
  - json-rpc-methods/trace-methods/trace_block.mdx
  - json-rpc-methods/trace-methods/trace_call.mdx
```

### Enable individual method:
Edit `reference/ethereum/_config.yml`:
```yaml
include:
  - json-rpc-methods/eth_feehistory.mdx
```

### Disable specific method even if pattern matches:
Edit `reference/ethereum/_config.yml`:
```yaml
include:
  - json-rpc-methods/eth_get*.mdx
exclude:
  - json-rpc-methods/eth_getwork.mdx  # Exclude this one
```

### Control entire ethereum section from one config:
Edit `reference/ethereum/_config.yml`:
```yaml
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"
include:
  - json-rpc-methods/trace-methods/**      # All trace methods
  - json-rpc-methods/filter-methods/**     # All filter methods
  - json-rpc-methods/eth_feehistory.mdx     # Individual method
  - json-rpc-methods/eth_call.mdx
  - json-rpc-methods/eth_get*.mdx           # Pattern
  - json-rpc-methods/index.md
  - quickstart.md
  - index.md
```

## Benefits

1. **Writer-friendly:** No code changes needed, just edit YAML
2. **Visible:** Config files are in the repo, easy to see what's included
3. **Flexible:** Can control at any level (network, method category, individual method)
4. **Maintainable:** Clear audit trail, easy to review changes
5. **Automatic:** Images and assets handled automatically by plugin
6. **Single config control:** One config file can control an entire section (e.g., all of ethereum)

## Implementation Checklist

- [x] Design YAML config file format with include/exclude patterns, source paths
- [x] Create utility to scan and parse `_config.yml` files from directory structure
- [x] Implement file copying logic that respects config include/exclude patterns
- [x] Implement import path transformation to point directly to `external-services` (partials resolved directly from source)
- [x] Implement broken link detection and handling (remove links, keep text, add metadata notes)
- [x] Create main Docusaurus plugin that orchestrates config reading, file syncing, and path transformation
- [x] Create example `_config.yml` files at different directory levels showing various use cases
- [x] Integrate plugin with Docusaurus config and standard content-docs plugin
- [x] Set up git submodule for MetaMask docs repository with sparse checkout
- [x] Test with example configs to verify functionality
- [x] Document writer workflow and best practices
- [ ] Implement automatic image detection, copying, and path transformation in synced files (future phase)

All processing happens after download but before build, ensuring the Docusaurus build won't fail due to broken links, missing imports, or unresolved components.



