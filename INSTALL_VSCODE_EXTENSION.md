# VS Code 扩展安装指南

本指南将帮助您构建和安装 Goose Code Review VS Code 扩展。

## 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- VS Code >= 1.85.0

## 快速开始

### 方法 1: 使用构建脚本（推荐）

```bash
# 在项目根目录运行
./build-vscode-extension.sh
```

脚本会自动：
1. 清理之前的构建
2. 安装依赖
3. 按正确顺序构建所有依赖包
4. 构建 VS Code 扩展
5. 打包成 .vsix 文件

构建完成后，脚本会显示 .vsix 文件的位置。

### 方法 2: 手动构建

```bash
# 1. 安装依赖
npm install

# 2. 构建所有依赖包（按顺序）
npm run build -w @code-review-goose/analysis-types
npm run build -w @code-review-goose/analysis-utils
npm run build -w @code-review-goose/analysis-parser-common
npm run build -w @code-review-goose/analysis-parser-typescript
npm run build -w @code-review-goose/analysis-parser-java
npm run build -w @code-review-goose/analysis-parser-python
npm run build -w @code-review-goose/analysis-core
npm run build -w @code-review-goose/analysis-adapter-vscode
npm run build -w @code-review-goose/git-analyzer

# 3. 构建 VS Code 扩展
cd packages/vscode-extension
npm run build

# 4. 确保 LICENSE 文件存在
cp ../../LICENSE .

# 5. 打包扩展
npm run package
```

## 安装扩展

### 从 VSIX 文件安装

构建完成后，会在 `packages/vscode-extension/` 目录下生成 `.vsix` 文件。

#### 方法 1: 使用 VS Code UI

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 "Extensions: Install from VSIX..."
4. 选择生成的 `.vsix` 文件

#### 方法 2: 使用命令行

```bash
code --install-extension packages/vscode-extension/goose-code-review-vscode-*.vsix
```

## 验证安装

安装完成后：

1. 重启 VS Code
2. 打开一个 TypeScript、JavaScript、Java 或 Python 文件
3. 按 `Ctrl+Shift+A` (Windows/Linux) 或 `Cmd+Shift+A` (Mac) 打开分析面板
4. 或者在命令面板中搜索 "Goose Code Review"

## 故障排除

### 构建失败

如果构建失败，请检查：

1. **依赖问题**: 运行 `npm install` 确保所有依赖已安装
2. **TypeScript 错误**: 检查是否有类型错误，运行 `npm run lint` 检查代码
3. **模块找不到**: 确保所有依赖包都已正确构建

### 扩展无法加载

1. 检查 VS Code 版本是否 >= 1.85.0
2. 查看 VS Code 的开发者工具控制台（Help > Toggle Developer Tools）
3. 检查扩展的激活事件是否正确

### 打包失败

如果 `vsce package` 失败：

1. 确保 `LICENSE` 文件存在于 `packages/vscode-extension/` 目录
2. 检查 `package.json` 中的配置是否正确
3. 确保所有必需的文件都在 `.vscodeignore` 中没有被排除

## 开发模式

要在开发模式下运行扩展：

1. 在 VS Code 中打开项目
2. 按 `F5` 启动 Extension Development Host
3. 在新窗口中测试扩展功能

## 更新扩展

要更新已安装的扩展：

1. 重新构建并打包扩展
2. 使用 `--force` 标志安装新版本：

```bash
code --install-extension packages/vscode-extension/goose-code-review-vscode-*.vsix --force
```

## 卸载扩展

```bash
code --uninstall-extension kuochunchang.goose-code-review-vscode
```
