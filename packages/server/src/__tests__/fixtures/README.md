# Test Fixtures

这个目录包含了所有测试所需的mock数据（fixtures），帮助你编写清晰、可维护的测试。

## 📁 目录结构

```
fixtures/
├── index.ts                    # 统一导出所有fixtures
├── analysis.fixtures.ts        # 分析相关的fixtures
├── config.fixtures.ts          # 配置相关的fixtures
├── file.fixtures.ts            # 文件相关的fixtures
├── project.fixtures.ts         # 项目相关的fixtures
├── python/                     # Python 测试文件
│   ├── Animal.py              # 基础 Animal 类
│   ├── Dog.py                 # Dog 类（继承 Animal）
│   └── User.py                # User 类（带类型注解）
├── java/                       # Java 测试文件
│   ├── Animal.java            # 基础 Animal 类
│   ├── Dog.java               # Dog 类（继承 Animal）
│   ├── Cat.java               # Cat 类（继承 Animal，实现 IAnimal）
│   ├── IAnimal.java           # IAnimal 接口
│   └── User.java              # User 类（带泛型）
└── builders/                   # Builder模式的fixtures
    ├── index.ts
    ├── analysisBuilder.ts      # 动态构建AnalysisResult
    └── configBuilder.ts        # 动态构建ProjectConfig
```

---

## 🎯 使用方式

### 方式1：使用预定义的Fixtures

最简单的方式，直接导入使用：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mockAnalysisResult, mockOpenAIConfig, mockFileContent } from '../../fixtures/index.js';

describe('My Test', () => {
  it('should work with fixtures', () => {
    // ✅ 直接使用预定义的fixtures
    vi.mocked(AIService).mockImplementation(
      () =>
        ({
          analyzeCode: vi.fn().mockResolvedValue(mockAnalysisResult),
          getConfig: vi.fn().mockResolvedValue(mockOpenAIConfig),
        }) as any
    );

    // 测试代码...
  });
});
```

**优点**：

- 简单直接
- 数据一致性好
- 易于维护

**适用场景**：

- 标准场景
- 常用数据

---

### 方式2：使用Builder动态构建

需要自定义数据时，使用Builder模式：

```typescript
import { buildAnalysisResult, buildConfig } from '../../fixtures/index.js';

describe('Complex Test', () => {
  it('should handle multiple critical issues', () => {
    // ✅ 使用builder动态创建自定义fixture
    const result = buildAnalysisResult()
      .addCriticalIssue('SQL injection detected', 10)
      .addCriticalIssue('XSS vulnerability', 25)
      .addSecurityIssue('Hardcoded API key', 42)
      .withAutoSummary() // 自动生成summary
      .build();

    vi.mocked(AIService).mockImplementation(
      () =>
        ({
          analyzeCode: vi.fn().mockResolvedValue(result),
        }) as any
    );

    // 测试代码...
  });

  it('should work with custom config', () => {
    // ✅ 使用builder创建自定义配置
    const config = buildConfig()
      .forVueProject() // 预设为Vue项目
      .asGPT4Turbo() // 使用GPT-4 Turbo
      .withMaxFileSize(10485760) // 10MB限制
      .build();

    vi.mocked(ConfigService).mockImplementation(
      () =>
        ({
          get: vi.fn().mockResolvedValue(config),
        }) as any
    );

    // 测试代码...
  });
});
```

**优点**：

- 高度灵活
- 可读性强
- 支持链式调用

**适用场景**：

- 复杂场景
- 需要动态数据
- 多变的测试条件

---

### 方式3：混合使用

基于预定义fixture创建变体：

```typescript
import { mockAnalysisResult } from '../../fixtures/index.js';

describe('Hybrid Test', () => {
  it('should modify existing fixture', () => {
    // ✅ 基于预定义fixture创建变体
    const modifiedResult = {
      ...mockAnalysisResult,
      timestamp: '2025-01-01T00:00:00.000Z',
      summary: 'Custom summary for this specific test',
    };

    vi.mocked(AIService).mockImplementation(
      () =>
        ({
          analyzeCode: vi.fn().mockResolvedValue(modifiedResult),
        }) as any
    );

    // 测试代码...
  });
});
```

---

## 📦 可用的Fixtures

### Analysis Fixtures (analysis.fixtures.ts)

| Fixture                       | 描述                            |
| ----------------------------- | ------------------------------- |
| `mockAnalysisResult`          | 基础分析结果，包含1个medium问题 |
| `mockEmptyAnalysisResult`     | 空结果，无问题                  |
| `mockMultipleIssuesResult`    | 多问题结果（3个不同severity）   |
| `mockSecurityIssuesResult`    | 安全问题结果                    |
| `mockPerformanceIssuesResult` | 性能问题结果                    |

### Config Fixtures (config.fixtures.ts)

| Fixture                      | 描述                        |
| ---------------------------- | --------------------------- |
| `mockOpenAIConfig`           | 默认OpenAI配置              |
| `mockUnconfiguredConfig`     | 未配置的config（空API key） |
| `mockGPT4TurboConfig`        | GPT-4 Turbo配置             |
| `mockGPT35Config`            | GPT-3.5配置                 |
| `mockMinimalConfig`          | 最小化配置                  |
| `mockCustomExtensionsConfig` | 自定义扩展名配置            |
| `mockLargeFileConfig`        | 大文件配置（10MB限制）      |

### File Fixtures (file.fixtures.ts)

| Fixture              | 描述                   |
| -------------------- | ---------------------- |
| `mockFileInfo`       | 基础文件信息           |
| `mockLargeFileInfo`  | 大文件信息（10MB）     |
| `mockSmallFileInfo`  | 小文件信息             |
| `mockDirectoryInfo`  | 目录信息               |
| `mockFileContent`    | TypeScript测试代码内容 |
| `mockVueFileContent` | Vue组件内容            |
| `mockJsFileContent`  | JavaScript文件内容     |
| `mockFileChunk`      | 文件块（分块读取）     |
| `mockFirstChunk`     | 第一块文件内容         |
| `mockLastChunk`      | 最后一块文件内容       |
| `mockCompleteFile`   | 完整文件（非大文件）   |
| `mockPythonAnimalContent` | Python Animal 类内容 |
| `mockPythonDogContent` | Python Dog 类内容（继承） |
| `mockPythonUserContent` | Python User 类内容（类型注解） |
| `mockJavaAnimalContent` | Java Animal 类内容 |
| `mockJavaDogContent` | Java Dog 类内容（继承） |
| `mockJavaUserContent` | Java User 类内容（泛型） |
| `mockJavaIAnimalContent` | Java IAnimal 接口内容 |
| `mockJavaCatContent` | Java Cat 类内容（继承+接口） |

### Python Test Files (python/)

| 文件 | 描述 | 特性 |
|------|------|------|
| `Animal.py` | 基础 Animal 类 | 类型注解、方法定义 |
| `Dog.py` | Dog 类（继承 Animal） | 继承、方法重写 |
| `User.py` | User 类 | 类型注解、泛型类型（List, Dict） |

### Java Test Files (java/)

| 文件 | 描述 | 特性 |
|------|------|------|
| `Animal.java` | 基础 Animal 类 | 访问修饰符、方法定义 |
| `Dog.java` | Dog 类（继承 Animal） | 继承、方法重写 |
| `Cat.java` | Cat 类 | 继承 + 实现接口 |
| `IAnimal.java` | IAnimal 接口 | 接口定义 |
| `User.java` | User 类 | 泛型类型（List, Map） |

### Project Fixtures (project.fixtures.ts)

| Fixture                | 描述                   |
| ---------------------- | ---------------------- |
| `mockProjectInfo`      | 基础项目信息           |
| `mockLargeProjectInfo` | 大型项目信息           |
| `mockSmallProjectInfo` | 小型项目信息           |
| `mockFileTree`         | 文件树（嵌套结构）     |
| `mockFlatFileTree`     | 简单文件树（扁平结构） |
| `mockDeepFileTree`     | 深度嵌套文件树         |
| `mockEmptyProject`     | 空项目                 |

---

## 🏗️ Builder API

### AnalysisResultBuilder

```typescript
buildAnalysisResult()
  // 添加issues
  .addIssue({ severity: 'medium', line: 10, message: 'Issue' })
  .addCriticalIssue('Critical issue', 10)
  .addHighIssue('High priority issue', 20)
  .addMediumIssue('Medium issue', 30)
  .addSecurityIssue('Security problem', 40)
  .addPerformanceIssue('Performance problem', 50)
  .addIssueWithExample('Bad code', 60, 'before', 'after')

  // 设置属性
  .withSummary('Custom summary')
  .withTimestamp('2025-01-01T00:00:00.000Z')
  .withAutoSummary() // 自动生成summary

  // 构建
  .build();
```

### ConfigBuilder

```typescript
buildConfig()
  // 基础设置
  .withProvider('openai')
  .withApiKey('sk-custom-key')
  .withModel('gpt-4-turbo')
  .withTimeout(120000)

  // 忽略模式
  .withIgnorePatterns(['node_modules', 'dist'])
  .addIgnorePattern('.git')
  .withCommonNodeIgnores()

  // 文件扩展名
  .withAnalyzableExtensions(['.ts', '.js'])
  .addAnalyzableExtension('.vue')

  // 快捷方法
  .asGPT4()
  .asGPT4Turbo()
  .asGPT35()
  .forTypeScriptProject()
  .forVueProject()
  .forFullStackProject()

  // 其他
  .withMaxFileSize(10485760)
  .minimal()
  .unconfigured()

  // 构建
  .build();
```

---

## 📝 示例：完整测试文件

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { analysisRouter } from '../../../routes/analysis.js';
import { AIService } from '../../../services/aiService.js';
import { mockAnalysisResult, mockOpenAIConfig, buildAnalysisResult } from '../../fixtures/index.js';

vi.mock('../../../services/aiService.js');

describe('Analysis API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analysis', analysisRouter);
    vi.clearAllMocks();
  });

  it('should analyze code successfully', async () => {
    // ✅ 使用预定义fixture
    vi.mocked(AIService).mockImplementation(
      () =>
        ({
          isConfigured: vi.fn().mockResolvedValue(true),
          analyzeCode: vi.fn().mockResolvedValue(mockAnalysisResult),
          getConfig: vi.fn().mockResolvedValue(mockOpenAIConfig),
        }) as any
    );

    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ code: 'const x = 1;' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle critical security issues', async () => {
    // ✅ 使用builder创建自定义数据
    const criticalResult = buildAnalysisResult()
      .addCriticalIssue('SQL injection vulnerability', 42)
      .addSecurityIssue('XSS detected', 55, 'high')
      .withAutoSummary()
      .build();

    vi.mocked(AIService).mockImplementation(
      () =>
        ({
          isConfigured: vi.fn().mockResolvedValue(true),
          analyzeCode: vi.fn().mockResolvedValue(criticalResult),
        }) as any
    );

    const response = await request(app)
      .post('/api/analysis/analyze')
      .send({ code: 'const x = 1;' });

    expect(response.status).toBe(200);
    expect(response.body.data.issues).toHaveLength(2);
    expect(response.body.data.issues[0].severity).toBe('critical');
  });
});
```

---

## 🎨 最佳实践

### ✅ DO

1. **优先使用预定义fixtures**

   ```typescript
   // ✅ Good
   import { mockAnalysisResult } from '../../fixtures/index.js';
   ```

2. **复杂场景使用builder**

   ```typescript
   // ✅ Good
   const result = buildAnalysisResult()
     .addCriticalIssue('SQL injection', 10)
     .withAutoSummary()
     .build();
   ```

3. **保持fixtures简单和专注**
   ```typescript
   // ✅ Good - 专注于单一场景
   export const mockEmptyAnalysisResult = {
     issues: [],
     summary: 'No issues found',
     timestamp: '2024-01-01T00:00:00.000Z',
   };
   ```

### ❌ DON'T

1. **不要在测试中内联大量mock数据**

   ```typescript
   // ❌ Bad
   const mockResult = {
     issues: [
       { severity: 'high', category: 'bug', line: 10, ... },
       { severity: 'medium', category: 'quality', line: 20, ... },
       // ... 很多重复的数据
     ],
     summary: '...',
     timestamp: '...',
   };
   ```

2. **不要修改导出的fixture对象**

   ```typescript
   // ❌ Bad - 会影响其他测试
   mockAnalysisResult.summary = 'Modified';

   // ✅ Good - 创建新对象
   const modified = { ...mockAnalysisResult, summary: 'Modified' };
   ```

3. **不要创建过于复杂的fixtures**

   ```typescript
   // ❌ Bad - 太复杂，难以理解
   export const mockSuperComplexResult = { ... };

   // ✅ Good - 使用builder
   buildAnalysisResult().addCriticalIssue(...).build();
   ```

---

## 🔄 维护指南

### 添加新的Fixture

1. 在对应的fixtures文件中添加（如`analysis.fixtures.ts`）
2. 在`index.ts`中导出
3. 在此README中更新文档

### 添加新的Builder方法

1. 在对应的builder文件中实现
2. 添加JSDoc注释
3. 更新此README的Builder API部分

---

## 📚 参考

- **测试示例**：`src/__tests__/integration/api/analysis.test.ts`
- **Builder示例**：`src/__tests__/integration/api/file.test.ts`

## 🌐 多語言測試文件

### Python 測試文件

位於 `python/` 目錄，包含：

- **`Animal.py`**: 基礎 Animal 類，用於測試類定義、方法、類型註解
- **`Dog.py`**: Dog 類繼承 Animal，用於測試繼承關係
- **`User.py`**: User 類帶類型註解，用於測試泛型類型（List, Dict）

### Java 測試文件

位於 `java/` 目錄，包含：

- **`Animal.java`**: 基礎 Animal 類，用於測試類定義、訪問修飾符
- **`Dog.java`**: Dog 類繼承 Animal，用於測試繼承關係
- **`Cat.java`**: Cat 類繼承 Animal 並實現 IAnimal，用於測試繼承+接口實現
- **`IAnimal.java`**: IAnimal 接口，用於測試接口定義
- **`User.java`**: User 類帶泛型，用於測試泛型類型（List, Map）

### 使用範例

```typescript
import { 
  mockPythonAnimalContent, 
  mockJavaDogContent 
} from '../../fixtures/index.js';
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';

describe('Multi-language support', () => {
  it('should parse Python code', async () => {
    const fileProvider = new NodeFileProvider('/path/to/project');
    const analyzer = new UMLAnalyzer(fileProvider);
    
    // 使用 Python fixture
    const result = await analyzer.generateDiagram(
      mockPythonAnimalContent, 
      'class',
      'Animal.py'
    );
    
    expect(result.metadata?.classes).toBeDefined();
  });
  
  it('should parse Java code', async () => {
    const fileProvider = new NodeFileProvider('/path/to/project');
    const analyzer = new UMLAnalyzer(fileProvider);
    
    // 使用 Java fixture
    const result = await analyzer.generateDiagram(
      mockJavaDogContent,
      'class',
      'Dog.java'
    );
    
    expect(result.metadata?.classes).toBeDefined();
  });
});
```

---

**Happy Testing! 🎉**
