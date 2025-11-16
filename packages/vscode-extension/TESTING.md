# VS Code Extension Testing Guide

## Overview

This guide covers how to test the Goose Code Review VS Code extension.

## Test Types

### 1. Unit Tests (Vitest)

Unit tests verify individual functions and components in isolation.

#### Run Unit Tests

```bash
# From project root
cd packages/vscode-extension
npm test

# With coverage
npm run test:coverage

# Watch mode
npx vitest
```

#### Test Structure

Tests are located in `src/__tests__/`:
- `extension.test.ts` - Extension activation/deactivation tests
- `utils.test.ts` - Utility function tests

#### Writing Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### 2. Integration Tests (VS Code Extension Host)

Integration tests run the extension in a real VS Code environment.

#### Run Extension in Development

1. **Using VS Code Debugger**:
   - Open the project in VS Code
   - Press `F5` or click "Run > Start Debugging"
   - Select "Run Extension" from the dropdown
   - A new VS Code window will open with the extension loaded

2. **Using Command Palette**:
   - In the Extension Development Host window:
   - Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
   - Type "Goose Code Review"
   - Test the commands:
     - Generate Class Diagram
     - Generate Sequence Diagram
     - Generate Flowchart

3. **Using Watch Mode**:
   - Select "Watch Extension" from the Run and Debug dropdown
   - Changes will automatically trigger rebuild

#### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] All commands appear in Command Palette
- [ ] Context menu shows commands for TS/JS files
- [ ] Class diagram generation works
- [ ] Sequence diagram generation works
- [ ] Flowchart generation works
- [ ] Webview displays diagrams correctly
- [ ] Settings are respected
- [ ] Error messages are displayed properly

### 3. Package Testing

Test the packaged extension before publishing.

#### Build VSIX Package

```bash
cd packages/vscode-extension
npm run package
```

This creates a `.vsix` file in the package directory.

#### Install VSIX Locally

1. In VS Code, press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. Type "Extensions: Install from VSIX..."
3. Select the generated `.vsix` file
4. Reload VS Code
5. Test all features

#### Uninstall Test Extension

1. Press `Ctrl+Shift+X` (Mac: `Cmd+Shift+X`)
2. Find "Goose Code Review"
3. Click the gear icon > Uninstall

## Debugging

### Debug Extension Code

1. Set breakpoints in your TypeScript code
2. Press `F5` to start debugging
3. Breakpoints will be hit in the Extension Development Host

### View Extension Logs

- **Output Panel**: View > Output, select "Goose Code Review"
- **Developer Tools**: Help > Toggle Developer Tools (in Extension Development Host)
- **Console Logs**: Check the Debug Console in the main VS Code window

### Common Debug Commands

```typescript
// In your extension code
console.log('Debug info:', data);
console.error('Error:', error);

// Show messages to user
vscode.window.showInformationMessage('Info message');
vscode.window.showErrorMessage('Error message');
```

## Continuous Integration

Tests run automatically on push/PR via GitHub Actions (if configured).

### Run All Tests Locally

```bash
# From project root
npm run build
npm test
```

## Test Coverage

View coverage reports:

```bash
cd packages/vscode-extension
npm run test:coverage
```

Coverage reports are generated in `coverage/`:
- `coverage/index.html` - HTML report (open in browser)
- `coverage/coverage-final.json` - JSON data
- `coverage/clover.xml` - Clover format

## Troubleshooting

### Extension Not Loading

- Check the Output panel for errors
- Ensure dependencies are installed: `npm install`
- Rebuild: `npm run build`

### Tests Failing

- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npx tsc --noEmit`
- Verify VS Code version compatibility

### Breakpoints Not Working

- Ensure source maps are enabled in `tsconfig.json`
- Check that `outFiles` in `launch.json` matches your build output
- Try rebuilding: `npm run clean && npm run build`

### Performance Issues

- Close unused Extension Development Host windows
- Disable other extensions in the test environment
- Reduce analysis depth in settings

## Best Practices

1. **Write tests first** - TDD approach helps catch bugs early
2. **Test edge cases** - Empty files, large files, syntax errors
3. **Mock dependencies** - Use Vitest mocks for external dependencies
4. **Keep tests fast** - Unit tests should run in milliseconds
5. **Clean state** - Each test should be independent
6. **Document tests** - Explain what each test verifies

## Resources

- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Vitest Documentation](https://vitest.dev/)
- [VS Code API Reference](https://code.visualstudio.com/api/references/vscode-api)

## Test Matrix

| Feature | Unit Test | Integration Test | Manual Test |
|---------|-----------|------------------|-------------|
| Extension Activation | ✅ | ✅ | ✅ |
| Command Registration | ✅ | ✅ | ✅ |
| Class Diagram | 🔄 | ✅ | ✅ |
| Sequence Diagram | 🔄 | ✅ | ✅ |
| Flowchart | 🔄 | ✅ | ✅ |
| Settings | 🔄 | ✅ | ✅ |
| Error Handling | 🔄 | ✅ | ✅ |

Legend:
- ✅ Implemented
- 🔄 Planned
- ❌ Not applicable
