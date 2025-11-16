# 🧪 本地測試總結

## ✅ 自動驗證結果

剛才運行的自動驗證腳本已確認：

✓ **所有修復文件存在**
✓ **默認 depth 設置為 0**（與 Web 界面一致）
✓ **錯誤處理回退機制已添加**
✓ **調試日誌已配置**
✓ **構建成功無錯誤**

---

## 🚀 三種測試方法

### **方法 1: VS Code 調試模式（最推薦）** ⭐

**最簡單、最快速的測試方式**

```bash
# 1. 打開 VS Code 擴展項目
code /home/user/code-review-goose/packages/vscode-extension

# 2. 在 VS Code 中按 F5
# 這會自動：
#   - 構建擴展
#   - 啟動新的 VS Code 窗口
#   - 預設打開 three-layer 測試目錄
#   - OrderController.ts 就在 controllers/ 目錄中
```

**測試步驟：**
1. 在新窗口中打開 `controllers/OrderController.ts`
2. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）
3. 輸入並選擇 `Goose Code Review: Generate Class Diagram`
4. 查看類圖是否正確顯示 ✅

**預期結果：**
- 類圖面板在右側打開
- 顯示 OrderController 類
- 包含所有屬性和方法
- Depth 默認為 0

---

### **方法 2: 快速驗證腳本**

**檢查所有修復是否正確應用**

```bash
cd /home/user/code-review-goose
./test-vscode-fix.sh
```

這會檢查：
- ✓ Git 分支
- ✓ 依賴安裝
- ✓ 構建狀態
- ✓ 修復文件存在
- ✓ 關鍵修復點

---

### **方法 3: 打包安裝（生產環境測試）**

**在實際 VS Code 環境中測試**

```bash
# 1. 安裝打包工具
npm install -g @vscode/vsce

# 2. 打包擴展
cd /home/user/code-review-goose/packages/vscode-extension
vsce package

# 3. 在 VS Code 中安裝
# Command Palette → Extensions: Install from VSIX...
# 選擇生成的 .vsix 文件
```

---

## 📋 測試清單

使用以下清單確保完整測試：

### **基本功能**
- [ ] 擴展成功啟動
- [ ] 命令出現在命令面板中
- [ ] OrderController.ts 生成類圖成功
- [ ] 類圖顯示完整（屬性 + 方法）

### **Depth 設置測試**
- [ ] Depth 0 (默認) - 單文件分析 ✅
- [ ] Depth 1 - 嘗試跨文件分析
  - 如果成功：顯示依賴類
  - 如果失敗：自動回退到 Depth 0 並顯示警告 ⚠️
- [ ] Depth 2-3 - 更深層分析（同上）

### **錯誤處理**
- [ ] 跨文件分析失敗時顯示友好消息
- [ ] 自動回退到單文件分析
- [ ] 調試日誌清晰可讀

### **其他文件測試**
- [ ] OrderService.ts
- [ ] ProductService.ts
- [ ] Order.ts
- [ ] Product.ts

---

## 🐛 故障排除

### **問題：找不到命令**

```bash
# 重新構建
cd /home/user/code-review-goose
npm run build

# 重啟 Extension Development Host (F5)
```

### **問題：類圖不顯示**

1. **打開開發者工具**:
   - Help → Toggle Developer Tools
   - 查看 Console 錯誤

2. **查看擴展日誌**:
   - View → Output
   - 選擇 "Extension Host"

3. **查看調試日誌**:
   ```
   [VSCodeFileProvider] Resolving import: ...
   [CrossFileAnalyzer] Unresolved imports: ...
   ```

### **問題：導入解析失敗**

**這是正常的！**
- 修復包含了自動回退機制
- 導入失敗會記錄日誌但不會導致崩潰
- 會自動顯示單文件類圖

---

## 📊 成功標準

測試成功的標誌：

✅ **OrderController.ts 正確顯示**
✅ **默認使用 Depth 0**
✅ **跨文件失敗時優雅降級**
✅ **錯誤消息清晰有用**
✅ **調試日誌詳細**

---

## 📚 詳細文檔

查看完整測試指南：
```bash
cat /home/user/code-review-goose/TEST_VSCODE_EXTENSION.md
```

---

## 🎯 快速開始

**最快的測試方法（1分鐘）**:

```bash
# 1. 驗證修復
cd /home/user/code-review-goose
./test-vscode-fix.sh

# 2. 啟動調試
code /home/user/code-review-goose/packages/vscode-extension
# 然後按 F5

# 3. 測試 OrderController.ts
# 在新窗口中:
# - 打開 controllers/OrderController.ts
# - Ctrl+Shift+P → Generate Class Diagram
# - 查看結果 ✅
```

**就這麼簡單！** 🚀

---

## 📞 需要幫助？

- **查看詳細指南**: `TEST_VSCODE_EXTENSION.md`
- **運行驗證腳本**: `./test-vscode-fix.sh`
- **查看提交**: `git show d411f8f`
- **查看修改**: `git diff HEAD~1`

祝測試順利！ 🎉
