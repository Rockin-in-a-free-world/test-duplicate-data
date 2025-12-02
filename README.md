# Config-Driven Content Sync for test Docs

## Overview
Enable writers to control which services documentation content is pulled from MetaMask docs using simple YAML configuration files placed alongside the mirrored folder structure. This approach keeps configuration visible and maintainable by content teams, not hidden in code.

## Approach: Mirror Structure + Config Files

The test docs site will:
1. **Mirror the folder structure** from MetaMask services docs
2. **Use `_config.yml` files** at various directory levels to specify what to include
3. **Plugin reads configs** and copies/symlinks only the specified content during build

### Why This Approach?
- ✅ Writers control content without touching code
- ✅ Config files are visible in the repo structure
- ✅ Easy to enable/disable entire sets (e.g., `trace-methods/`) or individual files
- ✅ Hierarchical configs allow inheritance and overrides
- ✅ Clear audit trail of what's included

## Implementation Steps

### 1. Create Folder Structure in Tests Docs

**Structure:** Mirror the MetaMask services reference structure https://github.com/MetaMask/metamask-docs/tree/main/services/reference in Test repo. A single config at the ethereum level can control the entire folder:

```
test-docs/
  reference/
    ethereum/
      _config.yml          # Single config controls entire ethereum section
      json-rpc-methods/
        trace-methods/     # No config needed - controlled by parent
        filter-methods/    # No config needed - controlled by parent
        eth_feehistory.mdx # Files synced based on parent config
        eth_call.mdx
```

**Optional:** Subfolder configs can override parent configs if needed, but not required.

### 2. Define Config File Format

**File:** `test-docs/reference/ethereum/_config.yml`

```yaml
# Source: Where to pull content from (MetaMask repo path)
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"

# Include patterns: What to include
include:
  # Include entire folders (recursive)
  - "json-rpc-methods/trace-methods/**"
  - "json-rpc-methods/filter-methods/**"
  - "json-rpc-methods/subscription-methods/**"
  
  # Include individual files
  - "json-rpc-methods/eth_feehistory.mdx"
  - "json-rpc-methods/eth_call.mdx"
  - "json-rpc-methods/eth_getbalance.mdx"
  
  # Include with wildcards
  - "json-rpc-methods/eth_get*.mdx"
  
  # Include index files
  - "json-rpc-methods/index.md"
  - "quickstart.md"
  - "index.md"

# Exclude patterns (optional, overrides include)
exclude:
  - "json-rpc-methods/eth_mining.mdx"  # Example: exclude specific method
  - "json-rpc-methods/bundler/**"      # Example: exclude entire folder

# Copy images: Automatically copy referenced images
copy_images: true
image_dest: "../../../static/img/services"
```

**Alternative simpler format:**

```yaml
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"

# Simple list of files/folders to include
include:
  - json-rpc-methods/trace-methods/          # Entire folder
  - json-rpc-methods/filter-methods/         # Entire folder
  - json-rpc-methods/eth_feehistory.mdx      # Individual file
  - json-rpc-methods/eth_call.mdx
  - json-rpc-methods/eth_getbalance.mdx
  - json-rpc-methods/eth_get*.mdx            # Pattern matching
  - json-rpc-methods/index.md
  - quickstart.md
  - index.md
```

### 3. Create Docusaurus Plugin That Reads Configs

**File:** `test-docs/src/plugins/docusaurus-plugin-config-driven-sync/index.js`

Plugin behavior:
1. **Scan for `_config.yml` files** in the docs directory structure
2. **Read each config** to determine source path and include/exclude patterns
3. **Copy/symlink files** from MetaMask repo (via git submodule) to test docs structure
4. **Handle images** automatically (copy referenced images to static directory)
5. **Transform paths** in markdown (update relative links, image paths)
6. **Generate routes** using standard Docusaurus content-docs plugin

**Key plugin methods:**
- `loadContent()`: Read all `_config.yml` files, resolve patterns, copy files
- `configureWebpack()`: Set up aliases for image resolution if needed
- Integration with `@docusaurus/plugin-content-docs` to serve the copied content

### 4. Example Config Files at Different Levels

**Root level config** (`test-docs/reference/_config.yml`):
```yaml
source: "../../external-services/downstream-metamask-docs/services/reference"
include:
  - ethereum/**      # Include entire ethereum section
  - polygon-pos/**   # Include polygon section
  # Exclude others by not listing them
```

**Network level** (`test-docs/reference/ethereum/_config.yml`):
```yaml
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"
include:
  - json-rpc-methods/trace-methods/**     # All trace methods
  - json-rpc-methods/filter-methods/**    # All filter methods
  - json-rpc-methods/subscription-methods/**
  - json-rpc-methods/eth_feehistory.mdx   # Individual method
  - json-rpc-methods/eth_call.mdx
  - json-rpc-methods/eth_getbalance.mdx
  - json-rpc-methods/eth_get*.mdx         # Pattern for all get methods
  - json-rpc-methods/index.md
  - quickstart.md
  - index.md

exclude:
  - json-rpc-methods/eth_mining.mdx       # Exclude specific method
  - json-rpc-methods/bundler/**           # Exclude entire folder
```

**Subfolder level** (optional override, `test-docs/reference/ethereum/json-rpc-methods/trace-methods/_config.yml`):
```yaml
source: "../../../../../../external-services/downstream-metamask-docs/services/reference/ethereum/json-rpc-methods/trace-methods"

# Include all trace methods
include:
  - "*.mdx"
  - "index.md"

# Or selectively:
# include:
#   - trace_block.mdx
#   - trace_call.mdx
#   # Exclude trace_filter, trace_transaction, etc.
```

### 5. Configure Docusaurus

**File:** `test-docs/docusaurus.config.js`

```javascript
plugins: [
  // Custom plugin that reads configs and syncs content
  './src/plugins/docusaurus-plugin-config-driven-sync',
  
  // Standard docs plugin reads the synced content
  [
    '@docusaurus/plugin-content-docs',
    {
      id: 'reference',
      path: 'reference',  // Standard path, plugin has already populated it
      routeBasePath: 'reference',
      sidebarPath: require.resolve('./reference-sidebar.js'),
      remarkPlugins: [/* ... */],
      rehypePlugins: [/* ... */],
    },
  ],
]
```

### 6. Git Submodule Setup

Same as before - git submodule pointing to MetaMask docs repo:

```bash
git submodule add <metamask-repo-url> external-services
```

### 7. Build Process Flow

1. **Pre-build:** Plugin reads all `_config.yml` files
2. **Sync phase:** Plugin copies/symlinks files from submodule based on configs
3. **Image handling:** Plugin scans copied files, finds image references, copies images to `static/img/services/`
4. **Path transformation:** Plugin updates image paths in markdown files
5. **Docusaurus build:** Standard Docusaurus processes the synced content

## Files to Create

### In test Docs Repository:

**Plugin:**
- `src/plugins/docusaurus-plugin-config-driven-sync/index.js` - Main plugin
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/config-reader.js` - Config file parser
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/file-sync.js` - File copying/symlinking logic
- `src/plugins/docusaurus-plugin-config-driven-sync/utils/image-handler.js` - Image copying and path transformation

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

- [ ] Design YAML config file format with include/exclude patterns, source paths, and image handling options
- [ ] Create utility to scan and parse `_config.yml` files from directory structure
- [ ] Implement file copying/symlinking logic that respects config include/exclude patterns
- [ ] Implement automatic image detection, copying, and path transformation in synced files
- [ ] Create main Docusaurus plugin that orchestrates config reading, file syncing, and image handling
- [ ] Create example `_config.yml` files at different directory levels showing various use cases
- [ ] Integrate plugin with Docusaurus config and standard content-docs plugin
- [ ] Set up git submodule for MetaMask docs repository
- [ ] Test with example configs to verify functionality
- [ ] Document writer workflow and best practices

