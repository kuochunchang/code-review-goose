# Development Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Getting Started

1. Clone repo: `git clone https://github.com/kuochunchang/goose-sight.git`
2. Install: `npm install`
3. Build: `npm run build`
4. Dev mode: `npm run dev`

## Project Structure

Monorepo with npm workspaces:

- `packages/cli/`: CLI tool
- `packages/server/`: Express.js backend
- `packages/web/`: Vue.js frontend

## Development Workflow

1. Create feature branch
2. Make changes (follow code standards)
3. Test: `npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e`
4. Commit with conventional format
5. Push and create PR

## Common Commands

- `npm run dev`: Run CLI in dev mode
- `npm run build`: Build all packages
- `npm run clean`: Clean artifacts
- `npm run lint`: Lint code
- `npm run format`: Format code
- `npm run test`: Run tests
- `npm run test:e2e`: E2E tests

Package-specific: `cd packages/<name> && npm run dev/build`

## Debugging

- CLI: `npx tsx --inspect packages/cli/src/index.ts`
- Server: Add breakpoints, `npm run dev`
- Frontend: Browser DevTools
- E2E: `npm run test:e2e:ui` or `npm run test:e2e:debug`

## Code Standards

- TypeScript strict mode
- Prettier + ESLint
- Naming: kebab-case files, PascalCase classes, camelCase vars
- Vue: Composition API, TypeScript
- JSDoc comments

## Troubleshooting

- Build errors: `npm run clean && npm install && npm run build`
- Port conflicts: Auto-detected
- E2E failures: Check server, ports, debug mode
- Performance: Clear Vite cache
- Git: Rebase for conflicts

## Best Practices

- Run checks before commit: build, lint, test
- Code review checklist: conventions, types, tests, docs
- Security: No secrets, validate inputs, update deps
