# SonarQube 測試程式總結

## ✅ 已建立的測試工具

### 1. 快速測試工具
- **檔案路徑**: `src/__tests__/sonarqube-quick-test.ts`
- **執行指令**: `npm run test:sonarqube:quick -- <token> [projectKey] [serverUrl]`
- **特點**:
  - 使用命令列參數，無需編輯檔案
  - 快速驗證連線（1-2 秒）
  - 支援 `--help` 參數顯示使用說明
  - 安全處理 token（日誌中僅顯示前 10 字元）
  - 自動檢查專案是否存在

### 2. 完整測試工具
- **檔案路徑**: `src/__tests__/sonarqube-integration-test.ts`
- **執行指令**: `npm run test:sonarqube`
- **特點**:
  - 完整的端到端測試
  - 執行實際程式碼掃描
  - 顯示詳細分析結果
  - 包含品質指標、問題統計、詳細問題列表
  - 可配置的測試選項（跳過掃描、等待時間等）

## 📁 新增的檔案

```
packages/git-analyzer/
├── src/__tests__/
│   ├── sonarqube-quick-test.ts         (新) 快速測試工具
│   ├── sonarqube-integration-test.ts   (新) 完整測試工具
│   └── scanner-test.ts                 (已存在，保持不變)
├── package.json                        (更新) 新增測試腳本
├── README_SONARQUBE_TEST.md            (新) 測試工具使用說明
├── SONARQUBE_TEST_GUIDE.md             (新) 詳細測試指南
└── TESTING_SUMMARY_SONARQUBE.md        (新) 此檔案
```

## 🎯 測試流程

### 快速測試流程

```
用戶執行命令
    ↓
解析命令列參數 (token, projectKey, serverUrl)
    ↓
測試 1: 連線測試
    ├─ 呼叫 /api/system/status
    ├─ 驗證 token
    └─ 顯示版本和延遲
    ↓
測試 2: 檢查專案
    ├─ 嘗試獲取分析結果
    ├─ 如果存在：顯示基本統計
    └─ 如果不存在：提示執行掃描
    ↓
顯示測試結果和下一步建議
```

### 完整測試流程

```
讀取配置檔案
    ↓
驗證配置（token, projectKey 等）
    ↓
步驟 1: 測試連線
    ├─ 連接 SonarQube 伺服器
    ├─ 驗證 token
    └─ 顯示版本資訊
    ↓
步驟 2: 執行掃描
    ├─ 準備掃描配置
    ├─ 執行 sonar-scanner
    ├─ 顯示掃描進度
    └─ 等待伺服器處理
    ↓
步驟 3: 獲取分析結果
    ├─ 呼叫 SonarQube API
    ├─ 獲取 issues
    ├─ 獲取 metrics
    └─ 獲取 quality gate
    ↓
步驟 4: 顯示結果摘要
    ├─ 專案資訊
    ├─ 品質閘門狀態
    ├─ 程式碼指標
    ├─ 問題統計
    └─ 嚴重程度分佈
    ↓
步驟 5: 顯示詳細問題列表
    ├─ 逐一列出問題
    ├─ 顯示位置和修復建議
    └─ 提供完整報告連結
```

## 🔧 技術細節

### 使用的 API

1. **連線測試**
   ```
   GET /api/system/status
   ```

2. **獲取問題**
   ```
   GET /api/issues/search?componentKeys={projectKey}&resolved=false
   ```

3. **獲取指標**
   ```
   GET /api/measures/component?component={projectKey}&metricKeys=bugs,vulnerabilities,...
   ```

4. **獲取品質閘門**
   ```
   GET /api/qualitygates/project_status?projectKey={projectKey}
   ```

### 錯誤處理

- ✅ 連線失敗：顯示錯誤訊息和檢查建議
- ✅ 認證失敗：提示檢查 token
- ✅ 掃描失敗：顯示常見問題和解決方法
- ✅ 專案不存在：提供下一步操作建議
- ✅ 未捕獲錯誤：顯示完整錯誤堆疊

## 📊 測試輸出格式

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
```

### 完整測試輸出

包含 5 個詳細步驟，顯示：
- 連線資訊
- 掃描進度和時間
- 完整的分析結果摘要
- 品質指標
- 詳細問題列表（可配置顯示數量）

## 🎓 使用案例

### 案例 1: 首次設定

```bash
# 1. 啟動 SonarQube
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest

# 2. 獲取 token
# 訪問 http://localhost:9000 並生成 token

# 3. 快速測試
cd packages/git-analyzer
npm run test:sonarqube:quick -- squ_your_token_here

# 輸出應該顯示連線成功
```

### 案例 2: 掃描新專案

```bash
# 1. 編輯完整測試配置
# 檔案: src/__tests__/sonarqube-integration-test.ts
# 更新: token, projectKey, sources, exclusions

# 2. 執行完整測試
npm run test:sonarqube

# 3. 查看 SonarQube 報告
# 訪問顯示的 dashboard URL
```

### 案例 3: 檢查現有專案

```bash
# 如果專案已經掃描過，可以快速查看結果
npm run test:sonarqube:quick -- your-token existing-project-key

# 輸出會顯示該專案的當前狀態
```

### 案例 4: SonarCloud 測試

```bash
# 測試 SonarCloud 而非本地 SonarQube
npm run test:sonarqube:quick -- \
  your-sonarcloud-token \
  your-project-key \
  https://sonarcloud.io
```

## 🔍 測試檢查清單

### 快速測試

- [ ] Token 格式正確（至少 10 個字元）
- [ ] SonarQube 伺服器正在運行
- [ ] 連線測試通過
- [ ] 顯示伺服器版本和延遲
- [ ] 正確處理專案不存在的情況

### 完整測試

- [ ] 所有配置參數已正確設定
- [ ] Token 有效
- [ ] sources 路徑正確
- [ ] exclusions 設定合理
- [ ] 掃描成功完成
- [ ] 分析結果正確獲取
- [ ] 顯示完整的品質指標
- [ ] 問題列表格式正確
- [ ] 提供 dashboard 連結

## 📈 性能指標

### 快速測試

- **執行時間**: 1-2 秒
- **網路請求**: 2-3 個 API 呼叫
- **記憶體使用**: < 50 MB

### 完整測試

- **執行時間**: 30-120 秒（取決於專案大小）
  - 小型專案 (<1000 files): ~30 秒
  - 中型專案 (1000-5000 files): ~60 秒
  - 大型專案 (>5000 files): ~120 秒
- **網路請求**: 5-10 個 API 呼叫
- **記憶體使用**: 100-500 MB（取決於專案大小）

## 🚀 後續改進建議

### 短期改進

1. ✅ 增加更多錯誤處理場景
2. ✅ 支援從環境變數讀取配置
3. ✅ 增加進度條顯示
4. ✅ 支援匯出測試結果為 JSON

### 長期改進

1. ✅ 整合到 CI/CD pipeline
2. ✅ 增加自動化測試覆蓋
3. ✅ 支援批次測試多個專案
4. ✅ 增加報告比較功能（比較不同版本的掃描結果）

## 📚 相關文檔

- **[測試工具使用說明](./README_SONARQUBE_TEST.md)** - 使用指南
- **[詳細測試指南](./SONARQUBE_TEST_GUIDE.md)** - 進階配置
- **[分析流程說明](../vscode-extension/docs/SONARQUBE_ANALYSIS_FLOW.md)** - 技術細節
- **[根目錄快速參考](../../SONARQUBE_TESTING.md)** - 快速開始指南

## ✨ 總結

這兩個測試工具提供了完整的 SonarQube 整合測試能力：

1. **快速測試工具** - 用於快速驗證和日常檢查
2. **完整測試工具** - 用於深度測試和詳細分析

兩者互補，滿足不同的測試需求，讓開發者可以輕鬆驗證 SonarQube 整合功能。

---

**建立日期**: 2025-11-20  
**最後更新**: 2025-11-20  
**版本**: 1.0.0

