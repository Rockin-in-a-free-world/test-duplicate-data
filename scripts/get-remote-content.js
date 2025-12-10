#!/usr/bin/env node

/**
 * Script to download remote content from MetaMask repo
 * Uses docusaurus-plugin-remote-content CLI commands to download content
 * without running a build
 * 
 * Note: This requires docusaurus-plugin-remote-content to be installed
 * and configured in docusaurus.config.js
 */

require("dotenv").config();

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function downloadRemoteContent() {
  console.log("📥 Downloading remote content from MetaMask repository...\n");
  
  const cwd = path.resolve(__dirname, "..");
  
  // Check if docusaurus-plugin-remote-content is installed
  const packageJsonPath = path.join(cwd, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const hasRemoteContentPlugin = 
    (packageJson.dependencies && packageJson.dependencies["docusaurus-plugin-remote-content"]) ||
    (packageJson.devDependencies && packageJson.devDependencies["docusaurus-plugin-remote-content"]);
  
  if (!hasRemoteContentPlugin) {
    console.error("❌ Error: docusaurus-plugin-remote-content plugin is not installed.");
    console.error("   Please install it with: npm install docusaurus-plugin-remote-content");
    console.error("   And configure it in docusaurus.config.js");
    console.error("\n   Alternatively, if you're using git submodules, use: npm run refresh-data");
    process.exit(1);
  }
  
  // Check if plugin is configured in docusaurus.config.js
  const docusaurusConfigPath = path.join(cwd, "docusaurus.config.js");
  if (fs.existsSync(docusaurusConfigPath)) {
    const configContent = fs.readFileSync(docusaurusConfigPath, "utf8");
    if (!configContent.includes("docusaurus-plugin-remote-content")) {
      console.error("❌ Error: docusaurus-plugin-remote-content is installed but not configured in docusaurus.config.js");
      console.error("   Please add the plugin configuration to docusaurus.config.js");
      process.exit(1);
    }
  }
  
  try {
    // Set environment variable to enable remote content download
    process.env.DOWNLOAD_REMOTE_CONTENT = "true";
    
    // Ensure GITHUB_TOKEN is available from .env for authentication
    if (process.env.GITHUB_TOKEN) {
      console.log("✅ GitHub token found in .env");
    } else {
      console.warn("⚠️  Warning: GITHUB_TOKEN not found in .env - may hit rate limits");
    }
    
    // Use the plugin's CLI commands to download content
    // The docusaurus-plugin-remote-content plugin creates CLI commands
    // like: npx docusaurus download-remote-<name>
    const plugins = [
      "metamask-partials",
      "metamask-ethereum",
      "metamask-linea",
      "metamask-base",
      "metamask-concepts",
      "metamask-get-started",
      "metamask-gas-api",
      "metamask-ipfs",
      "metamask-how-to",
      "metamask-tutorials",
    ];
    
    for (const pluginName of plugins) {
      try {
        console.log(`Downloading ${pluginName}...`);
        execSync(`npx docusaurus download-remote-${pluginName}`, {
          stdio: "inherit",
          cwd,
          env: { 
            ...process.env, 
            DOWNLOAD_REMOTE_CONTENT: "true",
            GITHUB_TOKEN: process.env.GITHUB_TOKEN, // Pass token for authentication
          },
        });
      } catch (error) {
        // Some plugins might not have content or might fail, continue with others
        console.warn(`⚠️  Warning: Could not download ${pluginName}`);
      }
    }
    
    console.log("\n✅ Remote content download complete!");
    console.log("   Content is now available in docs/");
    console.log("   Run 'npm run build' to process the content and generate maintainer logs");
    
  } catch (error) {
    console.error("\n❌ Error downloading remote content:", error.message);
    process.exit(1);
  }
}

downloadRemoteContent();
