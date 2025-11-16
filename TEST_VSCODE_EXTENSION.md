# 測試 VS Code 擴展修復

本指南將幫助您在本地測試 OrderController.ts 類圖顯示的修復。

## 🚀 快速測試步驟

### **方法 1: 使用 VS Code 調試 (推薦)**

#### 1. 構建擴展

```bash
cd /home/user/code-review-goose
npm run build
```

#### 2. 在 VS Code 中打開擴展項目

```bash
code /home/user/code-review-goose/packages/vscode-extension
```

#### 3. 啟動擴展調試

1. 在 VS Code 中按 `F5` 或進入 **Run and Debug** (Ctrl+Shift+D)
2. 選擇 **"Run Extension"** 配置
3. 點擊綠色播放按鈕▶️

這將：
- 自動構建擴展
- 啟動新的 VS Code 窗口（Extension Development Host）
- 預設打開 `three-layer` 測試目錄（包含 OrderController.ts）

#### 4. 測試 OrderController.ts

在新打開的 VS Code 窗口中：

1. **打開文件**:
   ```
   controllers/OrderController.ts
   ```

2. **生成類圖** - 使用以下任一方法:
   - **命令面板**:
     - 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
     - 輸入 `Goose Code Review: Generate Class Diagram`
     - 按 Enter

   - **右鍵菜單**:
     - 在編輯器中右鍵點擊
     - 選擇 **"Goose Code Review: Generate Class Diagram"**

3. **查看結果**:
   - 類圖面板應該在右側打開
   - 顯示 OrderController 類及其屬性和方法
   - 默認使用 `depth=0`（單文件分析）

#### 5. 測試不同的 Depth 設置

在類圖面板中，測試不同的深度設置：

- **Depth 0**: 只顯示 OrderController（默認）✅
- **Depth 1**: 嘗試顯示 OrderController + 直接依賴（OrderService, ProductService）
- **Depth 2**: 嘗試顯示更深層的依賴關係
- **Depth 3**: 最深層分析

**預期行為**:
- ✅ Depth 0 應該總是成功
- ⚠️ Depth 1-3 可能失敗（因為測試環境限制）
- ✅ 如果 Depth 1-3 失敗，應該自動回退到 Depth 0 並顯示警告消息

---

### **方法 2: 打包並安裝擴展**

如果您想在實際的 VS Code 環境中測試：

#### 1. 安裝 vsce（VS Code Extension Manager）

```bash
npm install -g @vscode/vsce
```

#### 2. 打包擴展

```bash
cd /home/user/code-review-goose/packages/vscode-extension
vsce package
```

這將生成一個 `.vsix` 文件（例如 `goose-code-review-vscode-0.1.0.vsix`）

#### 3. 安裝擴展

在 VS Code 中：
1. 按 `Ctrl+Shift+P` 打開命令面板
2. 輸入 `Extensions: Install from VSIX...`
3. 選擇生成的 `.vsix` 文件
4. 重啟 VS Code

#### 4. 測試

1. 打開任何包含 TypeScript/JavaScript 代碼的項目
2. 打開 `OrderController.ts` 或其他 TypeScript 文件
3. 使用 `Goose Code Review: Generate Class Diagram` 命令

---

## 🧪 驗證修復的關鍵點

### ✅ **成功指標**

1. **默認行為**:
   - OrderController.ts 打開後立即生成類圖（無需手動設置）
   - 類圖顯示 OrderController 類的完整結構
   - 包含屬性: `orderService`, `productService`
   - 包含方法: `handleCreateOrder`, `handleGetOrderStatus`, 等

2. **錯誤處理**:
   - 如果設置 `depth=1` 失敗，應該看到警告消息
   - 自動回退到 `depth=0` 並顯示單文件類圖
   - 不會出現空白或無響應

3. **調試日誌**:
   - 打開 VS Code 的 Output 面板（View → Output）
   - 選擇 "Extension Host" 或 "Goose Code Review"
   - 應該看到詳細的導入解析日誌

### ❌ **修復前的問題**

修復前的行為（不應再出現）：
- ❌ 類圖面板打開但無內容
- ❌ 錯誤消息但無詳細說明
- ❌ 導入解析失敗但沒有回退機制

---

## 📊 測試場景

### **場景 1: 單文件分析（Depth 0）**

**文件**: `OrderController.ts`
**設置**: Depth = 0
**預期結果**: ✅ 成功顯示 OrderController 類圖

```mermaid
classDiagram
  class OrderController
  OrderController : -orderService OrderService
  OrderController : -productService ProductService
  OrderController : +handleCreateOrder(CreateOrderRequest, Customer) CreateOrderResponse
  OrderController : +handleGetOrderStatus(number) OrderStatusResponse
  ...
```

### **場景 2: 跨文件分析（Depth 1）**

**文件**: `OrderController.ts`
**設置**: Depth = 1, Mode = Bidirectional
**預期結果**:
- 🔄 嘗試解析 OrderService 和 ProductService
- ⚠️ 如果失敗，回退到 Depth 0
- ✅ 顯示警告消息並顯示單文件類圖

### **場景 3: 其他 TypeScript 文件**

測試其他文件以確保通用性：

1. **services/OrderService.ts**
   - 應該顯示 OrderService 類及其依賴

2. **models/Order.ts**
   - 應該顯示 Order 類及其屬性

3. **models/Product.ts**
   - 應該顯示 Product 類

---

## 🐛 故障排除

### **問題 1: 擴展未激活**

**症狀**: 命令面板中找不到 "Goose Code Review" 命令

**解決方案**:
```bash
# 1. 檢查擴展是否已構建
ls /home/user/code-review-goose/packages/vscode-extension/dist/

# 2. 重新構建
cd /home/user/code-review-goose
npm run build

# 3. 重啟 Extension Development Host
```

### **問題 2: 類圖無法顯示**

**症狀**: 面板打開但無內容

**調試步驟**:
1. 打開 VS Code Developer Tools: `Help → Toggle Developer Tools`
2. 查看 Console 標籤中的錯誤
3. 檢查 Output 面板 → Extension Host

**常見原因**:
- TypeScript 編譯錯誤
- 依賴包未安裝
- 文件路徑問題

### **問題 3: Import 解析失敗**

**症狀**: 看到 "Unresolved imports" 日誌

**這是正常的**!
- 修復包含了詳細的調試日誌
- 未解析的導入會被記錄但不會導致失敗
- 擴展會自動回退到單文件分析

**查看日誌**:
```
[VSCodeFileProvider] Resolving import: from="...", to="..."
[VSCodeFileProvider] Import resolved: ...
[CrossFileAnalyzer] Unresolved imports in ...: [...]
```

---

## 📝 測試檢查清單

使用此清單驗證所有功能：

- [ ] **構建成功**: `npm run build` 無錯誤
- [ ] **擴展啟動**: F5 啟動 Extension Development Host
- [ ] **命令可用**: 命令面板中有 Goose Code Review 命令
- [ ] **OrderController 測試**:
  - [ ] 打開 `OrderController.ts`
  - [ ] 生成類圖成功
  - [ ] 類圖顯示所有屬性和方法
  - [ ] Depth 0 工作正常
  - [ ] Depth 1 有回退機制（如果失敗）
- [ ] **其他文件測試**:
  - [ ] OrderService.ts
  - [ ] ProductService.ts
  - [ ] Order.ts
  - [ ] Product.ts
- [ ] **錯誤處理**:
  - [ ] 有友好的錯誤消息
  - [ ] 自動回退機制工作
  - [ ] 調試日誌清晰
- [ ] **UI 測試**:
  - [ ] 類圖面板正確渲染
  - [ ] Depth 選擇器可用
  - [ ] Mode 選擇器可用
  - [ ] Refresh 按鈕工作

---

## 🎯 成功標準

修復成功的標誌：

✅ **OrderController.ts 在 VS Code 擴展中正確顯示**
✅ **默認使用 Depth 0（與 Web 界面一致）**
✅ **跨文件分析失敗時有優雅降級**
✅ **用戶看到清晰的錯誤消息和建議**
✅ **調試日誌幫助診斷問題**

---

## 📞 需要幫助？

如果遇到問題：

1. **檢查日誌**:
   - VS Code Output 面板
   - Developer Tools Console

2. **驗證構建**:
   ```bash
   cd /home/user/code-review-goose
   npm run build
   ```

3. **檢查依賴**:
   ```bash
   npm install
   ```

4. **查看提交**: 檢查最新提交 `d411f8f` 中的更改

---

**祝測試順利！** 🚀
