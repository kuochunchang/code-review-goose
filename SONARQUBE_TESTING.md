# SonarQube 測試工具 - 快速參考

## 📦 位置

測試工具位於：`packages/git-analyzer/src/__tests__/`

## 🚀 快速開始

### 1. 啟動 SonarQube

```bash
# 使用 Docker（推薦）
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest

# 等待啟動完成（約 1-2 分鐘）
# 訪問 http://localhost:9000 確認
```

### 2. 獲取 Token

1. 登入 http://localhost:9000 (admin/admin)
2. My Account → Security → Generate Token
3. 複製 token

### 3. 執行測試

#### 方式 A：快速測試（推薦）

```bash
cd packages/git-analyzer
npm run test:sonarqube:quick -- <your-token>
```

#### 方式 B：完整測試

```bash
# 1. 編輯測試檔案
# 檔案：packages/git-analyzer/src/__tests__/sonarqube-integration-test.ts
# 修改：token: 'your-token-here' → token: '<your-actual-token>'

# 2. 執行測試
cd packages/git-analyzer
npm run test:sonarqube
```

## 📝 兩個測試工具的差異

| 特性 | 快速測試 | 完整測試 |
|------|---------|---------|
| **檔案** | `sonarqube-quick-test.ts` | `sonarqube-integration-test.ts` |
| **指令** | `npm run test:sonarqube:quick` | `npm run test:sonarqube` |
| **配置** | 命令列參數 | 編輯檔案 |
| **執行時間** | 1-2 秒 | 30-120 秒 |
| **掃描程式碼** | ❌ | ✅ |
| **測試連線** | ✅ | ✅ |
| **顯示結果** | 基本資訊 | 詳細報告 |
| **適用場景** | 快速驗證 | 完整測試 |

## 💡 使用建議

1. **首次使用** → 先用快速測試驗證連線
2. **正式測試** → 使用完整測試進行掃描
3. **日常使用** → 整合到開發流程

## 📚 詳細文檔

- **[測試工具使用說明](./packages/git-analyzer/README_SONARQUBE_TEST.md)** - 完整使用指南
- **[詳細測試指南](./packages/git-analyzer/SONARQUBE_TEST_GUIDE.md)** - 進階配置和疑難排解
- **[分析流程說明](./packages/vscode-extension/docs/SONARQUBE_ANALYSIS_FLOW.md)** - 技術細節

## 🔧 常見問題速查

| 問題 | 解決方法 |
|-----|---------|
| 401 Unauthorized | 檢查 token 是否正確 |
| fetch failed | 確認 SonarQube 是否運行 |
| Project key invalid | 使用英數字、`-`、`_`、`.` |
| 找不到專案 | 執行完整測試進行掃描 |

## 📖 範例

### 快速測試範例

```bash
# 基本測試
npm run test:sonarqube:quick -- squ_abc123def456

# 指定專案
npm run test:sonarqube:quick -- squ_abc123def456 my-project

# 自訂伺服器
npm run test:sonarqube:quick -- squ_abc123def456 my-project https://sonarcloud.io
```

### 完整測試配置範例

```typescript
// 編輯 packages/git-analyzer/src/__tests__/sonarqube-integration-test.ts

const TEST_CONFIG: SonarQubeConfig = {
  serverUrl: 'http://localhost:9000',
  token: 'squ_your_actual_token_here',  // 🔴 更新這裡
  projectKey: 'my-awesome-project',
  projectName: 'My Awesome Project',
  sources: 'src',
  exclusions: 'node_modules/**,dist/**,coverage/**',
  timeout: 5000,
};
```

---

**需要更詳細的說明？** 請查看 [完整測試指南](./packages/git-analyzer/SONARQUBE_TEST_GUIDE.md)

