#!/usr/bin/env node

/**
 * Script to download remote content from MetaMask repo
 * Uses the modular download module from src/lib/content-processor
 */

require("dotenv").config();

const path = require("path");
const { downloadRemoteContent } = require("../src/lib/content-processor/download");

const projectRoot = path.resolve(__dirname, "..");

try {
  downloadRemoteContent(projectRoot);
  console.log("   Content is now available in docs/");
  console.log("   Run 'npm run build' to process the content and generate maintainer logs");
} catch (error) {
  console.error("\n❌ Error downloading remote content:", error.message);
  process.exit(1);
}
