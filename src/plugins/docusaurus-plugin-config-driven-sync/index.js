const { findConfigFiles, readConfig } = require("./utils/config-reader");
const { syncFiles } = require("./utils/file-sync");
const path = require("path");

/**
 * Docusaurus plugin for config-driven content sync
 * Reads _config.yml files and syncs content from external sources
 */
function configDrivenSyncPlugin(context, options) {
  return {
    name: "docusaurus-plugin-config-driven-sync",
    
    async loadContent() {
      const docsPath = path.resolve(context.siteDir, "docs");
      const configs = findConfigFiles(docsPath);
      
      console.log(`[config-driven-sync] Found ${configs.length} config file(s)`);
      
      for (const { configPath, dirPath } of configs) {
        const config = readConfig(configPath);
        
        if (!config) {
          console.warn(`[config-driven-sync] Skipping invalid config: ${configPath}`);
          continue;
        }
        
        // Calculate relative destination path from docs root
        const docsRoot = path.resolve(context.siteDir, "docs");
        const relativeDestPath = path.relative(docsRoot, dirPath);
        
        console.log(`[config-driven-sync] Processing config: ${configPath}`);
        console.log(`[config-driven-sync] Source: ${config.source}`);
        console.log(`[config-driven-sync] Destination: ${relativeDestPath || "."}`);
        
        // Sync files based on config
        syncFiles(config, dirPath, relativeDestPath);
      }
    },
  };
}

module.exports = configDrivenSyncPlugin;

