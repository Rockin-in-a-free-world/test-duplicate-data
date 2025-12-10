const path = require("path");
const fs = require("fs");
const { processAllFiles } = require("./utils/file-processor");

/**
 * Docusaurus plugin for processing downloaded remote content
 * Automatically processes all downloaded files to fix links, images, and components
 * Config is only used for link_replacements (pattern replacements)
 */
function configDrivenSyncPlugin(context, options) {
  return {
    name: "docusaurus-plugin-config-driven-sync",
    
    async loadContent() {
      const docsPath = path.resolve(context.siteDir, "docs");
      const siteDir = context.siteDir;
      
      // Read root-level config from _maintainers folder (if it exists) to get global link_replacements
      const rootConfigPath = path.join(siteDir, "_maintainers", "_config.yml");
      let linkReplacements = {};
      
      if (fs.existsSync(rootConfigPath)) {
        try {
          const yaml = require("js-yaml");
          const configContent = fs.readFileSync(rootConfigPath, "utf8");
          const rootConfig = yaml.load(configContent);
          if (rootConfig && rootConfig.link_replacements) {
            linkReplacements = rootConfig.link_replacements;
          }
        } catch (error) {
          console.warn(`[config-driven-sync] Could not read root config: ${error.message}`);
        }
      }
      
      console.log(`[config-driven-sync] Processing all downloaded files...`);
      
      // Process all downloaded files automatically
      const result = processAllFiles(docsPath, linkReplacements);
      
      // Write detailed logs to _maintainers/logs/
      const logsDir = path.resolve(context.siteDir, "_maintainers", "logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Write image fixes log
      if (result.imageFixes.length > 0) {
        const imageLogPath = path.join(logsDir, "image-path-fixes.log");
        const imageLogContent = result.imageFixes.map(fix => 
          `File: ${fix.file}\n  Original: ${fix.original}\n  New: ${fix.new}\n  Image: ${fix.image}\n`
        ).join("\n");
        fs.writeFileSync(imageLogPath, `Image Path Fixes (${result.imageFixes.length} total)\n${"=".repeat(80)}\n\n${imageLogContent}`);
        console.log(`   ✅ Fixed ${result.imageFixes.length} image path(s)`);
        console.log(`      📝 Details written to _maintainers/logs/image-path-fixes.log`);
      }
      
      // Write component fixes log
      if (result.componentFixes.length > 0) {
        const componentLogPath = path.join(logsDir, "component-import-fixes.log");
        const componentLogContent = result.componentFixes.map(fix => 
          `File: ${fix.file}\n  Type: ${fix.type}\n  Name: ${fix.name}\n  Path: ${fix.path}\n  Import: ${fix.import}\n`
        ).join("\n");
        fs.writeFileSync(componentLogPath, `Component Import Fixes (${result.componentFixes.length} total)\n${"=".repeat(80)}\n\n${componentLogContent}`);
        console.log(`   ⚠️  Commented out ${result.componentFixes.length} missing component import(s)`);
        console.log(`      📝 Details written to _maintainers/logs/component-import-fixes.log`);
      }
      
      // Write broken links log
      if (result.brokenLinks.length > 0) {
        const linksLogPath = path.join(logsDir, "broken-links-removed.log");
        const linksLogContent = result.brokenLinks.map(({ file, link, text }) => 
          `File: ${file}\n  Link Text: ${text}\n  Broken Link: ${link}\n`
        ).join("\n");
        fs.writeFileSync(linksLogPath, `Broken Links Removed (${result.brokenLinks.length} total)\n${"=".repeat(80)}\n\n${linksLogContent}`);
        console.log(`   ⚠️  Found and removed ${result.brokenLinks.length} broken link(s)`);
        console.log(`      📝 Details written to _maintainers/logs/broken-links-removed.log`);
        // Log first 10 broken links as examples
        const examples = result.brokenLinks.slice(0, 10);
        examples.forEach(({ file, link, text }) => {
          console.log(`      - ${file}: [${text}](${link})`);
        });
        if (result.brokenLinks.length > 10) {
          console.log(`      ... and ${result.brokenLinks.length - 10} more`);
        }
      }
      
      if (result.imageFixes.length === 0 && result.componentFixes.length === 0 && result.brokenLinks.length === 0) {
        console.log(`   ✅ No transformations needed`);
      }
    },
  };
}

module.exports = configDrivenSyncPlugin;
