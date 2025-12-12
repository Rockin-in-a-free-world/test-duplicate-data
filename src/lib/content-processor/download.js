#!/usr/bin/env node

/**
 * Download Module
 * Handles downloading remote content from MetaMask repo using docusaurus-plugin-remote-content
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const PLUGINS = [
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

/**
 * Download remote content using docusaurus-plugin-remote-content CLI commands
 */
function downloadRemoteContent(projectRoot) {
  console.log("📥 Downloading remote content from MetaMask repository...\n");
  
  // Check if docusaurus-plugin-remote-content is installed
  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const hasRemoteContentPlugin = 
    (packageJson.dependencies && packageJson.dependencies["docusaurus-plugin-remote-content"]) ||
    (packageJson.devDependencies && packageJson.devDependencies["docusaurus-plugin-remote-content"]);
  
  if (!hasRemoteContentPlugin) {
    throw new Error("docusaurus-plugin-remote-content plugin is not installed. Please install it with: npm install docusaurus-plugin-remote-content");
  }
  
  // Check if plugin is configured in docusaurus.config.js
  const docusaurusConfigPath = path.join(projectRoot, "docusaurus.config.js");
  if (fs.existsSync(docusaurusConfigPath)) {
    const configContent = fs.readFileSync(docusaurusConfigPath, "utf8");
    if (!configContent.includes("docusaurus-plugin-remote-content")) {
      throw new Error("docusaurus-plugin-remote-content is installed but not configured in docusaurus.config.js");
    }
  }
  
  // Ensure GITHUB_TOKEN is available from .env for authentication
  if (process.env.GITHUB_TOKEN) {
    console.log("✅ GitHub token found in .env");
  } else {
    console.warn("⚠️  Warning: GITHUB_TOKEN not found in .env - may hit rate limits");
  }
  
  // Download each plugin's content
  for (const pluginName of PLUGINS) {
    try {
      console.log(`Downloading ${pluginName}...`);
      execSync(`npx docusaurus download-remote-${pluginName}`, {
        stdio: "inherit",
        cwd: projectRoot,
        env: { 
          ...process.env, 
          DOWNLOAD_REMOTE_CONTENT: "true",
          GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        },
      });
    } catch (error) {
      // Some plugins might not have content or might fail, continue with others
      console.warn(`⚠️  Warning: Could not download ${pluginName}`);
    }
  }
  
  console.log("\n✅ Remote content download complete!");
  return true;
}

module.exports = {
  downloadRemoteContent,
};

