# Goose Code Review 项目重构计划文档

> 版本：v1.0
> 创建日期：2025-01-16
> 状态：待执行

---

## 📋 执行概要

**目标**：将 UML 分析功能抽离为独立的 npm 包，构建可扩展的分析工具生态系统，支持多端复用（Web、VS Code 插件、CLI）。

**预计工作量**：4-6 周
**团队规模**：1-2 人
**风险等级**：低（保留现有功能，增量重构）

---

## 🎯 核心目标

### 业务目标

1. **提升代码复用率**：核心分析逻辑从 0% 复用提升至 80%+
2. **支持多端部署**：Web、VS Code 插件、CLI 共享同一套核心代码
3. **简化测试流程**：核心逻辑测试时间从分钟级降至毫秒级
4. **建立生态系统**：为未来的分析工具（依赖分析、代码质量分析等）建立可扩展架构

### 技术目标

1. **平台无关的核心引擎**：零依赖 Node.js 或浏览器特定 API
2. **适配器模式**：通过接口抽象文件系统操作
3. **Monorepo 架构**：使用 npm workspaces + TypeScript Project References
4. **独立版本管理**：使用 Changesets 管理包版本和发布

---

## 📦 新的包架构设计

### 包组织结构

```
code-review-goose/                          # Monorepo 根目录
├── packages/
│   ├── analysis-types/                     # 🆕 共享类型定义（零依赖）
│   ├── analysis-utils/                     # 🆕 共享工具函数
│   ├── analysis-core/                      # 🆕 核心分析引擎（平台无关）
│   ├── analysis-adapter-node/              # 🆕 Node.js 文件系统适配器
│   ├── analysis-adapter-vscode/            # 🆕 VS Code 适配器（Phase 7）
│   ├── vscode-extension/                   # 🆕 VS Code 插件（Phase 7）
│   ├── server/                             # 🔧 重构：使用新包
│   ├── web/                                # ✅ 保持不变
│   └── cli/                                # ✅ 保持不变
│
├── future-tools/                           # 🚀 未来扩展
│   ├── dependency-analyzer/
│   └── code-quality-analyzer/
│
├── tsconfig.base.json                      # 共享 TypeScript 配置
├── .changeset/                             # Changesets 配置
└── package.json                            # Workspaces 根配置
```

### 包职责划分

| 包名                                         | 职责                        | 发布到 npm | 依赖                                      |
| -------------------------------------------- | --------------------------- | ---------- | ----------------------------------------- |
| `@code-review-goose/analysis-types`          | 类型定义、接口声明          | ✅ Public  | 零依赖                                    |
| `@code-review-goose/analysis-utils`          | Mermaid 验证、AST 辅助函数  | ✅ Public  | analysis-types                            |
| `@code-review-goose/analysis-core`           | UML 生成、OO 分析、序列分析 | ✅ Public  | analysis-types, analysis-utils, @babel/\* |
| `@code-review-goose/analysis-adapter-node`   | Node.js 文件系统实现        | ✅ Public  | analysis-types, fs-extra                  |
| `@code-review-goose/analysis-adapter-vscode` | VS Code API 实现            | ✅ Public  | analysis-types, vscode                    |
| `@code-review-goose/server`                  | Express 后端服务            | ❌ Private | analysis-core, adapter-node               |
| `@code-review-goose/web`                     | Vue 3 前端应用              | ❌ Private | 无（调用 API）                            |
| `@code-review-goose/vscode-extension`        | VS Code 插件                | ❌ Private | analysis-core, adapter-vscode             |

---

## 🔄 核心架构设计

### 依赖倒置原则（Dependency Inversion）

**关键接口设计**：

```typescript
// 文件系统抽象接口
export interface IFileProvider {
  readFile(path: string): Promise<string>;
  resolveImport(from: string, to: string): Promise<string | null>;
  listFiles(pattern: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}
```

**实现方式**：

- `NodeFileProvider`：使用 `fs-extra` 实现（Web/CLI 使用）
- `VSCodeFileProvider`：使用 `vscode.workspace.fs` 实现（VS Code 插件使用）
- 未来可扩展：`BrowserFileProvider`（浏览器内存文件系统）

### 核心分析引擎（Platform-Agnostic）

**设计原则**：

- ✅ 无文件系统直接依赖（通过 `IFileProvider` 接口）
- ✅ 无平台特定 API（Node.js/Browser/VS Code）
- ✅ 纯业务逻辑（AST 解析、关系分析、Mermaid 生成）
- ✅ 100% 可单元测试（Mock `IFileProvider`）

**核心组件**：

- `UMLAnalyzer`：UML 图表生成总控
- `OOAnalyzer`：面向对象关系分析
- `SequenceAnalyzer`：序列图分析
- `CrossFileAnalyzer`：跨文件依赖分析

---

## 📅 实施计划（6 个 Phase）

### Phase 1: 基础设施搭建（第 1 周，2-3 天）

**目标**：建立 monorepo 基础架构

**任务清单**：

- [ ] 创建新包目录结构（4 个核心包）
- [ ] 配置 TypeScript Project References
  - 创建 `tsconfig.base.json`
  - 为每个包创建 `tsconfig.json` 并配置 `references`
- [ ] 安装和配置 Changesets
  - `npm install -D @changesets/cli`
  - `npx changeset init`
  - 配置独立版本策略
- [ ] 更新根 `package.json`
  - 配置 `workspaces: ["packages/*"]`
  - 配置统一的 scripts（build、test、lint）

**交付成果**：

- ✅ Monorepo 结构就绪
- ✅ 可以运行 `npm install` 并正常工作
- ✅ TypeScript 增量编译配置完成

---

### Phase 2: 抽离类型定义（第 1-2 周，2-3 天）

**目标**：创建零依赖的类型包

**迁移内容**：

- `packages/server/src/types/ast.ts` → `packages/analysis-types/src/ast.ts`
- 新增 `packages/analysis-types/src/providers.ts`（适配器接口）
- 新增 `packages/analysis-types/src/uml.ts`（UML 相关类型）

**关键接口**：

- `IFileProvider`：文件系统抽象
- `ICacheProvider`：缓存抽象（可选）
- 所有 AST 相关类型（`ClassInfo`, `MethodInfo`, `DependencyInfo` 等）

**验证标准**：

- [ ] 包可以独立编译
- [ ] 零运行时依赖（`dependencies: {}`）
- [ ] 所有导出类型可以被其他包引用

---

### Phase 3: 抽离核心分析引擎（第 2-3 周，3-4 天）

**目标**：创建平台无关的核心包

**迁移内容**：

从 `packages/server/src/services/` 迁移以下文件：

- `umlService.ts` → `analyzers/UMLAnalyzer.ts`
- `ooAnalysisService.ts` → `analyzers/OOAnalyzer.ts`
- `sequenceAnalysisService.ts` → `analyzers/SequenceAnalyzer.ts`
- `crossFileAnalysisService.ts` → `analyzers/CrossFileAnalyzer.ts`
- `uml/mermaidValidator.ts` → 移至 `analysis-utils` 包

**关键改造**：

- 移除所有 `fs.readFile()` 调用 → 改为 `this.fileProvider.readFile()`
- 移除所有 `path.join()` 调用 → 改为接口方法
- 通过构造函数注入 `IFileProvider`

**验证标准**：

- [ ] 所有核心逻辑可以用 Mock 测试（无需真实文件）
- [ ] 测试覆盖率 ≥ 80%
- [ ] 测试运行时间 < 1 秒（Vitest）

---

### Phase 4: 创建 Node.js 适配器（第 3 周，2-3 天）

**目标**：实现 Node.js 文件系统适配器

**实现内容**：

- `NodeFileProvider`：实现 `IFileProvider` 接口
- `PathResolver`：从现有代码迁移并适配
- `ImportIndexBuilder`：从现有代码迁移并适配
- `NodeCacheProvider`：包装现有 `InsightService`（可选）

**验证标准**：

- [ ] 适配器可以正确读取文件
- [ ] 路径解析与现有逻辑一致
- [ ] 集成测试通过（使用真实文件）

---

### Phase 5: 重构 Server 包（第 4 周，2-3 天）

**目标**：更新 server 使用新包

**重构范围**：

- `routes/uml.ts`：改用 `UMLAnalyzer` + `NodeFileProvider`
- 删除已迁移的服务文件（`umlService.ts` 等）
- 更新 `package.json` 依赖

**迁移示例**：

```typescript
// 重构前
import { UMLService } from '../services/umlService.js';
const umlService = new UMLService();
const result = await umlService.generateUnifiedDiagram(filePath, projectPath, type);

// 重构后
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';
const fileProvider = new NodeFileProvider(projectPath);
const analyzer = new UMLAnalyzer(fileProvider);
const result = await analyzer.analyzeClass(filePath, { depth, mode });
```

**验证标准**：

- [ ] 所有现有 API 端点功能不变
- [ ] E2E 测试 100% 通过（Playwright）
- [ ] 性能无明显下降（< 5% 差异）

---

### Phase 6: 测试和文档（第 4-5 周，2-3 天）

**目标**：完善测试和文档

**测试策略**：

| 层级                      | 工具              | 覆盖率目标 | 运行时间 |
| ------------------------- | ----------------- | ---------- | -------- |
| 核心逻辑（analysis-core） | Vitest + Mock     | 80%+       | < 1 秒   |
| 适配器（adapter-node）    | Vitest + 真实文件 | 70%+       | < 5 秒   |
| 集成（server）            | Vitest            | 60%+       | < 10 秒  |
| E2E（web）                | Playwright        | 80%+       | 30-60 秒 |

**文档清单**：

- [ ] 每个包的 `README.md`（安装、使用示例、API 文档）
- [ ] `ARCHITECTURE.md`（架构设计说明）
- [ ] `MIGRATION.md`（迁移指南，如有 breaking changes）
- [ ] `CONTRIBUTING.md`（贡献指南）

---

### Phase 7: VS Code 插件开发（第 5-6 周，可选）

**目标**：开发 VS Code 插件，复用核心代码

**新增包**：

- `packages/analysis-adapter-vscode/`：VS Code 文件系统适配器
- `packages/vscode-extension/`：VS Code 插件主体

**核心功能**：

- 右键菜单：生成类图、序列图、流程图
- Webview 渲染：显示 Mermaid 图表
- 配置项：分析深度、分析模式
- 命令面板：快速访问 UML 功能

**验证标准**：

- [ ] 插件可以正常安装和激活
- [ ] UML 生成结果与 Web 版本一致
- [ ] Webview 正确渲染 Mermaid 图表

---

## 📊 工作量估算

| Phase    | 工作日       | 主要任务      | 交付成果                  |
| -------- | ------------ | ------------- | ------------------------- |
| Phase 1  | 2-3 天       | Monorepo 搭建 | 基础架构就绪              |
| Phase 2  | 2-3 天       | 类型抽离      | analysis-types 包         |
| Phase 3  | 3-4 天       | 核心引擎抽离  | analysis-core 包          |
| Phase 4  | 2-3 天       | Node 适配器   | analysis-adapter-node 包  |
| Phase 5  | 2-3 天       | Server 重构   | Server 使用新包           |
| Phase 6  | 2-3 天       | 测试和文档    | 完整文档和测试            |
| Phase 7  | 7-10 天      | VS Code 插件  | 双端支持（可选）          |
| **总计** | **14-21 天** | -             | **可扩展架构 + 多端支持** |

---

## 🎯 关键决策记录

### 决策 1: 单 Monorepo vs 多 Repo

**选择**：单 Monorepo
**理由**：

- 原子性提交（跨包修改在一个 commit）
- 本地开发无需 npm link
- 版本协调简单（Changesets 自动处理）
- 重构时编译器帮助发现所有需要修改的地方

### 决策 2: 独立版本 vs 统一版本

**选择**：独立版本
**理由**：

- 类型包很少改动，不需要频繁升级版本
- 允许包独立演进
- 用户只更新需要的包

### 决策 3: 适配器模式 vs 直接依赖

**选择**：适配器模式（依赖倒置）
**理由**：

- 核心逻辑可以用 Mock 快速测试
- 支持多平台（Node.js、VS Code、浏览器）
- 易于添加新的平台支持

### 决策 4: 测试策略

**选择**：分层测试（核心 Vitest + E2E Playwright）
**理由**：

- 核心逻辑用 Vitest Mock 测试（毫秒级，80% 覆盖率）
- E2E 保留 Playwright（秒级，覆盖关键流程）
- VS Code 集成测试轻量化（30-40% 覆盖率）

---

## 🚀 成功标准

### 必须达成（Must Have）

- [ ] 核心分析逻辑抽离为独立包
- [ ] Server 成功使用新包，功能无回归
- [ ] 所有现有测试通过（单元测试 + E2E 测试）
- [ ] 核心包测试覆盖率 ≥ 80%
- [ ] 至少 3 个包成功发布到 npm
- [ ] 每个包有完整的 README 文档

### 应该达成（Should Have）

- [ ] VS Code 插件开发完成
- [ ] 架构文档完整（ARCHITECTURE.md）
- [ ] CI/CD 自动发布流程
- [ ] 性能无明显下降（< 5%）

### 可以达成（Could Have）

- [ ] 浏览器适配器（future）
- [ ] 依赖分析工具（future）
- [ ] 代码质量分析工具（future）

---

## ⚠️ 风险管理

### 风险 1: 重构导致功能回归

**等级**：中
**缓解措施**：

- 保持现有 E2E 测试运行
- 逐步迁移，每个 Phase 独立验证
- 使用 TypeScript 编译器检查类型安全

### 风险 2: 包依赖关系复杂

**等级**：低
**缓解措施**：

- 使用 TypeScript Project References 强制依赖顺序
- 遵循分层架构：types → utils → core → adapters

### 风险 3: 性能下降

**等级**：低
**缓解措施**：

- 适配器接口开销可忽略（函数调用级别）
- Phase 6 进行性能基准测试
- 如有问题，可以优化热路径

### 风险 4: 测试覆盖率不达标

**等级**：低
**缓解措施**：

- 核心逻辑用 Mock 测试简单（目标 80%）
- E2E 测试保留现有 Playwright 套件
- VS Code 集成测试适当放宽（30-40%）

---

## 📈 预期收益

### 开发效率提升

- **测试速度**：核心逻辑测试从 30 秒 → 1 秒（30 倍提升）
- **调试时间**：从 2 小时 → 20 分钟（6 倍提升）
- **CI 运行**：从 10 分钟 → 1 分钟（10 倍提升）

### 代码质量提升

- **代码复用率**：从 0% → 80%+
- **测试覆盖率**：核心逻辑 80%+
- **Bug 发现**：单元测试立即发现问题

### 可扩展性提升

- **多端支持**：Web、VS Code、CLI 共享核心代码
- **新功能开发**：核心逻辑修改一次，所有平台受益
- **生态系统**：为未来分析工具建立基础

---

## 🔧 技术栈和工具

### Monorepo 管理

- **npm workspaces**（内置，无需额外工具）
- **Changesets**（版本管理和发布）
- **TypeScript Project References**（增量编译）

### 测试工具

- **Vitest**（单元测试，快速）
- **Playwright**（E2E 测试，现有）
- **@vscode/test-electron**（VS Code 集成测试，可选）

### 文档生成

- **TypeDoc**（从 TypeScript 生成 API 文档）
- **Markdown**（手写文档）

---

## 📚 参考资料

### 最佳实践参考

- TypeScript-ESLint Monorepo 架构
- Babel Monorepo 组织方式
- VS Code Extension 开发指南

### 相关文档

- [npm workspaces 文档](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Changesets 官方文档](https://github.com/changesets/changesets)
- [VS Code Extension API](https://code.visualstudio.com/api)

---

## 🎉 总结

本重构计划旨在将 Goose Code Review 从单体架构升级为模块化、可扩展的分析工具生态系统。通过抽离核心逻辑、采用适配器模式、建立 monorepo 架构，我们将实现：

✅ **80%+ 代码复用率**（Web、VS Code、CLI 共享核心代码）
✅ **10-30 倍测试速度提升**（核心逻辑毫秒级测试）
✅ **多端支持**（Web、VS Code 插件、CLI）
✅ **可扩展架构**（为未来分析工具建立基础）

**预计工作量**：4-6 周（包含 VS Code 插件开发）
**风险等级**：低（增量重构，保留现有功能）
**投资回报率**：高（一次投入，长期受益）

---

## 📝 更新日志

| 版本 | 日期       | 变更说明               |
| ---- | ---------- | ---------------------- |
| v1.0 | 2025-01-16 | 初始版本，完整重构计划 |

---

**准备好了吗？让我们开始这场激动人心的重构之旅！** 🚀
