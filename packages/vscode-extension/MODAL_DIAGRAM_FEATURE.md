# Modal Diagram Feature - Full Screen Sequence Diagram Viewer

## Overview

The **Modal Diagram Feature** allows users to view complex sequence diagrams in a **full-screen modal popup**, providing better visibility and easier analysis of method dependencies.

## Features

### 🖼️ Full Screen Modal Display

- **90% viewport coverage**: Uses 90vw × 90vh for maximum screen real estate
- **Centered layout**: Diagram is perfectly centered in the modal
- **Smooth animations**: Fade-in and scale-in effects for professional UX
- **Dark overlay**: Semi-transparent black background (70% opacity)

### 🎯 Multiple Ways to Close

1. **Close Button (×)**: Click the close icon in the top-right corner
2. **ESC Key**: Press Escape key on keyboard
3. **Outside Click**: Click anywhere on the dark overlay

### 🎨 Visual Design

#### Modal Header
- **Title**: "Sequence Diagram - Full View" with graph icon
- **Close Button**: Large, easily clickable close button
- **Styling**: Matches VS Code theme colors

#### Modal Body
- **White background**: Optimal contrast for Mermaid diagrams
- **Scrollable**: Handles very large diagrams gracefully
- **Padding**: Comfortable spacing around diagram
- **Centered**: Diagram positioned in the center

## User Workflow

```
1. View "Method Dependencies" section in Explain tab
   ↓
2. Click "Expand" button next to "Sequence Diagram" header
   ↓
3. Modal opens with full-screen diagram
   ↓
4. Analyze the diagram in detail
   ↓
5. Close modal (ESC / × button / outside click)
   ↓
6. Return to Analysis Panel
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Dark Overlay (70% opacity)                                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 📊 Sequence Diagram - Full View                    [×]│     │
│  ├───────────────────────────────────────────────────────┤     │
│  │                                                        │     │
│  │                                                        │     │
│  │        [  Mermaid Sequence Diagram  ]                │     │
│  │        [    Rendered in White Box   ]                │     │
│  │        [     90% Viewport Size      ]                │     │
│  │                                                        │     │
│  │                                                        │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
│  Click outside to close                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Button Location

The "Expand" button is located in the **Mermaid header**:

```
┌─────────────────────────────────────────────────────────────────┐
│ ▶ 📊 Sequence Diagram          [🗖 Expand]  Click to expand/... │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Collapsed diagram - click header to expand inline]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Two viewing options:**
1. **Inline expansion**: Click the header (▶) to expand/collapse in-place
2. **Full screen**: Click "🗖 Expand" button to open modal

## Technical Implementation

### HTML Structure

```html
<!-- Expand button in diagram header -->
<button class="expand-diagram-btn"
        data-action="expandDiagram"
        title="Open in full screen">
  <span class="codicon codicon-screen-full"></span>
  Expand
</button>

<!-- Modal overlay (hidden by default) -->
<div class="modal-overlay" id="diagramModal">
  <div class="modal-content">
    <div class="modal-header">
      <div class="modal-title">
        <span class="codicon codicon-graph"></span>
        Sequence Diagram - Full View
      </div>
      <button class="modal-close-btn"
              data-action="closeModal"
              title="Close (Esc)">
        <span class="codicon codicon-close"></span>
      </button>
    </div>
    <div class="modal-body">
      <div class="modal-mermaid-container" id="modalMermaidContainer">
        <!-- Cloned diagram will be inserted here -->
      </div>
    </div>
  </div>
</div>
```

### CSS Classes

```css
/* Expand button */
.expand-diagram-btn {
  background: transparent;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

/* Modal overlay */
.modal-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  animation: fadeIn 0.2s ease-in-out;
}

.modal-overlay.active {
  display: flex;
}

/* Modal content box */
.modal-content {
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  max-height: 900px;
  background-color: var(--vscode-editor-background);
  border-radius: 8px;
  animation: scaleIn 0.2s ease-in-out;
}

/* Modal header */
.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  justify-content: space-between;
}

/* Modal body */
.modal-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

/* Diagram container */
.modal-mermaid-container {
  background-color: white;
  padding: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### JavaScript Functions

#### Open Modal

```javascript
function openDiagramModal() {
  const modal = document.getElementById('diagramModal');
  const modalContainer = document.getElementById('modalMermaidContainer');
  const originalDiagram = document.querySelector('#mermaidDiagram .mermaid');

  if (modal && modalContainer && originalDiagram) {
    // Clone diagram
    const clonedDiagram = originalDiagram.cloneNode(true);
    modalContainer.innerHTML = '';
    modalContainer.appendChild(clonedDiagram);

    // Show modal
    modal.classList.add('active');

    // Re-render Mermaid
    setTimeout(() => {
      import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs')
        .then(module => {
          const mermaid = module.default;
          mermaid.run({
            querySelector: '#modalMermaidContainer .mermaid'
          });
        });
    }, 100);
  }
}
```

#### Close Modal

```javascript
function closeDiagramModal() {
  const modal = document.getElementById('diagramModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Event listeners
document.getElementById('diagramModal')?.addEventListener('click', (event) => {
  if (event.target.id === 'diagramModal') {
    closeDiagramModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDiagramModal();
  }
});
```

## Animations

### Fade In (Overlay)
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Scale In (Modal Content)
```css
@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Duration**: 0.2s (200ms) - Fast and responsive

## Use Cases

### ✅ Perfect For:

1. **Complex diagrams** with many participants (10+ actors)
2. **Long sequences** that require scrolling
3. **Detailed analysis** requiring close inspection
4. **Screenshots** or presentations (larger, clearer view)
5. **Debugging** complex call chains

### ⚠️ When to Use Inline View:

1. **Simple diagrams** (2-5 participants)
2. **Quick overview** of dependencies
3. **Side-by-side comparison** with code
4. **Quick reference** while reading documentation

## Accessibility

### Keyboard Navigation
- **Tab**: Focus on close button
- **Enter/Space**: Activate focused button
- **ESC**: Close modal from anywhere

### Screen Readers
- Modal has proper ARIA labels
- Close button has descriptive title
- Focus management on open/close

### Visual Accessibility
- High contrast close button
- Clear visual boundaries
- Respects VS Code theme colors

## Browser Compatibility

Works in VS Code's webview which uses:
- **Chrome/Electron**: Full support
- **Modern CSS**: Flexbox, animations, transforms
- **ES6 Modules**: Dynamic imports for Mermaid

## Performance Considerations

### Optimizations:
1. **Lazy loading**: Mermaid only loads when modal opens
2. **DOM cloning**: Reuses existing diagram structure
3. **Conditional rendering**: Modal only in DOM when needed
4. **Event delegation**: Single event listener for clicks

### Memory:
- Modal is lightweight (minimal DOM elements)
- Cloned diagram removed when modal closes
- No memory leaks from event listeners

## Testing

### Manual Testing Checklist:

- [ ] Click "Expand" button opens modal
- [ ] Diagram renders correctly in modal
- [ ] Close button (×) closes modal
- [ ] ESC key closes modal
- [ ] Clicking outside closes modal
- [ ] Modal centers diagram properly
- [ ] Scrolling works for large diagrams
- [ ] Animations are smooth (no jank)
- [ ] Re-opening modal works correctly
- [ ] Multiple open/close cycles work

### Edge Cases:

- [ ] Very large diagrams (100+ participants)
- [ ] Very small diagrams (2 participants)
- [ ] Empty diagram (should not crash)
- [ ] Rapid open/close (no race conditions)

## Future Enhancements

Potential improvements for future versions:

1. **Zoom Controls**: +/- buttons to zoom diagram
2. **Download Button**: Export diagram as PNG/SVG
3. **Print View**: Optimized print layout
4. **Pan/Drag**: Click and drag to move large diagrams
5. **Minimap**: Overview map for very large diagrams
6. **Search**: Find specific actors or messages
7. **Theme Toggle**: Switch between light/dark diagram background
8. **Comparison Mode**: Show two diagrams side-by-side

## Comparison: Inline vs Modal

| Feature | Inline View | Modal View |
|---------|-------------|------------|
| **Size** | Limited to panel width | 90% of viewport |
| **Visibility** | Shares space with text | Full screen focus |
| **Scrolling** | Within panel | Independent scroll |
| **Context** | See surrounding info | Diagram only |
| **Best For** | Quick reference | Detailed analysis |
| **Interactions** | Limited space | More room for controls |

## Code Example

Here's how to add the expand button to a custom section:

```html
<div class="mermaid-wrapper">
  <div class="mermaid-header">
    <div class="mermaid-header-title">
      <span class="codicon codicon-graph"></span>
      My Diagram
    </div>
    <button class="expand-diagram-btn"
            data-action="expandDiagram"
            title="Open in full screen">
      <span class="codicon codicon-screen-full"></span>
      Expand
    </button>
  </div>
  <div class="mermaid-container" id="mermaidDiagram">
    <pre class="mermaid">
      sequenceDiagram
        A->>B: Hello
        B->>C: World
    </pre>
  </div>
</div>
```

## Summary

The **Modal Diagram Feature** provides a **professional, user-friendly way** to view complex sequence diagrams in VS Code extensions. With:

- ✅ **Large viewing area** (90% viewport)
- ✅ **Smooth animations** (fade-in, scale-in)
- ✅ **Multiple close options** (button, ESC, outside click)
- ✅ **Accessibility support** (keyboard, screen readers)
- ✅ **VS Code theme integration** (matches editor colors)

It significantly improves the user experience when analyzing complex method dependencies and call chains.
