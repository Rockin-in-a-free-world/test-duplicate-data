const path = require("path");
const { processAllFiles, writeReports } = require("../../lib/content-processor");

/**
 * Docusaurus plugin for processing downloaded remote content
 * Automatically processes all downloaded files to fix links, images, and components
 * Uses remark plugins for link/image processing (config-driven via YAML)
 * Component processing is handled separately (not config-driven)
 */
function configDrivenSyncPlugin(context, options) {
  return {
    name: "docusaurus-plugin-config-driven-sync",
    
    async loadContent() {
      const docsPath = path.resolve(context.siteDir, "docs");
      const siteDir = context.siteDir;
      
      console.log(`[config-driven-sync] Processing all downloaded files...`);
      
      // Process all downloaded files automatically
      // Link replacements are now handled by remark plugins reading from _maintainers/link-replacements.yaml
      const result = await processAllFiles(docsPath);
      
      // Write detailed logs to _maintainers/logs/
      const logsDir = path.resolve(siteDir, "_maintainers", "logs");
      writeReports(result, logsDir);
    },
  };
}

module.exports = configDrivenSyncPlugin;
