# SonarQube Token 设置指南

## 📋 概述

Goose Code Review Extension 使用 **VS Code Secret Storage** 安全存储 SonarQube token，确保敏感信息不会被泄露。

## 🔐 方法一：通过命令设置（推荐）

### 步骤 1: 生成 SonarQube Token

#### 对于 SonarQube Server（本地或自托管）

1. 登录 SonarQube 服务器
2. 点击右上角用户头像 → **My Account** → **Security**
3. 在 **Generate Tokens** 部分：
   - 输入 Token 名称（例如：`vscode-goose-review`）
   - 点击 **Generate**
   - **立即复制 Token**（关闭页面后将无法再次查看）

#### 对于 SonarCloud

1. 登录 [SonarCloud](https://sonarcloud.io)
2. 点击右上角用户头像 → **My Account** → **Security**
3. 在 **Generate Tokens** 部分：
   - 输入 Token 名称（例如：`vscode-goose-review`）
   - 点击 **Generate**
   - **立即复制 Token**

### 步骤 2: 在 VS Code 中添加连接

1. 打开 VS Code
2. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) 打开命令面板
3. 输入并选择：**`Goose Code Review: Add SonarQube Connection`**
4. 按提示输入：
   - **Connection ID**: 输入唯一标识符（例如：`local-sonarqube` 或 `sonarcloud`）
   - **Server URL**: 
     - SonarQube Server: `http://localhost:9000` 或你的服务器地址
     - SonarCloud: `https://sonarcloud.io`
   - **Organization Key** (仅 SonarCloud): 输入组织标识
   - **Token**: 粘贴刚才生成的 token（输入框会隐藏显示，这是正常的）

5. Token 会自动安全存储到 VS Code Secret Storage

### 步骤 3: 绑定项目

1. 命令面板 → **`Goose Code Review: Bind to SonarQube Project`**
2. 选择刚才创建的连接
3. 输入 **Project Key**（SonarQube 项目唯一标识）

### 步骤 4: 测试连接

1. 命令面板 → **`Goose Code Review: Test SonarQube Connection`**
2. 查看连接测试结果

---

## 🔧 方法二：手动更新 Token

如果 token 过期或需要更新：

### 方式 A: 通过命令重新添加连接

1. 删除旧连接（需要手动编辑 settings.json，见下方）
2. 使用 **Add SonarQube Connection** 命令重新添加

### 方式 B: 通过代码更新（高级用户）

Token 存储在 VS Code Secret Storage 中，可以通过以下方式更新：

```typescript
// 在 VS Code Extension 开发模式下
const secretKey = 'sonarqube.token.your-connection-id';
await vscode.context.secrets.store(secretKey, 'your-new-token');
```

---

## 📝 配置文件说明

### VS Code Settings (`settings.json`)

连接配置存储在用户设置中：

```json
{
  "gooseCodeReview.sonarqube.connections": [
    {
      "connectionId": "local-sonarqube",
      "serverUrl": "http://localhost:9000",
      "organizationKey": "",  // 仅 SonarCloud 需要
      "disableTelemetry": false
    }
  ],
  "gooseCodeReview.sonarqube.projectBinding": {
    "connectionId": "local-sonarqube",
    "projectKey": "my-project-key",
    "projectName": "My Project"
  }
}
```

**注意**: Token **不会**出现在 settings.json 中，它安全存储在 Secret Storage。

### Secret Storage 位置

Token 存储在 VS Code 的加密存储中：
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/goose-code-review-vscode.secrets`
- **Windows**: `%APPDATA%\Code\User\globalStorage\goose-code-review-vscode.secrets`
- **Linux**: `~/.config/Code/User/globalStorage/goose-code-review-vscode.secrets`

---

## 🔍 验证 Token 设置

### 检查 Token 是否存在

1. 打开命令面板
2. 运行：**`Goose Code Review: Test SonarQube Connection`**
3. 如果显示 "Token not found"，说明需要重新设置

### 查看连接配置

在 VS Code Settings 中搜索 `gooseCodeReview.sonarqube` 可以查看连接配置（但不包含 token）。

---

## 🛠️ 故障排除

### Token 无效或过期

**症状**: 连接测试失败，显示认证错误

**解决方法**:
1. 在 SonarQube 生成新 token
2. 删除旧连接（编辑 settings.json 移除 connection）
3. 使用命令重新添加连接

### Token 丢失

**症状**: "Token not found" 错误

**解决方法**:
1. 使用 **Add SonarQube Connection** 命令重新设置
2. 确保使用相同的 `connectionId`

### 无法访问 Secret Storage

**症状**: 存储 token 时出错

**解决方法**:
1. 检查 VS Code 是否有写入权限
2. 重启 VS Code
3. 检查磁盘空间

---

## 🔒 安全最佳实践

1. ✅ **使用命令设置** - Token 会自动安全存储
2. ✅ **定期轮换 Token** - 建议每 90 天更新一次
3. ✅ **不要提交 settings.json** - Token 不会出现在配置文件中
4. ✅ **使用最小权限 Token** - 只授予必要的权限
5. ✅ **团队共享配置** - 使用 `.vscode/settings.json` 共享连接配置（不含 token），每个开发者单独设置 token

---

## 📚 相关命令

- `Goose Code Review: Add SonarQube Connection` - 添加新连接
- `Goose Code Review: Bind to SonarQube Project` - 绑定项目
- `Goose Code Review: Test SonarQube Connection` - 测试连接

---

## 💡 提示

- Token 输入框使用密码模式（隐藏显示），这是正常的安全行为
- 如果连接失败，检查：
  - Server URL 是否正确
  - Token 是否有效
  - 网络连接是否正常
  - SonarQube 服务器是否可访问

---

**最后更新**: 2025-01-20

