# Testing porting documentation to site

This is a test site as a poc for bringing remote data into the site for inclusion in the Docusaurus build using a known plugin: `docusaurus-plugin-remote-content`.

## Known issues

[] Components not made availiable
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

All processing happens after download but before build, ensuring the Docusaurus build won't fail due to broken links, missing imports, or unresolved components.


