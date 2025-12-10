---
title: Sync Content from MetaMask Docs
sidebar_position: 1
---

This guide explains how to use the config-driven content sync tooling to pull documentation from the MetaMask docs repository into this site.

## Overview

The config-driven sync tooling allows you to selectively pull content from the MetaMask docs repository using simple YAML configuration files. You control what gets synced by creating `_config.yml` files in your documentation structure.

## Prerequisites

- Api key for github setup in .env

## Step 1: Create a Config File

Create a `_config.yml` file in the directory where you want the synced content to appear.

For example, to sync Ethereum RPC methods, create:

```
docs/reference/ethereum/_config.yml
```

## Step 2: Configure the Source

In your `_config.yml` file, specify the source path to the MetaMask docs content. The path is relative to the config file location.

```yaml
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"
```

This points to the MetaMask docs repository (which is included as a git submodule).

## Step 3: Specify What to Include

> as a one off, run the imports, id what image paths were updated and import those images into the repo to make the locally available

Add an `include` list with the files or patterns you want to sync:

```yaml
include:
  # Include individual files
  - "json-rpc-methods/eth_chainid.mdx"
  - "json-rpc-methods/eth_call.mdx"
  
  # Include entire folders (recursive)
  - "json-rpc-methods/trace-methods/**"
  
  # Include with wildcards
  - "json-rpc-methods/eth_get*.mdx"
```

## Step 4: Build the Site

Run the build command:

```bash
npm run build
```

The plugin will:
1. Find all `_config.yml` files in your docs directory
2. Read each config to determine what to sync
3. Copy the specified files from the MetaMask repo
4. **Automatically detect** if any files use partial imports
5. **Transform import paths** to point directly to `external-services` (no symlink or copy needed)
6. Handle broken links by removing links while keeping text
7. Add metadata notes to pages with broken links

## Example: Complete Config File

Here's a complete example for syncing `eth_chainid`:

```yaml
# docs/reference/ethereum/_config.yml
source: "../../../external-services/downstream-metamask-docs/services/reference/ethereum"

include:
  - "json-rpc-methods/eth_chainid.mdx"
```

**Note:** The `_partials` directory is automatically detected and import paths are transformed to point directly to `external-services`. All partials are resolved directly from the source folder - no symlink or copy is created. No manual configuration needed!

## Next Steps

Once you've verified a single file syncs correctly, you can:
- Add more files to the `include` list
- Add `exclude` patterns to filter out specific files
- Create configs at different directory levels for hierarchical control

