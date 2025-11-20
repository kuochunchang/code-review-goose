# SonarQube 分析流程說明

## 📋 概述

Goose Code Review 現在會**真正執行** SonarQube 掃描，而不只是讀取已有的結果。

## 🔄 完整分析流程

### 1. 工作區變更分析（Working Directory Analysis）

```
用戶觸發分析
    ↓
檢測分析模式（HYBRID/AI_ONLY/SONARQUBE_ONLY）
    ↓
獲取未提交的變更文件列表
    ↓
AI 分析（如果啟用）
    ↓
SonarQube 分析（如果啟用）：
    ├─ 執行 sonar-scanner 掃描整個項目
    ├─ 等待 SonarQube Server 處理結果（2秒）
    └─ 獲取變更文件相關的 issues
    ↓
合併 AI + SonarQube 結果
    ↓
顯示分析報告
```

### 2. 分支對比分析（Branch Comparison）

```
用戶觸發分支對比
    ↓
檢測分析模式
    ↓
獲取兩個分支間的差異文件
    ↓
AI 分析（如果啟用）
    ↓
SonarQube 分析（如果啟用）：
    ├─ 執行 sonar-scanner 掃描
    ├─ 等待處理
    └─ 獲取變更文件的 issues
    ↓
合併結果
    ↓
顯示報告
```

## 🛠️ SonarQube Scanner 執行細節

### Scanner 配置

執行 `sonar-scanner` 時使用的配置：

```javascript
{
  serverUrl: 'http://localhost:9000',
  token: 'your-token',
  options: {
    'sonar.projectKey': 'your-project-key',
    'sonar.projectName': 'Your Project Name',
    'sonar.projectVersion': '1.0',
    'sonar.sources': '.',
    'sonar.exclusions': 'node_modules/**,dist/**,build/**,coverage/**',
    'sonar.sourceEncoding': 'UTF-8'
  }
}
```

### 執行步驟

1. **驗證 SonarQube Server 可用性**
   - 測試連接
   - 檢查版本
   - 驗證 token

2. **執行掃描**
   - 調用 `sonarqube-scanner` npm 包
   - 掃描整個項目目錄
   - 上傳結果到 SonarQube Server

3. **等待處理**
   - SonarQube Server 需要時間處理掃描結果
   - 默認等待 2 秒（可配置）

4. **獲取結果**
   - 調用 SonarQube Web API
   - 只獲取變更文件相關的 issues
   - 包含 metrics 和 quality gate 狀態

## 📊 結果過濾

### 為什麼要過濾？

- SonarQube 掃描整個項目，但我們只關心**變更的文件**
- 避免顯示大量無關的 issues
- 提高分析效率和相關性

### 過濾邏輯

```typescript
// 1. 獲取變更的文件
const changes = await gitService.getWorkingDirectoryChanges();
const changedFilePaths = changes.files.map(f => f.path);
// 例如：['src/app.ts', 'src/utils.ts']

// 2. 構建 SonarQube component keys
const componentKeys = changedFilePaths.map(
  (filePath) => `${projectKey}:${filePath}`
);
// 例如：['my-project:src/app.ts', 'my-project:src/utils.ts']

// 3. 調用 SonarQube API 只獲取這些文件的 issues
GET /api/issues/search?componentKeys=my-project:src/app.ts,my-project:src/utils.ts
```

## ⚙️ 配置選項

### VS Code Settings

```json
{
  // SonarQube 連接配置
  "gooseCodeReview.sonarqube.connections": [
    {
      "connectionId": "local",
      "serverUrl": "http://localhost:9000"
    }
  ],
  
  // 項目綁定
  "gooseCodeReview.sonarqube.projectBinding": {
    "connectionId": "local",
    "projectKey": "my-project"
  },
  
  // 分析模式
  "gooseCodeReview.gitAnalysis.mode": "hybrid", // hybrid | ai-only | sonarqube-only
  
  // Scanner 配置（可選）
  "gooseCodeReview.sonarqube.sources": ".",
  "gooseCodeReview.sonarqube.exclusions": "node_modules/**,dist/**",
  "gooseCodeReview.sonarqube.timeout": 5000 // Scanner 超時（毫秒）
}
```

### 環境變量（可選）

```bash
# SonarQube Scanner 可以使用這些環境變量
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=your-token
export SONAR_SCANNER_OPTS="-Xmx512m"
```

## 🚨 錯誤處理

### 優雅降級機制

如果 SonarQube 分析失敗，系統會：

1. **記錄錯誤**
2. **顯示警告訊息**
3. **自動切換到 AI-only 模式**
4. **繼續完成分析**

```typescript
try {
  // 執行 SonarQube 掃描
  const scanResult = await sqService.executeScan(...);
  
  if (!scanResult.success) {
    throw new Error(`SonarQube scan failed: ${scanResult.error}`);
  }
  
  // 獲取結果
  sonarQubeResult = await getSonarQubeResultsForChangedFiles(...);
  
} catch (error) {
  // 降級到 AI-only
  console.error('SonarQube analysis failed:', error);
  progress?.(`Continuing with AI-only analysis...`);
  // 分析繼續進行，只是不包含 SonarQube 結果
}
```

### 常見錯誤

| 錯誤 | 原因 | 解決方法 |
|------|------|----------|
| `SonarQube server is not available` | Server 未啟動或 URL 錯誤 | 檢查 Server 狀態和 URL |
| `Authentication failed` | Token 無效或過期 | 重新生成 token |
| `Scanner execution failed` | Scanner 配置錯誤 | 檢查 projectKey 和 sources |
| `No analysis found` | 掃描尚未完成 | 等待更長時間或手動檢查 Server |
| `File not found in SonarQube` | 文件路徑不匹配 | 檢查 sources 配置 |

## 🔍 偵錯

### 啟用詳細日誌

```json
{
  "gooseCodeReview.logging.level": "debug"
}
```

### 檢查 Scanner 輸出

Scanner 的輸出會顯示在 VS Code 的 "Output" 面板中：

1. 打開 "View" → "Output"
2. 選擇 "Goose Code Review"
3. 查看 Scanner 執行日誌

### 手動驗證

```bash
# 在終端中手動運行 sonar-scanner
cd /path/to/your/project
sonar-scanner \
  -Dsonar.projectKey=your-project-key \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=your-token
```

## 📈 性能考慮

### Scanner 執行時間

- **小型專案** (<1000 files): ~10-30 秒
- **中型專案** (1000-5000 files): ~30-60 秒
- **大型專案** (>5000 files): ~1-3 分鐘

### 優化建議

1. **使用 `.gitignore`**: Scanner 會自動跳過 `.gitignore` 中的文件
2. **配置 `exclusions`**: 排除不需要分析的目錄
3. **增量分析**: SonarQube 支援增量分析（需要配置）
4. **調整 timeout**: 大型專案可能需要更長的超時時間

## 🎯 最佳實踐

### 1. 本地開發

```json
{
  "gooseCodeReview.gitAnalysis.mode": "hybrid",
  "gooseCodeReview.sonarqube.enabled": true
}
```

- 使用 hybrid 模式結合 AI 和 SonarQube
- 獲得最全面的分析結果

### 2. CI/CD 環境

```json
{
  "gooseCodeReview.gitAnalysis.mode": "sonarqube-only",
  "gooseCodeReview.sonarqube.timeout": 120000
}
```

- 只使用 SonarQube（避免 AI API 費用）
- 增加 timeout 以適應大型專案

### 3. 快速檢查

```json
{
  "gooseCodeReview.gitAnalysis.mode": "ai-only"
}
```

- 只使用 AI（更快）
- 適合快速迭代和實驗

## 📚 相關文檔

- [SonarQube Setup Guide](./SONARQUBE_SETUP.md) - Token 設置指南
- [Git Change Analysis Plan](../../docs/GIT_CHANGE_ANALYSIS_PLAN.md) - 功能規劃
- [SonarQube Scanner for JavaScript](https://github.com/bellingard/sonar-scanner-npm) - Scanner npm 包

---

**最後更新**: 2025-01-20

