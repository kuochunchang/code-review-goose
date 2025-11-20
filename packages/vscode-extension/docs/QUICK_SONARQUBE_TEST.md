# 快速測試 SonarQube（繞過 AI Quota 問題）

## 問題

你遇到了 Gemini API quota 超限錯誤。這會阻止正常的分析流程。

## 解決方案：使用 SonarQube-Only 模式

### 方法 1: 臨時切換到 SonarQube-Only 模式

1. 打開 VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. 搜尋：`gooseCodeReview.gitAnalysis.mode`
3. 設置為：`sonarqube-only`

```json
{
  "gooseCodeReview.gitAnalysis.mode": "sonarqube-only"
}
```

4. 重新運行分析

### 方法 2: 使用測試命令（推薦）

運行：**`Goose Code Review: Test SonarQube Scanner (Debug)`**

這個命令會：
- ✅ 不使用 AI
- ✅ 只測試 SonarQube Scanner
- ✅ 顯示詳細日誌
- ✅ 繞過 Gemini quota 問題

### 方法 3: 切換到 OpenAI

如果你有 OpenAI API key：

```json
{
  "gooseCodeReview.aiProvider": "openai",
  "gooseCodeReview.openaiApiKey": "sk-..."
}
```

或使用 Secret Storage:
```
Cmd+Shift+P → "Preferences: Open User Settings"
搜尋 "openaiApiKey"
```

## 測試 SonarQube Scanner 步驟

### 1. 配置 SonarQube-Only 模式

```json
{
  "gooseCodeReview.gitAnalysis.mode": "sonarqube-only"
}
```

### 2. 運行測試命令

```
Cmd+Shift+P → "Goose Code Review: Test SonarQube Scanner (Debug)"
```

### 3. 查看 Output 面板

會自動打開 "SonarQube Test" output 面板，顯示：

```
=== SonarQube Scanner Test ===

Step 1: Testing connection...
✓ Connected (v9.9.0, 45ms)

Step 2: Executing scanner...
[SonarQube] Starting scan with config:
  Server URL: http://localhost:9000
  Project Key: your-project
  Sources: .
  Base Dir: /path/to/your/project
[SonarQube] Scanner completed successfully in 23456ms

=== Scan Result ===
Success: true
Duration: 23456ms
```

### 4. 檢查執行時間

- **< 1 秒**: ⚠️ Scanner 可能沒有真正執行
- **10-60 秒**: ✅ 正常，取決於專案大小
- **> 3 分鐘**: 考慮優化配置

## Gemini API Quota 問題

### 錯誤信息

```
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
model: gemini-3-pro
```

### 原因

你正在使用 `gemini-3-pro-preview` 模型，但：
1. 免費層級的 quota 已用完
2. 需要等待 52 秒後重試
3. 或者切換到其他 AI provider

### 解決方法

#### 選項 1: 等待 quota 重置
- 每日 quota 會重置
- 或等待指定的重試時間（52秒）

#### 選項 2: 切換模型

```json
{
  "gooseCodeReview.geminiModel": "gemini-1.5-flash"
}
```

`gemini-1.5-flash` 有更高的免費 quota。

#### 選項 3: 切換到 OpenAI

```json
{
  "gooseCodeReview.aiProvider": "openai"
}
```

#### 選項 4: 僅使用 SonarQube（推薦測試時使用）

```json
{
  "gooseCodeReview.gitAnalysis.mode": "sonarqube-only"
}
```

## 檢查 SonarQube 是否真的執行

### 查看日誌

1. **View** → **Output**
2. 選擇 **"Goose Code Review"**
3. 查找：

```
[SonarQube] Starting scan with config:
[SonarQube] Scanner completed successfully in XXXXms
```

如果看到這些日誌，說明 Scanner 真的在執行。

### 查看 SonarQube Server

1. 打開 SonarQube UI: `http://localhost:9000`
2. 進入 **Projects** → 你的專案
3. 查看 **Last analysis** 時間是否更新

### 檢查進程

掃描時運行：
```bash
ps aux | grep sonar-scanner
```

應該看到正在運行的進程。

## 完整測試流程

```bash
# 1. 設置 SonarQube-only 模式
# 在 VS Code Settings 中設置

# 2. 運行測試命令
# Cmd+Shift+P → "Test SonarQube Scanner (Debug)"

# 3. 觀察結果
# - 查看執行時間
# - 檢查日誌輸出
# - 驗證 SonarQube Server 上的分析

# 4. 如果成功，切換回 hybrid 模式
{
  "gooseCodeReview.gitAnalysis.mode": "hybrid",
  "gooseCodeReview.aiProvider": "openai"  // 或修復 Gemini
}
```

## 下一步

1. ✅ 使用 SonarQube-only 模式測試
2. ✅ 確認 Scanner 真的在執行
3. ✅ 修復 AI provider（切換到 OpenAI 或修復 Gemini quota）
4. ✅ 切換回 hybrid 模式享受完整功能

---

**最後更新**: 2025-01-20

