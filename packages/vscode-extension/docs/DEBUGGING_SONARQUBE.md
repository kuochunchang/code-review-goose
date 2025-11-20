# SonarQube 掃描調試指南

## 問題：掃描瞬間完成但沒有發現問題

如果 SonarQube 掃描幾乎瞬間完成，且沒有發現任何問題，可能是以下原因：

## 🔍 診斷步驟

### 1. 檢查 Console 日誌

在 VS Code 中：
1. 打開 **View** → **Output**
2. 選擇 **Goose Code Review**
3. 查找以下日誌：

```
[SonarQube] Starting scan with config: {
  serverUrl: 'http://localhost:9000',
  projectKey: 'your-project',
  sources: '.',
  baseDir: '/path/to/your/project'
}
[SonarQube] Scanner completed successfully in XXX ms
```

如果掃描時間 < 1000ms，很可能出問題了。

### 2. 檢查配置

#### 檢查 `sonar.sources` 配置

預設值是 `.`（當前目錄），如果這個路徑不正確，Scanner 可能掃描不到文件。

```json
{
  "gooseCodeReview.sonarqube.sources": "src" // 或其他源碼目錄
}
```

#### 檢查 `sonar.projectBaseDir`

確保設置為正確的專案根目錄：

```typescript
'sonar.projectBaseDir': options.workingDirectory
```

### 3. 手動運行 Scanner 測試

創建臨時測試腳本：

```javascript
// test-scanner.js
const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: 'http://localhost:9000',
    token: 'your-token',
    options: {
      'sonar.projectKey': 'test-project',
      'sonar.sources': '.',
      'sonar.projectBaseDir': process.cwd(),
      'sonar.verbose': 'true', // 啟用詳細日誌
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

### 4. 檢查 SonarQube Server 日誌

登入 SonarQube Server：
1. 進入 **Administration** → **System** → **System Info**
2. 查看 **Compute Engine** 狀態
3. 檢查最近的分析任務

### 5. 檢查專案是否存在

在 SonarQube Server：
1. 確認專案已創建（Projects 列表）
2. 檢查專案 Key 是否正確
3. 查看專案的分析歷史

## 🐛 常見問題

### 問題 1: Scanner 沒有真正執行

**症狀**: 掃描瞬間完成（<500ms），沒有日誌輸出

**可能原因**:
- `sonarqube-scanner` npm 包沒有正確安裝
- Scanner callback 沒有被正確調用
- Promise 沒有正確等待

**解決方法**:
```bash
# 重新安裝 scanner
cd packages/git-analyzer
npm install sonarqube-scanner@latest
```

### 問題 2: 掃描的是錯誤的目錄

**症狀**: Scanner 執行了但沒有發現源碼文件

**可能原因**:
- `sonar.sources` 配置錯誤
- `sonar.projectBaseDir` 未設置或錯誤

**解決方法**:
```json
{
  "gooseCodeReview.sonarqube.sources": "src,lib", // 指定正確的源碼目錄
  "gooseCodeReview.sonarqube.exclusions": "**/node_modules/**,**/dist/**"
}
```

### 問題 3: SonarQube Server 處理延遲

**症狀**: Scanner 完成但 SonarQube Server 還在處理

**可能原因**:
- Server 處理需要時間
- 預設等待時間（2秒）不夠

**解決方法**:
增加等待時間：

```typescript
// 在 git-analysis-service.ts 中
await new Promise(resolve => setTimeout(resolve, 5000)); // 改為 5 秒
```

或使用輪詢檢查分析狀態。

### 問題 4: 文件被排除

**症狀**: 某些文件沒有被分析

**可能原因**:
- `.gitignore` 中的文件自動被排除
- `sonar.exclusions` 配置過於寬泛

**解決方法**:
檢查並調整 exclusions 配置：

```json
{
  "gooseCodeReview.sonarqube.exclusions": "node_modules/**,dist/**,build/**,coverage/**,**/*.test.ts"
}
```

### 問題 5: Scanner 找不到二進制文件

**症狀**: Error: "Cannot find sonar-scanner executable"

**可能原因**:
- `sonarqube-scanner` npm 包版本問題
- Scanner 二進制文件下載失敗

**解決方法**:
```bash
# 清除緩存並重新安裝
rm -rf node_modules/sonarqube-scanner
npm install sonarqube-scanner@4.3.2

# 或手動下載 SonarQube Scanner
# https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/
```

## 🔧 調試配置

### 啟用詳細日誌

在 SonarQube 配置中添加：

```json
{
  "gooseCodeReview.sonarqube.additionalProperties": {
    "sonar.verbose": "true",
    "sonar.log.level": "DEBUG"
  }
}
```

### 檢查實際掃描的文件

Scanner 會輸出掃描的文件列表，查看日誌確認：

```
INFO: Indexing files...
INFO: Project configuration:
INFO:   Source paths: src
INFO:   Exclusions: node_modules/**,dist/**
INFO: 123 files indexed
```

### 使用 SonarQube Server UI 驗證

1. 登入 SonarQube Server
2. 進入你的專案
3. 查看 **Code** 標籤
4. 檢查是否有源碼文件列表
5. 查看 **Issues** 標籤

## 📊 預期行為

正常的掃描應該：

1. **執行時間**: 10秒 - 3分鐘（取決於專案大小）
2. **日誌輸出**: 大量 INFO 級別日誌
3. **Server 響應**: 可在 SonarQube UI 看到新的分析
4. **Issue 數量**: 實際的代碼問題（可能為 0，但應該有 metrics）

## 🧪 測試腳本

使用提供的測試腳本：

```bash
cd packages/git-analyzer
npm run test:scanner
```

這會：
1. 測試 SonarQube 連接
2. 執行真實掃描
3. 獲取並顯示結果

## 📝 收集診斷信息

如果問題持續，收集以下信息：

1. VS Code Output 面板的完整日誌
2. SonarQube Server 版本
3. 專案結構（`tree -L 2`）
4. 配置文件內容（隱藏 token）
5. Scanner 執行時間

## 🆘 尋求幫助

如果以上方法都無法解決問題，請提供：

- VS Code 版本
- Extension 版本
- SonarQube Server 版本
- 完整的錯誤日誌
- 配置文件（隱藏敏感信息）

---

**最後更新**: 2025-01-20

