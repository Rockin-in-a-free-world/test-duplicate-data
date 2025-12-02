#!/bin/bash

# Script to refresh external data from MetaMask docs repository
# This updates the git submodule to get the latest content

set -e  # Exit on error

echo "🔄 Refreshing external data from MetaMask docs repository..."
echo ""

# Get the submodule path
SUBMODULE_PATH="external-services/downstream-metamask-docs"

# Check if submodule exists
if [ ! -d "$SUBMODULE_PATH" ]; then
    echo "❌ Error: Submodule directory not found at $SUBMODULE_PATH"
    echo "   Run 'git submodule update --init' first to initialize submodules."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Store the current commit hash for comparison
cd "$SUBMODULE_PATH"
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
cd - > /dev/null

echo "📌 Current submodule state:"
echo "   Branch: $CURRENT_BRANCH"
echo "   Commit: $CURRENT_COMMIT"
echo ""

# Update the submodule
echo "⬇️  Fetching latest changes..."
if ! git submodule update --remote "$SUBMODULE_PATH"; then
    echo ""
    echo "❌ Error: Failed to update submodule"
    echo "   This could be due to:"
    echo "   - Network connectivity issues"
    echo "   - Authentication problems"
    echo "   - Repository access issues"
    exit 1
fi

# Get the new commit hash
cd "$SUBMODULE_PATH"
NEW_COMMIT=$(git rev-parse HEAD)
NEW_BRANCH=$(git rev-parse --abbrev-ref HEAD)
cd - > /dev/null

# Check if anything changed
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo ""
    echo "✅ Submodule is already up to date"
    echo "   No changes to pull"
else
    echo ""
    echo "✅ Successfully updated submodule!"
    echo "   Previous commit: $CURRENT_COMMIT"
    echo "   New commit:      $NEW_COMMIT"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Review the changes: git diff $SUBMODULE_PATH"
    echo "   2. Commit the update: git add $SUBMODULE_PATH && git commit -m 'Update external data from MetaMask docs'"
    echo "   3. Rebuild the site: npm run build"
fi

echo ""
echo "✨ Refresh complete!"

