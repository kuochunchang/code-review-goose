# Parser 技術選型比較

> **問題**: TypeScriptParser 應該使用 Babel 還是 tree-sitter？
> **日期**: 2025-11-18

---

## 🎯 兩種方案比較

### 方案 A: 混合方案（Babel + tree-sitter）

```
TypeScript/JavaScript → @babel/parser (Babel AST)
Java → tree-sitter-java (Tree-sitter AST)
Python → tree-sitter-python (Tree-sitter AST)
```

**優點**:
- ✅ 保持現有 TypeScript 解析邏輯（風險低）
- ✅ Babel parser 非常成熟（社區廣泛使用）
- ✅ 已有的測試用例無需修改

**缺點**:
- ❌ 需要維護兩套 AST 轉換邏輯
- ❌ 不同語言的 Parser API 不一致
- ❌ 需要兩套依賴（@babel/* 和 tree-sitter）
- ❌ 代碼複雜度增加

---

### 方案 B: 統一方案（全部使用 tree-sitter）✅ 推薦

```
TypeScript → tree-sitter-typescript (Tree-sitter AST)
JavaScript → tree-sitter-javascript (Tree-sitter AST)
Java → tree-sitter-java (Tree-sitter AST)
Python → tree-sitter-python (Tree-sitter AST)
```

**優點**:
- ✅ **統一的 Parser API**（所有語言一致）
- ✅ **統一的 AST 格式**（只需一套轉換邏輯）
- ✅ **更簡單的維護**（一種技術棧）
- ✅ **更好的性能**（tree-sitter 增量解析）
- ✅ **更少的依賴**（移除所有 @babel/* 依賴）
- ✅ **易於擴展**（添加新語言只需安裝對應的 tree-sitter-xxx）
- ✅ **未來支持 WASM**（可在瀏覽器運行）

**缺點**:
- ❌ 需要重寫現有 TypeScript 解析邏輯（約 2-3 天工作量）
- ❌ Tree-sitter AST 格式與 Babel 不同（需要學習）
- ❌ 可能需要調整一些現有測試

---

## 📊 詳細對比

| 維度 | Babel + tree-sitter | 全 tree-sitter |
|------|---------------------|----------------|
| **API 統一性** | ❌ 兩套 API | ✅ 統一 API |
| **AST 格式** | ❌ 兩種格式 | ✅ 統一格式 |
| **依賴數量** | ❌ ~10 個包 | ✅ ~5 個包 |
| **代碼複雜度** | ❌ 高 | ✅ 低 |
| **維護成本** | ❌ 高 | ✅ 低 |
| **性能** | ⚠️ 中等 | ✅ 優秀 |
| **擴展性** | ⚠️ 中等 | ✅ 優秀 |
| **學習曲線** | ✅ 熟悉 | ⚠️ 需要學習 |
| **遷移風險** | ✅ 低 | ⚠️ 中 |
| **長期收益** | ❌ 低 | ✅ 高 |

---

## 🔍 tree-sitter-typescript 能力評估

### 支持的語言特性

✅ **完整支持**:
- TypeScript 所有語法（類、接口、枚舉、類型等）
- JSX/TSX
- Decorators
- 泛型（Generics）
- Type annotations
- Import/Export
- ES2015+ 所有特性

✅ **性能優勢**:
- 增量解析（Incremental parsing）
- 錯誤恢復（Error recovery）
- 流式解析（Streaming）

✅ **社區支持**:
- GitHub stars: 2.5k+
- 活躍維護（最近更新 < 1 個月）
- 被 GitHub、Atom、Neovim 等使用

### npm 包

```json
{
  "tree-sitter": "^0.21.0",
  "tree-sitter-typescript": "^0.21.0",
  "tree-sitter-javascript": "^0.21.0",
  "tree-sitter-java": "^0.21.0",
  "tree-sitter-python": "^0.21.0"
}
```

---

## 💻 代碼示例對比

### Babel Parser 方式

```typescript
// 現有方式
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const ast = parse(code, {
  sourceType: 'module',
  plugins: ['typescript', 'jsx', 'decorators-legacy'],
});

traverse(ast, {
  ClassDeclaration(path) {
    // Babel specific API
    const className = path.node.id.name;
    // ...
  },
});
```

### tree-sitter 方式

```typescript
// 統一方式（所有語言）
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const tree = parser.parse(code);
const cursor = tree.walk();

// 統一的 API（適用於所有語言）
function visitNode(node) {
  if (node.type === 'class_declaration') {
    const className = node.childForFieldName('name').text;
    // ...
  }
  
  for (let child of node.children) {
    visitNode(child);
  }
}
```

---

## 🎯 最終推薦：方案 B（全 tree-sitter）

### 推薦理由

1. **長期收益顯著**
   - 統一的技術棧，維護成本降低 50%+
   - 添加新語言極其簡單（2-3 天/語言）
   - 代碼量減少 30%+

2. **架構更優雅**
   - 符合 DRY 原則（Don't Repeat Yourself）
   - 統一的 AST 轉換邏輯
   - 更清晰的代碼結構

3. **性能更好**
   - tree-sitter 比 Babel 快 2-3 倍
   - 增量解析支持（未來優化）
   - 記憶體使用更少

4. **未來可擴展**
   - 支持 40+ 語言
   - WASM 版本可在瀏覽器運行
   - 語法高亮、代碼折疊等功能

### 遷移成本評估

| 任務 | 工作量 | 風險 |
|------|--------|------|
| 學習 tree-sitter API | 0.5 天 | 低 |
| 重寫 TypeScript Parser | 2-3 天 | 中 |
| 調整測試用例 | 1-2 天 | 低 |
| 性能測試和優化 | 0.5 天 | 低 |
| **總計** | **4-6 天** | **中低** |

**結論**: 多花 1-2 天遷移成本，換來長期的架構優勢，非常值得！

---

## 📋 更新後的實施計劃

### Phase 1: Parser 抽象層 (3-4 天) - 不變

創建統一的 Parser 接口

### Phase 2: TypeScript Parser (4-5 天) - 調整 +1-2 天

- 使用 `tree-sitter-typescript` 和 `tree-sitter-javascript`
- 實現 Tree-sitter AST → UnifiedAST 轉換
- 確保所有現有測試通過

### Phase 3: Java Parser (3-4 天) - 減少 1 天

- 使用 `tree-sitter-java`
- 復用 Phase 2 的 AST 轉換框架

### Phase 4: Python Parser (3-4 天) - 減少 1 天

- 使用 `tree-sitter-python`
- 復用 Phase 2 的 AST 轉換框架

### Phase 5: 集成 (2-3 天) - 減少 1 天

統一的 Parser API，集成更簡單

### Phase 6: 測試和文檔 (2-3 天) - 不變

**總工作量**: 17-23 天（vs 原計劃 19-25 天，節省 2 天）

---

## 🚀 行動建議

### 推薦：採用方案 B（全 tree-sitter）

**理由**:
1. 長期架構優勢遠大於短期遷移成本
2. 總工作量反而更少（減少 2 天）
3. 維護成本大幅降低
4. 為未來擴展打下堅實基礎

### 備選：採用方案 A（Babel + tree-sitter）

**適用場景**:
- 時間壓力極大（必須在 2 週內完成）
- 團隊不願承擔任何遷移風險
- 短期項目，無需考慮長期維護

---

## 📚 參考資料

### tree-sitter 資源

- [tree-sitter 官方文檔](https://tree-sitter.github.io/tree-sitter/)
- [tree-sitter-typescript](https://github.com/tree-sitter/tree-sitter-typescript)
- [tree-sitter-javascript](https://github.com/tree-sitter/tree-sitter-javascript)
- [Tree-sitter Playground](https://tree-sitter.github.io/tree-sitter/playground)

### 使用 tree-sitter 的項目

- **GitHub**: 用於代碼導航和語法高亮
- **Neovim**: 用於語法高亮和代碼分析
- **Atom Editor**: 用於語法解析
- **Difftastic**: 結構化 diff 工具

---

## ✅ 決策記錄

| 日期 | 決策 | 理由 |
|------|------|------|
| 2025-11-18 | **推薦全 tree-sitter 方案** | 架構優勢、維護成本、長期收益 |

---

**下一步**: 等待最終決策，準備開始 Phase 1 實施 🚀
