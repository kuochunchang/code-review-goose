#!/bin/bash

# 顏色設置
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VS Code 擴展修復測試腳本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 步驟 1: 檢查當前分支
echo -e "${YELLOW}[1/5] 檢查 Git 分支...${NC}"
current_branch=$(git branch --show-current)
echo "當前分支: $current_branch"

if [[ "$current_branch" != "claude/fix-ordercontroller-diagram-01WyVmFMzdeWufYzn48z1QpP" ]]; then
    echo -e "${RED}⚠️  警告: 不在修復分支上${NC}"
    echo "建議切換到: claude/fix-ordercontroller-diagram-01WyVmFMzdeWufYzn48z1QpP"
    read -p "是否繼續？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo -e "${GREEN}✓ 分支檢查完成${NC}"
echo ""

# 步驟 2: 清理並安裝依賴
echo -e "${YELLOW}[2/5] 安裝依賴...${NC}"
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 依賴安裝成功${NC}"
else
    echo -e "${RED}✗ 依賴安裝失敗${NC}"
    exit 1
fi
echo ""

# 步驟 3: 構建所有包
echo -e "${YELLOW}[3/5] 構建項目...${NC}"
npm run build 2>&1 | tail -5
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 構建成功${NC}"
else
    echo -e "${RED}✗ 構建失敗${NC}"
    echo "請查看上方錯誤信息"
    exit 1
fi
echo ""

# 步驟 4: 檢查修復的文件
echo -e "${YELLOW}[4/5] 驗證修復文件...${NC}"

files=(
    "packages/vscode-extension/src/views/diagram-panel.ts"
    "packages/vscode-extension/src/commands/generate-class-diagram.ts"
    "packages/analysis-adapter-vscode/src/vscode-file-provider.ts"
    "packages/analysis-core/src/analyzers/CrossFileAnalyzer.ts"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file ${RED}(缺失)${NC}"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo -e "${RED}部分文件缺失，請檢查${NC}"
    exit 1
fi
echo ""

# 步驟 5: 檢查關鍵修復
echo -e "${YELLOW}[5/5] 檢查關鍵修復...${NC}"

# 檢查默認 depth 設置
echo -n "檢查 diagram-panel.ts 默認 depth... "
if grep -q "depth: 0" packages/vscode-extension/src/views/diagram-panel.ts; then
    echo -e "${GREEN}✓ depth=0 (正確)${NC}"
else
    echo -e "${RED}✗ depth 設置不正確${NC}"
fi

echo -n "檢查 generate-class-diagram.ts 默認 depth... "
if grep -q "depth: 0" packages/vscode-extension/src/commands/generate-class-diagram.ts; then
    echo -e "${GREEN}✓ depth=0 (正確)${NC}"
else
    echo -e "${RED}✗ depth 設置不正確${NC}"
fi

# 檢查錯誤處理
echo -n "檢查錯誤處理回退機制... "
if grep -q "fallbackUsed" packages/vscode-extension/src/views/diagram-panel.ts; then
    echo -e "${GREEN}✓ 回退機制已添加${NC}"
else
    echo -e "${RED}✗ 回退機制缺失${NC}"
fi

# 檢查調試日誌
echo -n "檢查導入解析日誌... "
if grep -q "VSCodeFileProvider.*Resolving import" packages/analysis-adapter-vscode/src/vscode-file-provider.ts; then
    echo -e "${GREEN}✓ 調試日誌已添加${NC}"
else
    echo -e "${RED}✗ 調試日誌缺失${NC}"
fi

echo -n "檢查跨文件分析日誌... "
if grep -q "CrossFileAnalyzer.*Unresolved imports" packages/analysis-core/src/analyzers/CrossFileAnalyzer.ts; then
    echo -e "${GREEN}✓ 分析日誌已添加${NC}"
else
    echo -e "${RED}✗ 分析日誌缺失${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ 所有檢查通過！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo ""
echo -e "  1. ${BLUE}在 VS Code 中測試:${NC}"
echo "     code /home/user/code-review-goose/packages/vscode-extension"
echo "     然後按 F5 啟動擴展調試"
echo ""
echo -e "  2. ${BLUE}測試 OrderController.ts:${NC}"
echo "     在 Extension Development Host 中:"
echo "     - 打開: controllers/OrderController.ts"
echo "     - 執行: Ctrl+Shift+P → 'Generate Class Diagram'"
echo ""
echo -e "  3. ${BLUE}查看詳細測試指南:${NC}"
echo "     cat TEST_VSCODE_EXTENSION.md"
echo ""
echo -e "${GREEN}祝測試順利！🚀${NC}"
