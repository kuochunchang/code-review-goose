# Dependency Navigation Demo

## Interactive Dependency Flow with Clickable Line Numbers

### Visual Example

Here's how the improved dependency visualization looks:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Dependency Flow                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐      ┌────────────────┐                    │
│  │ MyClass.init() │ :15  │ setupConfig()  │ :42                │
│  └────────────────┘  →   └────────────────┘                    │
│        ↑ clickable           ↑ clickable                        │
│                              initializes configuration           │
│                                                                  │
│  ┌─────────────────┐     ┌──────────────────┐                  │
│  │ setupConfig()   │ :42 │ ConfigMgr.load() │ :120             │
│  └─────────────────┘  →  └──────────────────┘                  │
│        ↑ clickable           ↑ clickable                        │
│                              loads config file                   │
│                                                                  │
│  ┌──────────────────┐    ┌────────────────┐                    │
│  │ ConfigMgr.load() │:120│ FileSystem.read│ :87                │
│  └──────────────────┘  → └────────────────┘                    │
│        ↑ clickable           ↑ clickable                        │
│                              reads configuration                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

#### 1. **Display Format**

Each dependency is shown as:
```
[Caller Method]:line → [Callee Method]:line - description
```

Example:
```
UserService.authenticate():25 → TokenManager.generateToken():156 - creates JWT token
```

#### 2. **Interactive Line Numbers**

The line numbers (`:25`, `:156`) are **clickable links** that:

- **On Click**: Jump to that line in the editor
- **On Hover**:
  - Change color to link color
  - Show underline
  - Display tooltip: "Jump to line X"
  - Background highlight appears

#### 3. **Visual Styling**

**Method Names:**
- Monospace font (Courier New)
- Background color matches editor background
- Subtle border radius for rounded corners

**Line Numbers:**
- Smaller font size (11px)
- Muted color by default
- Becomes prominent on hover
- Smooth transition animation (0.2s)

**Arrows:**
- VS Code focus border color
- Bold weight for visibility
- Separates caller from callee

**Descriptions:**
- Italic style
- Muted color
- Provides context for the call

### CSS Classes

```css
.dependency-method-wrapper {
  /* Wraps method name + line number together */
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dependency-line-number {
  /* Clickable line number styling */
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  transition: all 0.2s ease;
}

.dependency-line-number:hover {
  /* Hover state for better discoverability */
  color: var(--vscode-textLink-foreground);
  background-color: var(--vscode-list-hoverBackground);
  text-decoration: underline;
}
```

### Example Scenarios

#### Scenario 1: Authentication Flow

```
AuthController.login():15 → UserService.authenticate():42
  ↓ click :42
[Editor opens at line 42 of UserService.ts]

UserService.authenticate():42 → TokenManager.generateToken():156
  ↓ click :156
[Editor opens at line 156 of TokenManager.ts]

TokenManager.generateToken():156 → JWTHelper.sign():87
  ↓ click :87
[Editor opens at line 87 of JWTHelper.ts]
```

#### Scenario 2: Data Processing Pipeline

```
DataProcessor.process():10 → DataValidator.validate():55 - validates input
  ↓ click :55
[Jump to validation logic]

DataValidator.validate():55 → SchemaChecker.check():120 - checks schema
  ↓ click :120
[Jump to schema checking]

DataProcessor.process():10 → DataTransformer.transform():200 - transforms data
  ↓ click :200
[Jump to transformation logic]
```

### Benefits

✅ **Quick Navigation**: One click to jump to any method in the dependency chain

✅ **Context Preservation**: See the full call hierarchy before jumping

✅ **Visual Feedback**: Clear hover states show what's clickable

✅ **Efficient Debugging**: Follow execution flow through the codebase

✅ **Better Understanding**: Line numbers provide exact locations

### Comparison with Sequence Diagram

| Feature | Dependency List | Sequence Diagram |
|---------|----------------|------------------|
| **Readability** | ✅ High - Linear list | ⚠️ Medium - Visual complexity |
| **Navigation** | ✅ Clickable line numbers | ❌ No direct navigation |
| **Space Efficiency** | ✅ Compact | ⚠️ Requires scrolling |
| **Detail Level** | ✅ Shows descriptions | ⚠️ Limited text space |
| **Best For** | Quick scanning & navigation | Visual understanding of flow |

### Implementation Details

**Data Structure (TypeScript):**
```typescript
interface MethodDependency {
  caller: string;        // e.g., "MyClass.init()"
  callee: string;        // e.g., "MyClass.setupConfig()"
  callerLine?: number;   // e.g., 15
  calleeLine?: number;   // e.g., 42
  description?: string;  // e.g., "initializes configuration"
}
```

**HTML Generation:**
```html
<div class="dependency-item">
  <span class="dependency-method-wrapper">
    <span class="dependency-caller">MyClass.init()</span>
    <span class="dependency-line-number"
          data-action="jumpToLine"
          data-line="15"
          title="Jump to line 15">:15</span>
  </span>
  <span class="dependency-arrow codicon codicon-arrow-right"></span>
  <span class="dependency-method-wrapper">
    <span class="dependency-callee">MyClass.setupConfig()</span>
    <span class="dependency-line-number"
          data-action="jumpToLine"
          data-line="42"
          title="Jump to line 42">:42</span>
  </span>
  <span class="dependency-description">initializes configuration</span>
</div>
```

**Event Handling:**
```javascript
// Click handler already implemented in analysis-panel.ts
case 'jumpToLine':
  event.stopPropagation();
  const line = parseInt(target.dataset.line, 10);
  if (!isNaN(line)) {
    vscode.postMessage({ command: 'jumpToLine', line });
  }
  break;
```

### Future Enhancements

Possible improvements for future versions:

1. **Cross-file Navigation**: Show file name when callee is in different file
2. **Highlight Path**: Highlight the entire dependency chain on hover
3. **Copy Line Reference**: Right-click to copy line reference
4. **Expand/Collapse Groups**: Group related dependencies
5. **Filter by Method**: Show only dependencies involving specific method
6. **Export to Markdown**: Generate documentation from dependencies
7. **Visual Indicators**: Show whether method is async, recursive, etc.

### User Workflow

```
1. Open Analysis Panel for a file
   ↓
2. Click "Explain" tab
   ↓
3. Scroll to "Method Dependencies" section
   ↓
4. Review Dependency Flow list
   ↓
5. Click on any line number (e.g., :42)
   ↓
6. Editor jumps to that line
   ↓
7. Review code context
   ↓
8. Return to Analysis Panel
   ↓
9. Click next dependency line number
   ↓
10. Repeat to follow the entire call chain
```

### Accessibility

- **Keyboard Navigation**: Tab through line numbers, Enter to activate
- **Screen Readers**: Tooltip text provides context
- **High Contrast**: Uses VS Code theme colors for consistency
- **Focus Indicators**: Clear visual feedback for keyboard users
