# Git 變更分析功能 - 開發計劃與進度追蹤

**功能名稱**: Git Change Analysis with SonarQube Integration
**開始日期**: 2025-01-20
**預計完成**: 2025-03-24 (10 週)
**當前階段**: Phase 1 ✅ COMPLETED

---

## 📋 功能概述

為 Goose Code Review 新增 AI 驅動的 Git 變更分析，支援：

1. **工作區變更分析** - 分析未提交的變更 (unstaged + staged)
2. **分支對比分析** - 比較兩個分支的差異 (含 commit 歷史)
3. **Pull Request 分析** - 整合 GitHub PR 審查

### 核心價值

- **雙軌分析系統**: SonarQube 靜態分析 + AI 語意分析
- **互補優勢**: SonarQube 提供精確檢測，AI 提供上下文理解
- **混合模式**: 自動偵測環境 (Server/CLI/AI-only)，優雅降級

---

## 🎯 分析類型 (按優先級)

### Phase 1 - MVP (P0-P1)

| 分析類型 | 優先級 | 負責方 | 說明 |
|---------|--------|--------|------|
| Code Quality Review | P0 | SonarQube + AI | 程式碼品質、重複代碼、複雜度 |
| Security Analysis | P0 | SonarQube + AI | 安全漏洞檢測 (OWASP Top 10) |
| Impact Analysis | P1 | AI | 影響範圍、破壞性變更、風險評估 |

### Phase 2 - 進階功能 (P2)

| 分析類型 | 優先級 | 負責方 | 說明 |
|---------|--------|--------|------|
| Architecture Review | P2 | AI | 設計模式、SOLID 原則 |
| Test Coverage Suggestion | P2 | AI | 測試案例建議、邊界條件 |
| Performance Implications | P2 | SonarQube + AI | 效能瓶頸、複雜度分析 |

### Phase 3 - 擴展功能 (P3)

- Breaking Changes Detection
- Documentation Needs
- Multi-platform Git Hosting (GitLab, Bitbucket)
- Custom Rules Engine

---

## 🏗️ 技術架構

### 核心依賴

```json
{
  "dependencies": {
    "simple-git": "^3.25.0",           // Git 操作
    "sonarqube-scanner": "^3.x",       // SonarQube Server 整合
    "@octokit/rest": "^20.x",          // GitHub API
    "gpt-3-encoder": "^1.x"            // Token 計數
  }
}
```

### Package 結構

```
packages/git-analyzer/
├── src/
│   ├── services/
│   │   ├── GitService.ts              ✅ DONE
│   │   ├── SonarQubeService.ts        🔄 Phase 2
│   │   ├── ChangeAnalyzer.ts          🔄 Phase 3
│   │   └── MergeService.ts            🔄 Phase 3
│   ├── types/
│   │   ├── git.types.ts               ✅ DONE
│   │   ├── analysis.types.ts          ✅ DONE
│   │   └── sonarqube.types.ts         ⏳ Phase 2
│   ├── utils/
│   │   ├── TokenCounter.ts            ⏳ Phase 3
│   │   └── DiffParser.ts              ⏳ Phase 3
│   └── index.ts                       ✅ DONE
└── __tests__/                         ✅ 19 tests
```

---

## 📅 實施階段與進度

### ✅ Phase 1: 基礎建設 (Week 1-2) - COMPLETED

**目標**: 建立 Git 分析基礎架構

**時程**: 2025-01-20 ~ 2025-01-20 (1 天完成 ⚡)

#### 已完成任務 ✅

- [x] 建立 `@code-review-goose/git-analyzer` package
  - [x] package.json, tsconfig.json, README.md
  - [x] 目錄結構 (src/, types/, services/, __tests__/)
- [x] 整合 `simple-git` 庫
  - [x] 安裝依賴 (simple-git ^3.25.0)
- [x] 實現 `GitService` 基本功能
  - [x] `getWorkingDirectoryChanges()` - 工作區變更分析
  - [x] `compareBranches()` - 分支對比
  - [x] `parseDiff()` - Diff 解析器
  - [x] 輔助方法 (getCurrentBranch, isClean, getRepoRoot)
- [x] 撰寫單元測試
  - [x] 19 個測試案例
  - [x] 97.97% 程式碼覆蓋率
  - [x] 零 lint 錯誤

#### 交付成果 📦

- ✅ GitService 完整實現 (297 行)
- ✅ 型別定義 (git.types.ts, analysis.types.ts)
- ✅ 測試覆蓋率超過 80% (達到 97.97%)
- ✅ Git commit: `21f0d27` - "feat: implement Phase 1"

#### 關鍵指標 📊

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| 程式碼覆蓋率 | ≥80% | 97.97% | ✅ 超標 |
| 測試數量 | ≥15 | 19 | ✅ 超標 |
| Lint 錯誤 | 0 | 0 | ✅ 達標 |
| 建構成功 | ✅ | ✅ | ✅ 達標 |

---

### 🔄 Phase 2: SonarQube 整合 (Week 3-4) - IN PLANNING

**目標**: 實現 SonarQube 靜態分析整合 (混合模式)

**時程**: 2025-01-21 ~ 2025-02-03 (2 週)

#### 計劃任務 📋

##### Week 3: CLI 模式實現

- [ ] 研究 `sonarqube-scanner` npm 套件
  - [ ] 閱讀官方文檔
  - [ ] 測試 local analysis (無 Server)
  - [ ] 測試 Server mode
- [ ] 實現 `SonarQubeService` 基礎架構
  - [ ] CLI 模式掃描 (priority)
  - [ ] 配置管理 (.goose-review.yml)
  - [ ] 錯誤處理與重試機制
- [ ] 型別定義
  - [ ] sonarqube.types.ts (SonarIssue, SonarConfig, etc.)
- [ ] 單元測試
  - [ ] SonarQubeService 測試 (目標: ≥80% 覆蓋率)
  - [ ] Mock SonarQube API

##### Week 4: Server 模式與自動偵測

- [ ] 實現 Server 模式
  - [ ] 連線測試 (timeout 3s)
  - [ ] API 整合 (issues, metrics)
  - [ ] Quality Gate 檢查
- [ ] 實現混合模式偵測
  - [ ] 環境偵測邏輯
  - [ ] 優雅降級 (Server → CLI → AI-only)
  - [ ] 狀態通知
- [ ] 快取機制
  - [ ] 基於 diff hash 的快取
  - [ ] 快取過期策略 (24h)
- [ ] 測試與文檔
  - [ ] 整合測試
  - [ ] 使用文檔更新

#### 預期交付成果 📦

- [ ] SonarQubeService 完整實現
- [ ] 混合模式自動偵測
- [ ] 測試覆蓋率 ≥80%
- [ ] 配置檔範例 (.goose-review.yml)
- [ ] Git commit: "feat: implement Phase 2 - SonarQube integration"

#### 關鍵里程碑 🎯

- [ ] CLI 模式可用 (本地分析)
- [ ] Server 模式可用 (含 Quality Gate)
- [ ] 自動降級機制運作正常
- [ ] 所有測試通過

---

### ⏳ Phase 3: AI 分析整合 (Week 5-6) - PENDING

**目標**: 實現批次檔案分析與 AI 整合

**時程**: 2025-02-04 ~ 2025-02-17 (2 週)

#### 計劃任務 📋

- [ ] 實現 `ChangeAnalyzer` 服務
  - [ ] `analyzeWorkingDirectory()`
  - [ ] `analyzeBranchComparison()`
  - [ ] 批次處理邏輯
- [ ] AI Provider 整合
  - [ ] 使用現有的 IAIProvider 介面
  - [ ] Prompt 設計 (Quality, Security, Impact)
  - [ ] Token 限制處理
- [ ] 批次處理優化
  - [ ] Token 計數 (gpt-3-encoder)
  - [ ] 智慧型批次分組
  - [ ] 並行處理
- [ ] 快取機制
  - [ ] AnalysisCacheService
  - [ ] 基於 commit SHA / diff hash
- [ ] 測試
  - [ ] ChangeAnalyzer 單元測試
  - [ ] 整合測試 (mock AI provider)

#### 預期交付成果 📦

- [ ] ChangeAnalyzer 完整實現
- [ ] AI 分析功能可用
- [ ] 批次處理效能優化
- [ ] 測試覆蓋率 ≥80%

---

### ⏳ Phase 4: 結果融合 (Week 7-8) - PENDING

**目標**: 融合 SonarQube + AI 分析結果

**時程**: 2025-02-18 ~ 2025-03-03 (2 週)

#### 計劃任務 📋

- [ ] 實現 `MergeService`
  - [ ] Issue 去重邏輯
  - [ ] 嚴重度對應 (SonarQube severity → unified severity)
  - [ ] 優先級排序
- [ ] 綜合報告生成
  - [ ] `MergedAnalysisResult` 型別
  - [ ] 統計摘要 (總 issues, 去重資訊)
  - [ ] 風險等級計算
- [ ] 報告匯出
  - [ ] Markdown 格式
  - [ ] HTML 格式 (with charts)
  - [ ] JSON 格式 (CI/CD)
- [ ] 測試
  - [ ] MergeService 單元測試
  - [ ] 端到端測試

#### 預期交付成果 📦

- [ ] MergeService 完整實現
- [ ] 去重準確率 >95%
- [ ] 報告匯出功能
- [ ] 測試覆蓋率 ≥80%

---

### ⏳ Phase 5: VS Code UI (Week 9-10) - PENDING

**目標**: 開發 VS Code Extension UI

**時程**: 2025-03-04 ~ 2025-03-17 (2 週)

#### 計劃任務 📋

- [ ] 新增 VS Code Commands
  - [ ] `gooseCodeReview.analyzeWorkingDirectory`
  - [ ] `gooseCodeReview.analyzeBranch`
  - [ ] `gooseCodeReview.analyzePullRequest`
- [ ] 開發 Webview Panel: "Git Change Analysis"
  - [ ] 變更來源選擇 UI
  - [ ] 分析類型選擇 (Quality/Security/Impact)
  - [ ] 進度顯示
  - [ ] 結果展示 (可互動)
- [ ] 整合 Monaco Diff Editor
  - [ ] 並排 diff 顯示
  - [ ] 高亮問題行
- [ ] 互動功能
  - [ ] 點擊跳轉至程式碼
  - [ ] 按嚴重度篩選
  - [ ] 按檔案分組
- [ ] E2E 測試
  - [ ] Playwright 測試

#### 預期交付成果 📦

- [ ] 完整的 UI/UX
- [ ] 互動功能正常
- [ ] E2E 測試通過

---

### ⏳ Phase 6: GitHub 整合 (Week 11-12) - PENDING

**目標**: 支援 PR 分析與 CI/CD 整合

**時程**: 2025-03-18 ~ 2025-03-24 (1 週)

#### 計劃任務 📋

- [ ] 整合 `@octokit/rest`
- [ ] 實現 `GitHubService`
  - [ ] `analyzePullRequest()`
  - [ ] `postAnalysisComment()`
- [ ] PR 分析功能
  - [ ] 取得 PR files + commits
  - [ ] 執行完整分析
- [ ] 自動發布評論
  - [ ] Markdown 報告格式化
  - [ ] 發布至 GitHub PR
- [ ] CI/CD 整合
  - [ ] GitHub Actions workflow 範例
  - [ ] 文檔撰寫

#### 預期交付成果 📦

- [ ] 可分析 GitHub PR
- [ ] 可自動發布評論
- [ ] CI/CD 整合文件
- [ ] 完整使用文檔

---

## 📊 整體進度追蹤

### 進度總覽

```
Phase 1: ████████████████████ 100% ✅ COMPLETED
Phase 2: ░░░░░░░░░░░░░░░░░░░░   0% 🔄 IN PLANNING
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ PENDING
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ PENDING
Phase 5: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ PENDING
Phase 6: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ PENDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall: ███░░░░░░░░░░░░░░░░░  17% (1/6 phases)
```

### 時程甘特圖

```
Week 1-2  : ████ Phase 1 (Git Operations)         ✅ DONE
Week 3-4  : ░░░░ Phase 2 (SonarQube Integration) 🔄 NEXT
Week 5-6  : ░░░░ Phase 3 (AI Analysis)
Week 7-8  : ░░░░ Phase 4 (Result Merging)
Week 9-10 : ░░░░ Phase 5 (VS Code UI)
Week 11-12: ░░░░ Phase 6 (GitHub Integration)
```

---

## ✅ 成功指標

### 功能指標

| 指標 | 目標 | 當前狀態 |
|------|------|----------|
| 支援變更來源 | 3 種 (WorkDir, Branch, PR) | 🟡 1/3 (WorkDir) |
| 支援分析類型 | 5 種 | 🔴 0/5 |
| AI Provider | 2 種 (OpenAI, Gemini) | 🟢 2/2 (已有) |
| Git Hosting | 1 種 (GitHub) | 🔴 0/1 |

### 效能指標

| 指標 | 目標 | 當前狀態 |
|------|------|----------|
| 分析 10 檔案 | < 30s | ⏳ 未測試 |
| 分析 50 檔案 | < 2min | ⏳ 未測試 |
| UI 回應時間 | < 200ms | ⏳ 未實現 |

### 品質指標

| 指標 | 目標 | 當前狀態 |
|------|------|----------|
| 單元測試覆蓋率 | ≥80% | ✅ 97.97% (Phase 1) |
| E2E 測試 | 關鍵流程 | 🔴 未實現 |
| Lint 錯誤 | 0 | ✅ 0 |
| 文件完整度 | 100% | 🟡 20% |

---

## 🔍 風險評估與緩解

### 高風險項目

| 風險 | 等級 | 影響 | 緩解措施 | 狀態 |
|------|------|------|----------|------|
| AI Token 超限 | 高 | 無法分析大量變更 | 智慧型批次處理、增量分析 | 📋 已規劃 |
| SonarQube Server 不可用 | 中 | 功能降級 | CLI 降級模式 | 📋 已規劃 |
| GitHub API Rate Limit | 中 | PR 分析受限 | 快取、Token 使用 | 📋 已規劃 |
| 分析結果誤報 | 中 | 使用者體驗不佳 | 持續優化 prompt、回饋機制 | ⏳ 待實施 |

---

## 📝 變更日誌

### 2025-01-20 (Day 1)

#### Added ✨
- 建立 `@code-review-goose/git-analyzer` package
- 實現 `GitService` 完整功能
  - `getWorkingDirectoryChanges()` - 工作區變更分析
  - `compareBranches()` - 分支對比
  - `parseDiff()` - Git diff 解析
  - 輔助方法 (getCurrentBranch, isClean, getRepoRoot)
- 新增型別定義
  - `git.types.ts` - Git 相關型別
  - `analysis.types.ts` - 分析相關型別
- 完整測試覆蓋 (19 tests, 97.97% coverage)

#### Technical Details 🔧
- Dependencies: simple-git ^3.25.0
- TypeScript: ES2022, strict mode
- Testing: Vitest with v8 coverage
- Lint: ESLint + Prettier (0 errors)

#### Metrics 📈
- Lines of Code: ~1,144
- Test Coverage: 97.97%
- Tests: 19/19 passing
- Commits: 1 (21f0d27)

---

## 🔗 相關文件

- [CLAUDE.md](../CLAUDE.md) - 專案開發指南
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - 重構計劃
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開發文件

---

## 👥 團隊與職責

| 角色 | 負責人 | 職責 |
|------|--------|------|
| Tech Lead | Claude Code | 架構設計、實現、測試 |
| Product Owner | User (kc.chang) | 需求定義、驗收 |

---

## 📞 聯絡資訊

- **GitHub Repo**: https://github.com/kuochunchang/code-review-goose
- **Issues**: https://github.com/kuochunchang/code-review-goose/issues

---

**Last Updated**: 2025-01-20
**Next Review**: 2025-01-21 (Phase 2 Kickoff)
