# SonarQube Scanner 故障排除

## 🚨 症狀：掃描瞬間完成且沒有發現問題

如果你遇到這個問題，請按照以下步驟診斷。

## 🧪 第一步：使用測試命令

1. 打開命令面板 (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. 運行：**`Goose Code Review: Test SonarQube Scanner (Debug)`**
3. 查看 "SonarQube Test" output 面板

### 預期結果

正常情況下應該看到：

```
=== SonarQube Scanner Test ===

Working directory: /path/to/your/project

Configuration:
  Server URL: http://localhost:9000
  Project Key: your-project
  Sources: .

Step 1: Testing connection...
✓ Connected (v9.9.0, 45ms)

Step 2: Executing scanner...
This may take 10-60 seconds depending on project size...
[SonarQube] Starting scan with config:
  Server URL: http://localhost:9000
  Project Key: your-project
  Sources: .
  Base Dir: /path/to/your/project
[SonarQube] Scanner completed successfully in 23456ms

=== Scan Result ===
Success: true
Duration: 23456ms

✓ Scanner execution time looks normal

Step 3: Fetching analysis results...
...
```

### 異常情況

如果看到：

```
Duration: 123ms

⚠️ WARNING: Scan completed in less than 1 second!
This is unusually fast and may indicate the scanner did not actually execute.
```

表示 Scanner 沒有真正執行，繼續下面的步驟。

## 🔍 第二步：檢查日誌

### 1. VS Code Output 面板

1. View → Output
2. 選擇 "Goose Code Review"
3. 查找 `[SonarQube]` 開頭的訊息

### 2. 應該看到的日誌

```
[SonarQube] Starting scan with config:
[SonarQube] Scanner completed successfully in XXXXms
```

如果沒有這些日誌，表示代碼沒有執行到 Scanner 部分。

## 🛠️ 第三步：檢查配置

### 檢查 SonarQube 連接

運行：**`Goose Code Review: Test SonarQube Connection`**

應該顯示連接成功。

### 檢查專案綁定

Settings → 搜尋 `gooseCodeReview.sonarqube.projectBinding`

應該有：
```json
{
  "connectionId": "your-connection",
  "projectKey": "your-project"
}
```

### 檢查 Sources 配置

Settings → 搜尋 `gooseCodeReview.sonarqube.sources`

預設是 `.`（當前目錄），如果你的源碼在其他目錄，需要設置：

```json
{
  "gooseCodeReview.sonarqube.sources": "src"
}
```

## 🐛 第四步：手動測試 Scanner

創建測試腳本 `test-scanner.js`:

```javascript
const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: 'http://localhost:9000',
    token: 'your-token',
    options: {
      'sonar.projectKey': 'test-project',
      'sonar.sources': '.',
      'sonar.verbose': 'true',
    },
  },
  (error) => {
    if (error) {
      console.error('Scanner failed:', error);
    } else {
      console.log('Scanner completed');
    }
  }
);
```

運行：
```bash
node test-scanner.js
```

這會顯示 Scanner 的詳細輸出。

## 📋 常見問題和解決方案

### 問題 1: sonarqube-scanner 未安裝

**症狀**: `Cannot find module 'sonarqube-scanner'`

**解決方法**:
```bash
cd packages/git-analyzer
npm install sonarqube-scanner@4.3.2
```

### 問題 2: Scanner 二進制文件缺失

**症狀**: `Cannot find sonar-scanner executable`

**解決方法**:
```bash
# 清除並重新安裝
rm -rf node_modules/sonarqube-scanner
npm install
```

### 問題 3: 配置未正確傳遞

**症狀**: Scanner 執行但沒有掃描任何文件

**檢查**:
- `sonar.projectBaseDir` 是否正確
- `sonar.sources` 是否指向正確的目錄
- 文件是否被 `sonar.exclusions` 排除

**解決方法**:
```json
{
  "gooseCodeReview.sonarqube.sources": "src,lib",
  "gooseCodeReview.sonarqube.exclusions": "**/node_modules/**,**/dist/**,**/build/**"
}
```

### 問題 4: SonarQube Server 延遲

**症狀**: Scanner 完成但獲取結果失敗

**解決方法**:

增加等待時間（需要修改代碼）：

在 `git-analysis-service.ts` 中：
```typescript
// 從 2 秒改為 5 秒
await new Promise(resolve => setTimeout(resolve, 5000));
```

### 問題 5: Token 權限不足

**症狀**: `403 Forbidden` 或 `Insufficient privileges`

**解決方法**:

確保 Token 有以下權限：
- Execute Analysis
- Browse (至少)

重新生成 Token 並更新。

## 📊 驗證 Scanner 是否真的執行

### 方法 1: 檢查執行時間

正常掃描時間：
- 小型專案: 10-30 秒
- 中型專案: 30-60 秒
- 大型專案: 1-3 分鐘

如果 < 1 秒，很可能沒有執行。

### 方法 2: 檢查 SonarQube Server

1. 登入 SonarQube UI
2. 進入 Projects
3. 查看你的專案
4. 檢查最近的分析時間是否更新

### 方法 3: 檢查進程

掃描時查看進程：
```bash
ps aux | grep sonar-scanner
```

應該看到正在運行的 sonar-scanner 進程。

## 🆘 仍然無法解決？

收集以下信息：

1. **Output 面板日誌** (Goose Code Review)
2. **SonarQube Test 結果**
3. **配置文件**:
   ```bash
   code ~/.config/Code/User/settings.json
   ```
4. **SonarQube Server 版本**
5. **專案結構**:
   ```bash
   tree -L 2 -I 'node_modules'
   ```
6. **手動 Scanner 測試結果**

## 📚 相關命令

| 命令 | 用途 |
|------|------|
| `Test SonarQube Connection` | 測試服務器連接 |
| `Test SonarQube Scanner (Debug)` | 完整掃描測試 |
| `Add SonarQube Connection` | 添加新連接 |
| `Bind to SonarQube Project` | 綁定專案 |

---

**最後更新**: 2025-01-20

