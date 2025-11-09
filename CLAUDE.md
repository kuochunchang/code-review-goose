# Goose Code Review

## Project Overview

**Goose Code Review** is a local AI-assisted code review tool with a web-based interface. It's a CLI tool that starts a local server and opens a browser interface for analyzing code with AI-powered insights and UML visualization.

- **Type**: npm-published CLI tool with monorepo structure
- **Purpose**: Local code review and analysis with AI assistance (read-only, no code editing)
- **Tech Stack**: TypeScript, Node.js, Express, Vue 3, Vuetify, Monaco Editor
- **AI Integration**: OpenAI API for code analysis and review
- **UML Generation**: Mermaid.js for visualizing class diagrams and flowcharts

## Architecture

### Monorepo Structure (npm workspaces)

```
packages/
├── cli/          # Entry point CLI tool (published to npm as @kuochunchang/goose-code-review)
├── server/       # Express.js backend API
└── web/          # Vue 3 + Vuetify frontend
```

### Key Components

- **CLI Package**: Launches server, auto-opens browser, handles port detection
- **Server Package**: REST API for file operations, AI analysis, UML generation, config management
- **Web Package**: SPA with Monaco Editor, Mermaid diagrams, Vuetify UI components

## Common Commands

### Development

```bash
npm run dev                  # Run CLI in dev mode with tsx
npm run build               # Build all packages (server → web → cli)
npm run clean               # Clean all build artifacts
```

### Testing

```bash
npm run test                # Run all unit tests (Vitest)
npm run test:e2e            # Run Playwright E2E tests
npm run test:e2e:ui         # Run E2E tests with Playwright UI
npm run test:e2e:debug      # Debug E2E tests
npm test:coverage           # Generate test coverage report
```

### Linting & Formatting

```bash
npm run lint                # ESLint check
npm run format              # Prettier format all files
```

### Package-specific

```bash
cd packages/cli && npm run dev              # Run CLI in dev mode
cd packages/server && npm run dev           # Server with hot reload
cd packages/web && npm run dev              # Vite dev server with HMR
```

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- Use ES modules (`import/export`), not CommonJS (`require`)
- Destructure imports when possible: `import { foo } from 'bar'`
- Prefer explicit types over `any`, use `unknown` when type is truly unknown
- Use modern ES2022+ features (target: ES2022)

### File Naming

- Use kebab-case for files: `ai-service.ts`, `file-analysis.spec.ts`
- Use PascalCase for classes and components: `AIService`, `FileViewer.vue`
- Use camelCase for variables and functions: `generateUML`, `fileContent`

### Vue 3 Guidelines

- **Composition API only** (no Options API)
- Use TypeScript with `<script setup lang="ts">`
- Import types with `import type { ... }`
- Use Pinia for state management
- Follow Vuetify 3 component conventions

### Comments & Documentation

- Add JSDoc comments for public APIs and exported functions
- Explain "why" not "what" in comments
- Document complex algorithms or non-obvious logic

## Project-Specific Patterns

### Service Layer Architecture

Server uses service-based architecture:

- `aiService.ts` - OpenAI API integration
- `umlService.ts` - Mermaid UML generation
- `fileService.ts` - File system operations
- `projectService.ts` - Project scanning and analysis
- `configService.ts` - Configuration management
- `reviewService.ts` - Code review logic
- `searchService.ts` - Code search functionality

### API Routes

All routes under `packages/server/src/routes/`:

- `/api/config` - Configuration CRUD
- `/api/files` - File operations and content retrieval
- `/api/project` - Project scanning and structure
- `/api/analysis` - AI-powered code analysis
- `/api/review` - Code review generation
- `/api/uml` - UML diagram generation
- `/api/search` - Code search

### Frontend Structure

- **Views**: Main page components in `packages/web/src/views/`
- **Components**: Reusable components in `packages/web/src/components/`
- **Stores**: Pinia stores in `packages/web/src/stores/`
- **Composables**: Vue composables in `packages/web/src/composables/`
- **Services**: API client services in `packages/web/src/services/`

## Testing Strategy

### Unit Tests (Vitest)

- Server: Mock file system (`fs-extra`), OpenAI API
- Test files: `__tests__/*.test.ts` or `*.spec.ts`
- Coverage: Generate with `npm run test:coverage`

### E2E Tests (Playwright)

- Located in `packages/web/e2e/`
- Test scenarios: smoke tests, file analysis, review workflow, UML generation
- Run single test: `npm run test:e2e -- simple-load.spec.ts`
- Debug mode: `npm run test:e2e:debug` for interactive debugging

### Testing Best Practices

- Prefer running single tests during development for performance
- Always run full test suite before committing
- Check E2E tests if changing API endpoints or frontend behavior
- Use `npm run test:coverage` to ensure adequate coverage

## Build & Deploy

### Build Order (IMPORTANT)

Must build in this specific order due to dependencies:

1. `npm run build -w @code-review-goose/server` (builds server)
2. `npm run build -w @code-review-goose/web` (builds web UI)
3. `npm run build -w @kuochunchang/goose-code-review` (builds CLI, copies server-dist & web-dist)

Or simply: `npm run build` (handles order automatically)

### Publishing

- Published package: `@kuochunchang/goose-code-review` (CLI package)
- Includes: `dist/`, `server-dist/`, `web-dist/`
- `prepublishOnly` script ensures build before publish
- Binary commands: `goose` and `goose-code-review`

## Configuration

### AI Provider Setup

- Config stored in `.code-review/config.json` in target project directory
- Default provider: OpenAI (GPT-4)
- Required: `apiKey` for OpenAI
- Optional: `model`, `ignorePatterns`, `maxFileSize`

### Ignored Patterns

Default ignore patterns:

- `node_modules`, `.git`, `dist`, `build`, `coverage`
- `*.log`, `.DS_Store`, `.env*`
- User-configurable via `ignorePatterns` in config

## Important Behaviors & Warnings

### Port Detection

- CLI auto-detects available ports starting from 3000
- Server uses `detect-port` to avoid conflicts
- Frontend dev mode uses Vite default (5173)

### Browser Auto-Open

- CLI automatically opens default browser unless `--no-open` flag
- Use `--port` or `-p` to specify custom port

### File Size Limits

- Default max file size: 5MB (configurable)
- Large files skipped to prevent memory issues

### Security Considerations

- API key stored locally in `.code-review/config.json`
- Never commit `.code-review/` directory to git (in .gitignore)
- CORS enabled for local development only
- No authentication/authorization (designed for local use only)

## Workflow Guidelines

### Making Changes

1. **Explore first**: Read relevant files before coding
2. **Plan**: Think through the approach, especially for complex features
3. **Code**: Implement with proper TypeScript types
4. **Test**: Run relevant tests (`npm test`, `npm run test:e2e`)
5. **Verify**: Check build (`npm run build`), lint (`npm run lint`), typecheck (automatically done in build)
6. **Commit**: Use conventional commit format

### ⚠️ CRITICAL: Testing Requirements

**YOU MUST follow these rules before pushing any code:**

- ✅ **New features MUST have complete test coverage**
  - Unit tests for all new service functions
  - E2E tests for all user-facing features
  - Test both success and error scenarios
- ✅ **Modified features MUST have updated tests**
  - Update existing tests to reflect changes
  - Add new test cases for new behavior
  - Ensure no regression in existing functionality
- ✅ **All tests AND lint checks MUST pass before pushing**
  - Run `npm test` - all unit tests must pass
  - Run `npm run test:e2e` - all E2E tests must pass
  - Run `npm run lint` - ZERO linting errors allowed
  - Run `npm run build` - build must succeed without errors
- ❌ **DO NOT push code if ANY test OR lint check fails**
- ❌ **DO NOT skip writing tests to save time**
- ❌ **DO NOT commit code without running the full test suite**
- ❌ **DO NOT ignore linting errors - fix them before committing**

**Pre-commit checklist (run in this order):**

1. `npm run lint` - Fix all ESLint and Prettier errors
2. `npm test` - Ensure all unit tests pass
3. `npm run build` - Verify build succeeds
4. `npm run test:e2e` - Run E2E tests for user-facing changes
5. Only then commit and push

**Test coverage expectations:**

- Services: Minimum 80% coverage for business logic
- API routes: Test all endpoints (success + error cases)
- Vue components: Test user interactions and state changes
- E2E: Cover critical user workflows end-to-end

### Common Development Tasks

**Adding a new API endpoint**:

1. Define route in `packages/server/src/routes/`
2. Implement service logic in `packages/server/src/services/`
3. Add types in `packages/server/src/types/`
4. Create unit tests in `__tests__/`
5. Update frontend service in `packages/web/src/services/`
6. Add E2E test if user-facing

**Adding a new Vue component**:

1. Create in `packages/web/src/components/`
2. Use Composition API with `<script setup lang="ts">`
3. Import Vuetify components as needed
4. Add props/emits with TypeScript types
5. Write unit tests with `@vue/test-utils`

**Debugging issues**:

- Server errors: Check terminal logs, add `console.error` in services
- Frontend errors: Check browser console and Network tab
- Build errors: Run `npm run clean && npm install && npm run build`
- E2E failures: Use `npm run test:e2e:ui` or `npm run test:e2e:debug`

### Git Conventions

- Branch naming: `feature/description`, `fix/description`, `docs/description`
- Commit messages: Conventional format (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- Before PR: Ensure all tests pass, code is formatted, build succeeds

## Dependencies to Remember

### Server Key Dependencies

- `express` - Web framework
- `openai` - OpenAI API client
- `@babel/parser`, `@babel/traverse` - JavaScript/TypeScript AST parsing for UML
- `fs-extra` - Enhanced file system operations
- `ignore` - `.gitignore`-style pattern matching

### Web Key Dependencies

- `vue` (3.x) - Framework
- `vuetify` (3.x) - Material Design UI library
- `monaco-editor` - VS Code editor component
- `mermaid` - UML diagram rendering
- `marked` - Markdown rendering
- `axios` - HTTP client
- `pinia` - State management
- `splitpanes` - Resizable split panes

### CLI Key Dependencies

- `commander` - CLI framework
- `detect-port` - Port availability checking
- `open` - Cross-platform browser opening
- `chalk` - Terminal colors

## Troubleshooting Tips

### Build issues

- Clean and reinstall: `npm run clean && npm install && npm run build`
- Check build order if individual package builds fail
- Ensure TypeScript compilation succeeds before debugging further

### Runtime issues

- Port conflicts: CLI handles automatically, but check if port is explicitly specified
- API key errors: Verify `.code-review/config.json` exists with valid OpenAI key
- File not found: Check ignore patterns and file size limits

### Test failures

- E2E tests may fail if server not running: E2E tests start own server
- Timeout issues: Increase timeout in playwright.config.ts
- Flaky tests: Run with `--repeat-each=3` to identify intermittent failures

## Additional Resources

- Development guide: `docs/DEVELOPMENT.md`
- GitHub repo: https://github.com/kuochunchang/code-review-goose
- OpenAI API docs: https://platform.openai.com/docs
- Mermaid syntax: https://mermaid.js.org/
- Vuetify docs: https://vuetifyjs.com/
- Monaco Editor API: https://microsoft.github.io/monaco-editor/