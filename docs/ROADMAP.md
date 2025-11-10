# Roadmap

---

## Current Status

- **Local web-based code review** with AI-powered analysis
- **UML diagram generation** for classes and flowcharts
- **Review history** with search and filtering
- **Multi-language support** with syntax highlighting
- **Export capabilities** to Markdown and HTML

**Current Limitation**: Files are analyzed in isolation without understanding dependencies or architectural context.

---

## Next Phases

### 1. More AI Providers

**Goal**: Support multiple AI providers.

- **Claude** (Anthropic) - Advanced reasoning
- **Gemini** (Google) - Cost-effective alternative
- **Ollama** (Local) - Privacy-first, zero API costs
- Easy switching between providers
- Side-by-side comparison

---

### 2. Context-Aware Analysis

**Goal**: Enable analysis that understands file relationships and architectural roles.

#### Key Features

**1. Dependency Analysis**
- Automatically detect what files depend on each other
- Understand import/export relationships across languages
- Show reverse dependencies (who uses this file)
- Works with JS/TS, Python, Go, Java, Ruby, and more

**2. SonarQube Integration** (Optional)
- Leverage enterprise-grade static analysis
- Merge SonarQube findings with AI insights
- Support both self-hosted and cloud versions
- AI focuses on architecture, SonarQube on syntax

**3. Semantic Code Search**
- Find files with similar functionality
- Discover hidden relationships
- Suggest related code for review
- Powered by embeddings

**4. Code Explan**
- AI-powered code explanations
- Step-by-step code breakdowns
- Best practices and design pattern identification
- Learning mode for complex code understanding
- Context-aware documentation generation

---

### 3. CI/CD Integration

**Goal**: Integrate with development workflow.

- GitHub Actions, GitLab CI, Jenkins support
- Automatic PR/MR comments
- Quality gates to block merges
- Headless CLI mode
- Configurable thresholds

---

## Future Direction

- Advanced Analytics: Code quality trends, technical debt, and team metrics
- Dashboard: Project overview, metrics dashboard, and review management
- IDE Extensions: VS Code and JetBrains plugins

