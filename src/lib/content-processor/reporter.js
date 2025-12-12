/**
 * Reporter Module
 * Handles writing maintainer logs to _maintainers/logs/
 */

const fs = require("fs");
const path = require("path");

/**
 * Write all transformation reports to maintainer logs
 */
function writeReports(results, logsDir) {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Write image fixes log
  if (results.imageFixes.length > 0) {
    const imageLogPath = path.join(logsDir, "image-path-fixes.log");
    const imageLogContent = results.imageFixes.map(fix => 
      `File: ${fix.file}\n  Original: ${fix.original}\n  New: ${fix.new}\n  Image: ${fix.image}\n`
    ).join("\n");
    fs.writeFileSync(imageLogPath, `Image Path Fixes (${results.imageFixes.length} total)\n${"=".repeat(80)}\n\n${imageLogContent}`);
    console.log(`   ✅ Fixed ${results.imageFixes.length} image path(s)`);
    console.log(`      📝 Details written to _maintainers/logs/image-path-fixes.log`);
  }
  
  // Write component fixes log
  if (results.componentFixes.length > 0) {
    const componentLogPath = path.join(logsDir, "component-import-fixes.log");
    const componentLogContent = results.componentFixes.map(fix => 
      `File: ${fix.file}\n  Type: ${fix.type}\n  Name: ${fix.name}\n  Path: ${fix.path}\n  Import: ${fix.import}\n`
    ).join("\n");
    fs.writeFileSync(componentLogPath, `Component Import Fixes (${results.componentFixes.length} total)\n${"=".repeat(80)}\n\n${componentLogContent}`);
    console.log(`   ⚠️  Commented out ${results.componentFixes.length} missing component import(s)`);
    console.log(`      📝 Details written to _maintainers/logs/component-import-fixes.log`);
  }
  
  // Write broken links log
  if (results.brokenLinks.length > 0) {
    const linksLogPath = path.join(logsDir, "broken-links-removed.log");
    const linksLogContent = results.brokenLinks.map(({ file, link, text }) => 
      `File: ${file}\n  Link Text: ${text}\n  Broken Link: ${link}\n`
    ).join("\n");
    fs.writeFileSync(linksLogPath, `Broken Links Removed (${results.brokenLinks.length} total)\n${"=".repeat(80)}\n\n${linksLogContent}`);
    console.log(`   ⚠️  Found and removed ${results.brokenLinks.length} broken link(s)`);
    console.log(`      📝 Details written to _maintainers/logs/broken-links-removed.log`);
    // Log first 10 broken links as examples
    const examples = results.brokenLinks.slice(0, 10);
    examples.forEach(({ file, link, text }) => {
      console.log(`      - ${file}: [${text}](${link})`);
    });
    if (results.brokenLinks.length > 10) {
      console.log(`      ... and ${results.brokenLinks.length - 10} more`);
    }
  }
  
  if (results.imageFixes.length === 0 && results.componentFixes.length === 0 && results.brokenLinks.length === 0) {
    console.log(`   ✅ No transformations needed`);
  }
}

module.exports = {
  writeReports,
};

