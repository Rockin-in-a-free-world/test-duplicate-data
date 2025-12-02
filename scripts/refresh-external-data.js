#!/usr/bin/env node

/**
 * Script to refresh external data from MetaMask docs repository
 * This updates the git submodule to get the latest content
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SUBMODULE_PATH = "external-services/downstream-metamask-docs";

function execCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: "utf8", 
      stdio: "pipe",
      ...options 
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

function getCommitHash(submodulePath) {
  try {
    return execCommand(`git -C ${submodulePath} rev-parse HEAD`).trim();
  } catch (error) {
    throw new Error(`Failed to get commit hash: ${error.message}`);
  }
}

function getBranch(submodulePath) {
  try {
    return execCommand(`git -C ${submodulePath} rev-parse --abbrev-ref HEAD`).trim();
  } catch (error) {
    return "detached HEAD";
  }
}

console.log("🔄 Refreshing external data from MetaMask docs repository...\n");

// Check if submodule exists
if (!fs.existsSync(SUBMODULE_PATH)) {
  console.error("❌ Error: Submodule directory not found at", SUBMODULE_PATH);
  console.error("   Run 'git submodule update --init' first to initialize submodules.");
  process.exit(1);
}

// Check if we're in a git repository
try {
  execCommand("git rev-parse --git-dir", { stdio: "ignore" });
} catch (error) {
  console.error("❌ Error: Not in a git repository");
  process.exit(1);
}

// Store the current commit hash for comparison
let currentCommit, currentBranch, newCommit, newBranch;

try {
  currentCommit = getCommitHash(SUBMODULE_PATH);
  currentBranch = getBranch(SUBMODULE_PATH);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}

console.log("📌 Current submodule state:");
console.log(`   Branch: ${currentBranch}`);
console.log(`   Commit: ${currentCommit.substring(0, 7)}...`);
console.log("");

// Update the submodule
console.log("⬇️  Fetching latest changes...");
try {
  execCommand(`git submodule update --remote ${SUBMODULE_PATH}`, { stdio: "inherit" });
} catch (error) {
  console.error("");
  console.error("❌ Error: Failed to update submodule");
  console.error("   This could be due to:");
  console.error("   - Network connectivity issues");
  console.error("   - Authentication problems");
  console.error("   - Repository access issues");
  process.exit(1);
}

// Get the new commit hash
try {
  newCommit = getCommitHash(SUBMODULE_PATH);
  newBranch = getBranch(SUBMODULE_PATH);
} catch (error) {
  console.error("❌ Error: Failed to get updated commit hash:", error.message);
  process.exit(1);
}

// Check if anything changed
if (currentCommit === newCommit) {
  console.log("");
  console.log("✅ Submodule is already up to date");
  console.log("   No changes to pull");
} else {
  console.log("");
  console.log("✅ Successfully updated submodule!");
  console.log(`   Previous commit: ${currentCommit.substring(0, 7)}...`);
  console.log(`   New commit:      ${newCommit.substring(0, 7)}...`);
  console.log("");
  console.log("📝 Next steps:");
  console.log(`   1. Review the changes: git diff ${SUBMODULE_PATH}`);
  console.log(`   2. Commit the update: git add ${SUBMODULE_PATH} && git commit -m 'Update external data from MetaMask docs'`);
  console.log("   3. Rebuild the site: npm run build");
}

console.log("");
console.log("✨ Refresh complete!");

