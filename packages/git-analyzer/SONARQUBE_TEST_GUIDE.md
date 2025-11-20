# SonarQube 整合測試指南

## 📋 概述

這是一個簡單的測試程式，用於測試將程式碼送往 SonarQube 進行分析。

測試程式會自動執行以下步驟：
1. ✅ 連接到 SonarQube 伺服器
2. 🔍 執行程式碼掃描
3. 📊 獲取分析結果
4. 📈 顯示品質指標和問題列表

## 🚀 快速開始

### 前置需求

1. **SonarQube 伺服器**
   - 本地安裝：下載並啟動 SonarQube (https://www.sonarqube.org/downloads/)
   - 使用 Docker：`docker run -d --name sonarqube -p 9000:9000 sonarqube:latest`
   - 確認伺服器運行中：訪問 http://localhost:9000

2. **SonarQube Token**
   - 登入 SonarQube (預設帳密: admin/admin)
   - 進入 `My Account` > `Security`
   - 點擊 `Generate Token`
   - 輸入名稱（例如：test-token）並複製生成的 token

3. **Node.js 環境**
   - Node.js 18+ 
   - npm 或 pnpm

### 步驟 1: 安裝依賴

```bash
# 在專案根目錄
npm install

# 或使用 pnpm
pnpm install
```

### 步驟 2: 配置測試參數

編輯 `packages/git-analyzer/src/__tests__/sonarqube-integration-test.ts` 檔案，更新以下配置：

```typescript
const TEST_CONFIG: SonarQubeConfig = {
  // SonarQube 伺服器 URL
  serverUrl: 'http://localhost:9000',
  
  // 🔴 重要：替換成您的實際 token
  token: 'your-token-here',
  
  // 專案唯一識別碼（可自訂）
  projectKey: 'code-review-goose-test',
  
  // 專案名稱（可自訂）
  projectName: 'Code Review Goose - Test',
  
  // 要掃描的原始碼目錄
  sources: 'src',
  
  // 排除的目錄或檔案
  exclusions: 'node_modules/**,dist/**,build/**,coverage/**',
};
```

### 步驟 3: 執行測試

```bash
# 在專案根目錄執行
cd packages/git-analyzer
npm run test:sonarqube

# 或者直接使用 tsx
npx tsx src/__tests__/sonarqube-integration-test.ts
```

## 📊 測試輸出說明

測試程式會顯示以下資訊：

### 1. 連線測試
```
步驟 1: 測試 SonarQube 伺服器連線
✅ 連線成功！
   版本: 9.9.0.65466
   回應時間: 127ms
```

### 2. 掃描執行
```
步驟 2: 執行程式碼掃描
ℹ️  開始掃描... 這可能需要幾分鐘時間
✅ 掃描完成！
   執行時間: 45.32秒
```

### 3. 分析結果摘要
```
步驟 3: 獲取分析結果
✅ 成功獲取分析結果！

步驟 4: 分析結果摘要

📊 專案資訊
   專案金鑰: code-review-goose-test
   分析時間: 2025/11/20 下午2:30:15

🎯 品質閘門 (Quality Gate)
   狀態: OK
✅ 通過品質閘門檢查

📈 程式碼指標
   程式碼行數: 1,234
   測試覆蓋率: 85.50%
   技術債比率: 2.30%
   重複行密度: 1.20%

🐛 問題統計
   總問題數: 15
   Bug: 2
   漏洞 (Vulnerabilities): 0
   程式碼異味 (Code Smells): 13
   安全熱點 (Security Hotspots): 0

⚠️  嚴重程度分佈
   BLOCKER:  0
   CRITICAL: 0
   MAJOR:    5
   MINOR:    8
   INFO:     2
```

### 4. 詳細問題列表
```
步驟 5: 詳細問題列表

問題 1/10:
   嚴重程度: MAJOR
   類型: CODE_SMELL
   規則: typescript:S1186
   訊息: Add a nested comment explaining why this function is empty
   檔案: src/services/SonarQubeService.ts
   位置: Line 105
```

## ⚙️ 進階配置

### 測試選項

在測試檔案中修改 `TEST_OPTIONS` 來調整測試行為：

```typescript
const TEST_OPTIONS = {
  // 是否跳過掃描（只測試連線和獲取結果）
  skipScan: false,
  
  // 是否在掃描後等待（讓 SonarQube 處理結果）
  waitAfterScan: true,
  
  // 等待時間（毫秒）
  waitTime: 3000,
  
  // 是否顯示詳細的問題列表
  showDetailedIssues: true,
  
  // 最多顯示幾個問題
  maxIssuesToShow: 10,
};
```

### 掃描不同專案

如果要測試其他專案：

1. 修改 `sources` 指向專案的原始碼目錄
2. 調整 `exclusions` 排除不需要的檔案
3. 更新 `projectKey` 使用不同的專案識別碼

範例：掃描整個 monorepo

```typescript
const TEST_CONFIG: SonarQubeConfig = {
  serverUrl: 'http://localhost:9000',
  token: 'your-token-here',
  projectKey: 'code-review-goose-monorepo',
  projectName: 'Code Review Goose - Full Monorepo',
  sources: 'packages',  // 掃描 packages 目錄
  exclusions: '**/node_modules/**,**/dist/**,**/__tests__/**',
};
```

## 🔧 疑難排解

### 問題 1: Token 錯誤

```
❌ 連線失敗: Server returned status 401: Unauthorized
```

**解決方法：**
- 確認 token 是否正確複製（不要有多餘的空格）
- 檢查 token 是否已過期
- 重新生成新的 token

### 問題 2: 伺服器連線失敗

```
❌ 連線失敗: fetch failed
```

**解決方法：**
- 確認 SonarQube 伺服器是否正在運行
- 檢查 `serverUrl` 是否正確
- 檢查防火牆是否阻擋連線

### 問題 3: 掃描失敗

```
❌ 掃描失敗: Project key is invalid
```

**解決方法：**
- 確認 `projectKey` 格式正確（只能包含字母、數字、-、_、.）
- 確認 `sources` 路徑存在且包含可掃描的檔案
- 檢查 `exclusions` 是否過度排除了所有檔案

### 問題 4: 沒有找到問題

```
✅ 未發現任何問題，程式碼品質良好！
```

**這可能代表：**
- 程式碼品質確實很好
- 掃描範圍太小（被 exclusions 過濾掉）
- SonarQube 尚未處理完結果（增加 `waitTime`）

### 問題 5: Scanner 未安裝

```
❌ 掃描失敗: sonarqube-scanner not found
```

**解決方法：**
```bash
# 重新安裝依賴
npm install

# 或手動安裝 scanner
npm install sonarqube-scanner
```

## 📚 相關資源

- [SonarQube 官方文檔](https://docs.sonarqube.org/)
- [SonarQube Scanner for JavaScript](https://github.com/bellingard/sonar-scanner-npm)
- [SonarQube Analysis Parameters](https://docs.sonarqube.org/latest/analysis/analysis-parameters/)
- [專案 SonarQube 整合文檔](./SONARQUBE_INTEGRATION.md)

## 🎯 下一步

成功執行測試後，您可以：

1. **查看 SonarQube 報告**
   - 訪問：http://localhost:9000/dashboard?id=your-project-key
   - 探索詳細的程式碼品質指標

2. **整合到 CI/CD**
   - 將測試加入 GitHub Actions
   - 自動化程式碼品質檢查

3. **配置品質閘門**
   - 在 SonarQube 介面設定品質閘門規則
   - 定義專案的品質標準

4. **連接 VS Code Extension**
   - 使用 Goose Code Review VS Code 擴充套件
   - 在編輯器中直接查看 SonarQube 問題

## 💡 最佳實踐

1. **定期執行掃描**
   - 每次提交前執行測試
   - 在 CI/CD pipeline 中整合

2. **逐步改善**
   - 從修復 BLOCKER 和 CRITICAL 問題開始
   - 逐步降低技術債

3. **團隊協作**
   - 分享 SonarQube 報告連結
   - 討論程式碼品質改善策略

4. **自訂規則**
   - 根據團隊需求調整 SonarQube 規則
   - 設定專案特定的品質閘門

---

**有問題嗎？**

請查看 [SONARQUBE_ANALYSIS_FLOW.md](../vscode-extension/docs/SONARQUBE_ANALYSIS_FLOW.md) 了解完整的分析流程。

