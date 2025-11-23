#!/bin/bash

# Build and package VS Code extension
# This script builds all dependencies and packages the extension into a .vsix file

set -e  # Exit on error

echo "🚀 Building VS Code Extension..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Step 1: Clean previous builds (but keep node_modules)
echo -e "${YELLOW}📦 Step 1: Cleaning previous builds...${NC}"
npm run clean --workspaces --if-present || true
find packages -name 'tsconfig.tsbuildinfo' -delete || true
rm -f packages/vscode-extension/*.vsix
# Don't remove node_modules here as we need it for building
echo -e "${GREEN}✅ Clean completed${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Build all dependency packages (in correct order)
echo -e "${YELLOW}📦 Step 3: Building dependency packages in order...${NC}"

# Build in dependency order
echo "Building analysis-types..."
npm run build -w @code-review-goose/analysis-types || { echo -e "${RED}❌ Failed to build analysis-types${NC}"; exit 1; }

echo "Building analysis-utils..."
npm run build -w @code-review-goose/analysis-utils || { echo -e "${RED}❌ Failed to build analysis-utils${NC}"; exit 1; }

echo "Building analysis-parser-common..."
npm run build -w @code-review-goose/analysis-parser-common || { echo -e "${RED}❌ Failed to build analysis-parser-common${NC}"; exit 1; }

echo "Building analysis-parser-typescript..."
npm run build -w @code-review-goose/analysis-parser-typescript || { echo -e "${RED}❌ Failed to build analysis-parser-typescript${NC}"; exit 1; }

echo "Building analysis-parser-java..."
npm run build -w @code-review-goose/analysis-parser-java || { echo -e "${RED}❌ Failed to build analysis-parser-java${NC}"; exit 1; }

echo "Building analysis-parser-python..."
npm run build -w @code-review-goose/analysis-parser-python || { echo -e "${RED}❌ Failed to build analysis-parser-python${NC}"; exit 1; }

echo "Building analysis-core..."
npm run build -w @code-review-goose/analysis-core || { echo -e "${RED}❌ Failed to build analysis-core${NC}"; exit 1; }

echo "Building analysis-adapter-vscode..."
npm run build -w @code-review-goose/analysis-adapter-vscode || { echo -e "${RED}❌ Failed to build analysis-adapter-vscode${NC}"; exit 1; }

echo "Building git-analyzer..."
npm run build -w @code-review-goose/git-analyzer || { echo -e "${RED}❌ Failed to build git-analyzer${NC}"; exit 1; }

echo -e "${GREEN}✅ All dependency packages built${NC}"
echo ""

# Step 4: Build VS Code extension
echo -e "${YELLOW}📦 Step 4: Building VS Code extension...${NC}"
cd packages/vscode-extension
npm run build || { echo -e "${RED}❌ Failed to build VS Code extension${NC}"; exit 1; }
echo -e "${GREEN}✅ VS Code extension built${NC}"
echo ""

# Step 5: Ensure LICENSE file exists
if [ ! -f "LICENSE" ]; then
    echo -e "${YELLOW}⚠️  LICENSE not found. Copying from project root...${NC}"
    cp ../../LICENSE . 2>/dev/null || echo -e "${YELLOW}⚠️  Could not copy LICENSE file${NC}"
fi

# Step 6: Package extension (use --no-dependencies to avoid bundling issues)
echo -e "${YELLOW}📦 Step 5: Packaging extension into .vsix file...${NC}"
# Use --no-dependencies flag since we've already built everything
npx vsce package --no-dependencies || { echo -e "${RED}❌ Failed to package extension${NC}"; exit 1; }

# Find the generated .vsix file
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo -e "${RED}❌ Error: .vsix file not found after packaging${NC}"
    exit 1
fi

VSIX_PATH="$(pwd)/$VSIX_FILE"
VSIX_SIZE=$(du -h "$VSIX_PATH" | cut -f1)

echo ""
echo -e "${GREEN}✅ Extension packaged successfully!${NC}"
echo -e "${GREEN}📦 Package: $VSIX_FILE${NC}"
echo -e "${GREEN}📁 Location: $VSIX_PATH${NC}"
echo -e "${GREEN}📊 Size: $VSIX_SIZE${NC}"
echo ""

# Step 7: Verify package contents
echo -e "${YELLOW}🔍 Step 6: Verifying package contents...${NC}"
if command -v unzip &> /dev/null; then
    TEMP_DIR=$(mktemp -d)
    unzip -q "$VSIX_FILE" -d "$TEMP_DIR" 2>/dev/null || true
    
    # Check for essential files
    if [ -f "$TEMP_DIR/extension/package.json" ] && [ -f "$TEMP_DIR/extension/dist/extension.js" ]; then
        echo -e "${GREEN}✅ Package verification passed${NC}"
        echo "  - package.json found"
        echo "  - dist/extension.js found"
    else
        echo -e "${RED}⚠️  Warning: Some essential files may be missing${NC}"
    fi
    
    rm -rf "$TEMP_DIR"
else
    echo -e "${YELLOW}⚠️  unzip not available, skipping verification${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo "To install the extension in VS Code:"
echo "  1. Open VS Code"
echo "  2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
echo "  3. Type 'Extensions: Install from VSIX...'"
echo "  4. Select: $VSIX_PATH"
echo ""
echo "Or use command line:"
echo "  code --install-extension $VSIX_PATH"
echo ""
