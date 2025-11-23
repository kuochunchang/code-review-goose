#!/bin/bash

# Verify VS Code extension package
# This script verifies that the .vsix file is valid and can be installed

set -e

VSIX_FILE="packages/vscode-extension/goose-code-review-vscode-*.vsix"

echo "🔍 Verifying VS Code Extension Package..."
echo ""

# Check if .vsix file exists
if ! ls $VSIX_FILE 1> /dev/null 2>&1; then
    echo "❌ Error: .vsix file not found. Please build the extension first."
    echo "   Run: ./build-vscode-extension.sh"
    exit 1
fi

VSIX_PATH=$(ls -t $VSIX_FILE 2>/dev/null | head -1)
VSIX_SIZE=$(du -h "$VSIX_PATH" | cut -f1)

echo "✅ Found package: $(basename $VSIX_PATH)"
echo "📊 Size: $VSIX_SIZE"
echo ""

# Check if unzip is available
if ! command -v unzip &> /dev/null; then
    echo "⚠️  unzip not available, skipping content verification"
    exit 0
fi

# Verify essential files
echo "🔍 Verifying package contents..."

TEMP_DIR=$(mktemp -d)
unzip -q "$VSIX_PATH" -d "$TEMP_DIR" 2>/dev/null || {
    echo "❌ Error: Failed to extract .vsix file"
    rm -rf "$TEMP_DIR"
    exit 1
}

# Check for essential files
ESSENTIAL_FILES=(
    "extension/package.json"
    "extension/dist/extension.js"
    "extension/LICENSE.txt"
)

ALL_GOOD=true
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$TEMP_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ALL_GOOD=false
    fi
done

# Check package.json for required fields
if [ -f "$TEMP_DIR/extension/package.json" ]; then
    echo ""
    echo "📦 Package information:"
    PACKAGE_NAME=$(grep -o '"name": "[^"]*"' "$TEMP_DIR/extension/package.json" | cut -d'"' -f4)
    PACKAGE_VERSION=$(grep -o '"version": "[^"]*"' "$TEMP_DIR/extension/package.json" | cut -d'"' -f4)
    PACKAGE_PUBLISHER=$(grep -o '"publisher": "[^"]*"' "$TEMP_DIR/extension/package.json" | cut -d'"' -f4)
    
    echo "  Name: $PACKAGE_NAME"
    echo "  Version: $PACKAGE_VERSION"
    echo "  Publisher: $PACKAGE_PUBLISHER"
    
    if [ -z "$PACKAGE_NAME" ] || [ -z "$PACKAGE_VERSION" ] || [ -z "$PACKAGE_PUBLISHER" ]; then
        echo "  ⚠️  Warning: Some required fields may be missing"
    fi
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
if [ "$ALL_GOOD" = true ]; then
    echo "✅ Package verification passed!"
    echo ""
    echo "To install the extension:"
    echo "  code --install-extension $VSIX_PATH"
    echo ""
    echo "Or in VS Code:"
    echo "  1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "  2. Type 'Extensions: Install from VSIX...'"
    echo "  3. Select: $VSIX_PATH"
    exit 0
else
    echo "❌ Package verification failed!"
    exit 1
fi
