# SonarQube 測試工具使用說明

本目錄提供兩個測試工具來驗證 SonarQube 整合功能。

## 🎯 測試工具概覽

### 1. 快速測試工具 (Quick Test)
**適用場景：** 快速驗證連線和基本功能

```bash
# 基本用法
cd packages/git-analyzer
npm run test:sonarqube:quick -- <your-token>

# 指定專案
npm run test:sonarqube:quick -- <your-token> my-project

# 自訂伺服器
npm run test:sonarqube:quick -- <your-token> my-project https://sonarcloud.io
```

**功能：**
- ✅ 測試 SonarQube 伺服器連線
- ✅ 驗證 token 有效性
- ✅ 檢查專案是否存在
- ✅ 顯示基本分析結果（如果專案已掃描）

**執行時間：** ~1-2 秒

---

### 2. 完整測試工具 (Full Integration Test)
**適用場景：** 完整的端到端測試，包含程式碼掃描

```bash
cd packages/git-analyzer
npm run test:sonarqube
```

**功能：**
- ✅ 測試 SonarQube 伺服器連線
- ✅ 執行完整程式碼掃描
- ✅ 獲取詳細分析結果
- ✅ 顯示品質指標、問題統計
- ✅ 列出詳細問題清單

**執行時間：** ~30-120 秒（取決於專案大小）

**配置：** 需要先編輯 `src/__tests__/sonarqube-integration-test.ts` 設定 token 和掃描參數

---

## 🚀 快速開始（3 步驟）

### 步驟 1: 啟動 SonarQube

使用 Docker 快速啟動：
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
```

等待約 1-2 分鐘，訪問 http://localhost:9000 確認啟動成功。

### 步驟 2: 生成 Token

1. 登入 SonarQube (預設帳密: `admin` / `admin`)
2. 進入 **My Account** → **Security**
3. 在 **Generate Tokens** 輸入名稱（例如：`test-token`）
4. 點擊 **Generate** 並複製 token

### 步驟 3: 執行測試

**方式 A - 快速測試（推薦初次使用）：**
```bash
cd packages/git-analyzer
npm run test:sonarqube:quick -- squ_your_token_here
```

**方式 B - 完整測試：**
```bash
# 1. 編輯測試檔案，更新 token
# 編輯 src/__tests__/sonarqube-integration-test.ts
# 將 token: 'your-token-here' 改成您的實際 token

# 2. 執行測試
npm run test:sonarqube
```

---

## 📊 測試輸出範例

### 快速測試輸出

```
═══════════════════════════════════════════════════════════
  SonarQube 快速測試
═══════════════════════════════════════════════════════════

伺服器: http://localhost:9000
專案金鑰: quick-test
Token: squ_abc123...（已隱藏）

⏳ 測試 1: 檢查伺服器連線...
✅ 連線成功
   版本: 9.9.0.65466
   延遲: 127ms

⏳ 測試 2: 檢查專案是否存在...
✅ 專案已存在，成功獲取分析結果
   總問題數: 15
   品質閘門: OK
   Bug: 2
   漏洞: 0
   程式碼異味: 13

📊 查看報告: http://localhost:9000/dashboard?id=quick-test

═══════════════════════════════════════════════════════════
  ✅ 測試完成
═══════════════════════════════════════════════════════════

SonarQube 連線正常，可以開始使用！
```

### 完整測試輸出

```
╔═══════════════════════════════════════════════════════════╗
║       SonarQube 整合測試程式                              ║
╚═══════════════════════════════════════════════════════════╝

步驟 1: 測試 SonarQube 伺服器連線
✅ 連線成功！
   版本: 9.9.0.65466
   回應時間: 127ms

步驟 2: 執行程式碼掃描
ℹ️  開始掃描... 這可能需要幾分鐘時間
✅ 掃描完成！
   執行時間: 45.32秒

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
   漏洞: 0
   程式碼異味: 13
   安全熱點: 0
```

---

## 🔧 常見問題

### Q1: 連線失敗 (401 Unauthorized)
```
❌ 連線失敗: Server returned status 401: Unauthorized
```
**解決方法：**
- 確認 token 是否正確（完整複製，無空格）
- Token 可能已過期，重新生成
- 檢查是否使用正確的 token 格式（應以 `squ_` 開頭）

### Q2: 伺服器無法連線
```
❌ 連線失敗: fetch failed
```
**解決方法：**
- 確認 SonarQube 是否正在運行：訪問 http://localhost:9000
- 檢查 Docker 容器狀態：`docker ps | grep sonarqube`
- 確認防火牆設定

### Q3: 掃描失敗
```
❌ 掃描失敗: Project key is invalid
```
**解決方法：**
- 確認 projectKey 格式正確（只能含字母、數字、`-`、`_`、`.`）
- 檢查 sources 路徑是否存在
- 確認有可掃描的檔案（未被 exclusions 過濾）

### Q4: 找不到專案
```
ℹ️  專案尚未掃描或不存在
```
**這是正常的！** 表示專案還沒有被掃描過。

**解決方法：**
- 使用完整測試工具執行掃描：`npm run test:sonarqube`
- 或手動執行掃描後再測試

---

## 📚 詳細文檔

- **[完整測試指南](./SONARQUBE_TEST_GUIDE.md)** - 詳細的測試配置和疑難排解
- **[SonarQube 分析流程](../vscode-extension/docs/SONARQUBE_ANALYSIS_FLOW.md)** - 了解分析流程
- **[SonarQube 官方文檔](https://docs.sonarqube.org/)** - SonarQube 官方資源

---

## 💡 使用建議

### 開發流程

1. **初次設定** → 使用快速測試驗證連線
   ```bash
   npm run test:sonarqube:quick -- your-token
   ```

2. **完整測試** → 執行完整掃描和分析
   ```bash
   npm run test:sonarqube
   ```

3. **日常開發** → 整合到 CI/CD 或 VS Code 擴充套件

### 最佳實踐

- ✅ 定期執行掃描（例如：每次 commit 前）
- ✅ 從修復高嚴重性問題開始（BLOCKER, CRITICAL）
- ✅ 設定品質閘門，防止低品質程式碼進入主分支
- ✅ 團隊共享 SonarQube 報告，促進程式碼品質改善

---

## 🎓 相關教學

### SonarQube 設定
1. [如何安裝 SonarQube](https://docs.sonarqube.org/latest/setup/install-server/)
2. [如何生成 Token](https://docs.sonarqube.org/latest/user-guide/user-token/)
3. [品質閘門設定](https://docs.sonarqube.org/latest/user-guide/quality-gates/)

### 進階功能
- [VS Code 擴充套件整合](../vscode-extension/README.md)
- [Git 變更分析](../../docs/GIT_CHANGE_ANALYSIS_PLAN.md)
- [CI/CD 整合](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)

---

**需要幫助？**
- 查看 [詳細測試指南](./SONARQUBE_TEST_GUIDE.md)
- 閱讀 [分析流程文檔](../vscode-extension/docs/SONARQUBE_ANALYSIS_FLOW.md)
- 參考 [SonarQube 官方文檔](https://docs.sonarqube.org/)

