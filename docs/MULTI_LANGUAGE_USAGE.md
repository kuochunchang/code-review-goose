# 多語言支援使用指南

> **Multi-Language Support Usage Guide**

本指南說明如何在 Goose Code Review 中使用多語言支援功能。

## 概述

Goose Code Review 現在支持多種編程語言的分析和 UML 圖生成：

- **TypeScript/JavaScript**: 完整支援（類圖、序列圖、流程圖）
- **Java**: 類圖支援（繼承、接口、泛型）
- **Python**: 類圖支援（繼承、類型註解）

## 基本使用

### 自動語言檢測

系統會根據文件擴展名自動檢測語言：

```bash
# 分析 TypeScript 文件
goose  # 在包含 .ts 文件的項目中運行

# 分析 Java 文件
goose  # 在包含 .java 文件的項目中運行

# 分析 Python 文件
goose  # 在包含 .py 文件的項目中運行
```

### 支持的文件擴展名

- **TypeScript**: `.ts`, `.tsx`, `.mts`, `.cts`
- **JavaScript**: `.js`, `.jsx`, `.mjs`, `.cjs`
- **Java**: `.java`
- **Python**: `.py`, `.pyi`, `.pyw`

## 使用範例

### TypeScript/JavaScript

```typescript
// User.ts
export class User {
  private name: string;
  public age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  getName(): string {
    return this.name;
  }
}
```

運行 `goose` 後，系統會自動：
1. 檢測到 `.ts` 文件
2. 使用 TypeScript parser 解析
3. 生成類圖顯示 `User` 類及其屬性和方法

### Java

```java
// User.java
package com.example;

public class User {
    private String name;
    public int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() {
        return name;
    }
}
```

系統會：
1. 檢測到 `.java` 文件
2. 使用 Java parser (tree-sitter) 解析
3. 生成類圖顯示類、屬性、方法和訪問修飾符

### Python

```python
# user.py
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def get_name(self) -> str:
        return self.name
```

系統會：
1. 檢測到 `.py` 文件
2. 使用 Python parser (tree-sitter) 解析
3. 生成類圖顯示類、方法和類型註解

## 高級功能

### 跨文件分析

所有支持的語言都支持跨文件分析（depth > 0）：

```bash
# 分析單個文件
goose  # depth=0 (默認)

# 跨文件分析（深度 1-3）
# 在 Web UI 中選擇 "Cross-file Analysis" 並設置深度
```

### 繼承關係

系統會自動識別類的繼承關係：

**Java**:
```java
class Animal {
    String name;
}

class Dog extends Animal {
    String breed;
}
```

**Python**:
```python
class Animal:
    def speak(self) -> str:
        return "Some sound"

class Dog(Animal):
    def speak(self) -> str:
        return "Woof"
```

生成的類圖會顯示 `Dog` 繼承自 `Animal` 的關係。

### 類型註解

**Python Type Hints**:
```python
from typing import List, Dict

def process_data(items: List[str], config: Dict[str, int]) -> Dict[str, int]:
    return {}
```

系統會解析並顯示類型信息。

## 技術實現

### Parser 架構

系統使用統一的 Parser 抽象層：

```
ParserService
    ├── TypeScriptParser (Babel)
    ├── JavaScriptParser (Babel)
    ├── JavaParser (tree-sitter)
    └── PythonParser (tree-sitter)
```

### 統一 AST

所有語言解析後都轉換為 `UnifiedAST` 格式：

```typescript
interface UnifiedAST {
  language: SupportedLanguage;
  filePath: string;
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: DependencyInfo[];
}
```

## 限制和注意事項

### 當前限制

1. **序列圖和流程圖**: 目前僅支持 TypeScript/JavaScript
   - Java 和 Python 的序列圖/流程圖支援計劃在未來版本中添加

2. **部分 Python 特性**: 
   - Decorators (`@property`, `@staticmethod`) 尚未完全支援
   - Dataclasses 尚未支援

3. **Java 特性**:
   - 內部類（Inner classes）尚未完全支援
   - Lambda 表達式尚未支援

### 性能考慮

- **Tree-sitter**: Java 和 Python 使用 tree-sitter 解析，性能優異且容錯性強
- **Babel**: TypeScript/JavaScript 繼續使用成熟的 Babel parser
- **緩存**: 解析結果會被緩存以提高性能

## 故障排除

### 文件無法識別

如果文件無法被識別：

1. 檢查文件擴展名是否在支持列表中
2. 確認文件路徑正確
3. 查看控制台錯誤信息

### 解析錯誤

如果遇到解析錯誤：

1. **Java**: 確保代碼語法正確，tree-sitter 會盡可能解析部分代碼
2. **Python**: 確保使用 Python 3.5+ 語法（支持類型註解）
3. **TypeScript/JavaScript**: 檢查是否有語法錯誤

### 類圖不完整

如果生成的類圖缺少某些信息：

1. 檢查代碼是否包含完整的類定義
2. 確認訪問修飾符和類型註解正確
3. 對於跨文件分析，確保相關文件都在項目中

## 未來計劃

計劃在未來版本中添加：

- [ ] Java 和 Python 的序列圖支援
- [ ] Java 和 Python 的流程圖支援
- [ ] Python Decorators 完整支援
- [ ] Java Lambda 表達式支援
- [ ] Go 語言支援
- [ ] 更多語言特性支援

## 相關文檔

- [架構文檔](./ARCHITECTURE.md)
- [多語言支援計劃](./MULTI_LANGUAGE_SUPPORT_PLAN.md)
- [開發指南](./DEVELOPMENT.md)

## 貢獻

歡迎貢獻新的語言支援或改進現有功能！請查看 [開發指南](./DEVELOPMENT.md) 了解如何添加新的 parser。
