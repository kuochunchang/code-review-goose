# Development Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- VS Code (for extension development)

## Getting Started

1. Clone repo: `git clone https://github.com/kuochunchang/code-review-goose.git`
2. Install: `npm install`
3. Build: `npm run build`
4. Open in VS Code: `code .`
5. Press F5 to launch Extension Development Host

## Project Structure

Monorepo with npm workspaces:

- `packages/analysis-types/`: Type definitions
- `packages/analysis-utils/`: Shared utilities
- `packages/analysis-core/`: Platform-agnostic analysis engine
- `packages/analysis-adapter-node/`: Node.js file system adapter
- `packages/analysis-adapter-vscode/`: VS Code file system adapter
- `packages/analysis-parser-common/`: Common parser utilities
- `packages/analysis-parser-typescript/`: TypeScript/JavaScript parser
- `packages/analysis-parser-java/`: Java parser
- `packages/analysis-parser-python/`: Python parser
- `packages/git-analyzer/`: Git change analysis and SonarQube integration
- `packages/vscode-extension/`: VS Code Extension (main application)

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes (follow code standards)
3. Build: `npm run build`
4. Test in VS Code: Press F5 to launch Extension Development Host
5. Run tests: `npm run test`
6. Lint: `npm run lint`
7. Commit with conventional format: `git commit -m "feat: add new feature"`
8. Push and create PR

## Common Commands

- `npm run build`: Build all packages
- `npm run build:packages`: Build core packages only
- `npm run clean`: Clean artifacts
- `npm run lint`: Lint code
- `npm run format`: Format code
- `npm run test`: Run tests
- `npm run test:coverage`: Test coverage

Package-specific: `cd packages/<name> && npm run build/test`

## Debugging

- **Extension**: Press F5 in VS Code to launch Extension Development Host
- **Core packages**: Add breakpoints in TypeScript files, run tests with debugger
- **Git analyzer**: Use `npm run test:sonarqube` for SonarQube integration testing

## Code Standards

- TypeScript strict mode
- Prettier + ESLint
- Naming: kebab-case files, PascalCase classes, camelCase vars
- JSDoc comments for public APIs
- Follow VS Code Extension API best practices

## Troubleshooting

- Build errors: `npm run clean && npm install && npm run build`
- Extension not loading: Check activation events in package.json
- Tests failing: Ensure all dependencies are installed
- Type errors: Run `npm run build` to check TypeScript compilation

## Best Practices

- Run checks before commit: build, lint, test
- Code review checklist: conventions, types, tests, docs
- Security: No secrets in code, use VS Code Secret Storage for API keys
- Performance: Minimize extension activation time, dispose resources properly
