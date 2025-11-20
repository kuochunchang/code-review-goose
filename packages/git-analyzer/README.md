# @code-review-goose/git-analyzer

Git change analysis with SonarQube and AI integration.

## Features

- **Git Operations**: Analyze working directory changes, branch comparisons, and pull requests
- **SonarQube Integration**: Hybrid mode (Server + CLI) for static code analysis
- **AI-Powered Analysis**: Deep semantic analysis using OpenAI/Gemini providers
- **Merged Results**: Combine SonarQube and AI insights for comprehensive code review

## Usage

```typescript
import { GitService, ChangeAnalyzer } from '@code-review-goose/git-analyzer';

// Initialize services
const gitService = new GitService('/path/to/repo');
const analyzer = new ChangeAnalyzer(gitService, aiProvider);

// Analyze working directory changes
const result = await analyzer.analyzeWorkingDirectory({
  checkQuality: true,
  checkSecurity: true,
  checkPerformance: true,
});

console.log(result.summary);
console.log(result.issues);
```

## Architecture

- **GitService**: Git operations wrapper (using simple-git)
- **SonarQubeService**: SonarQube integration (hybrid mode)
- **ChangeAnalyzer**: Core analysis orchestrator
- **MergeService**: Merge SonarQube + AI results

## Installation

```bash
npm install @code-review-goose/git-analyzer
```

## License

MIT
